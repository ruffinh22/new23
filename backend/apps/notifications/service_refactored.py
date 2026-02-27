"""
Service de notifications - Optimisé pour temps réel sans blocage.
"""

from django.db import transaction
from django.utils import timezone
from datetime import timedelta
from .models import Notification, NotificationPreference
from apps.common.logger import log_info, log_error, notifications_logger
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync


class NotificationService:
    """Service de notifications optimisé - Batch processing, real-time ready."""

    @staticmethod
    def create_notification(
        recipient,
        notification_type,
        title,
        message,
        document=None,
        priority="NORMAL",
        metadata=None,
        group_key=None,
        send_async=True,
    ):
        """
        Crée une notification.

        Args:
            recipient: User object
            notification_type: Type de notification
            title: Titre
            message: Message
            document: Document relaté (optionnel)
            priority: LOW, NORMAL, HIGH, URGENT
            metadata: Dict avec données supplémentaires
            group_key: Clé pour grouper les notifications similaires
            send_async: Si True, envoie email en async (Celery)

        Returns:
            Notification object
        """
        try:
            # Créer la notification
            with transaction.atomic():
                notification = Notification.objects.create(
                    recipient=recipient,
                    notification_type=notification_type,
                    title=title,
                    message=message,
                    document=document,
                    priority=priority,
                    metadata=metadata or {},
                    group_key=group_key,
                )

                log_info(
                    f"Notification created: {notification_type}",
                    notifications_logger,
                    recipient_id=recipient.id,
                    notification_id=notification.id,
                    priority=priority,
                )

            # Envoyer en temps réel via WebSocket (non-bloquant)
            NotificationService._push_websocket(recipient, notification)

            # Envoyer email si besoin (async via Celery)
            if send_async:
                NotificationService._queue_email_async(notification)

            return notification

        except Exception as e:
            log_error(
                "Failed to create notification",
                exception=e,
                logger_instance=notifications_logger,
            )
            raise

    @staticmethod
    def batch_create_notifications(notifications_data, group_by=False):
        """
        Crée plusieurs notifications en une transaction (performance!).

        Args:
            notifications_data: List de dicts avec recipient, type, title, message, etc
            group_by: Si True, groupe les notifications du même utilisateur/type

        Returns:
            List de Notification objects
        """
        try:
            with transaction.atomic():
                notifications_list = []

                for data in notifications_data:
                    recipient = data.pop("recipient")
                    notification_type = data.get("notification_type")

                    # Déterminer la clé de groupage si demandé
                    if group_by:
                        group_key = f"{recipient.id}_{notification_type}_{timezone.now().date()}"
                        data["group_key"] = group_key

                    notification = Notification(
                        recipient=recipient, notification_type=notification_type, **data
                    )
                    notifications_list.append(notification)

                # Bulk create - 1 requête pour N notifications!
                created_notifications = Notification.objects.bulk_create(
                    notifications_list, batch_size=1000
                )

                log_info(
                    f"Batch created {len(created_notifications)} notifications",
                    notifications_logger,
                    count=len(created_notifications),
                    group_by=group_by,
                )

                # Push WebSocket pour chaque user
                users_by_id = {}
                for notif in created_notifications:
                    if notif.recipient_id not in users_by_id:
                        users_by_id[notif.recipient_id] = []
                    users_by_id[notif.recipient_id].append(notif)

                for user_id, notifs in users_by_id.items():
                    NotificationService._push_websocket_batch(user_id, notifs)

                return created_notifications

        except Exception as e:
            log_error(
                "Batch create failed", exception=e, logger_instance=notifications_logger
            )
            raise

    @staticmethod
    def mark_all_as_read(user, notification_types=None):
        """Marquer d'un coup toutes les notifications comme lues."""
        try:
            query = Notification.objects.filter(recipient=user, is_read=False)

            if notification_types:
                query = query.filter(notification_type__in=notification_types)

            with transaction.atomic():
                count = query.update(is_read=True, read_at=timezone.now())

            log_info(
                f"Marked {count} notifications as read",
                notifications_logger,
                user_id=user.id,
                count=count,
            )

            # Mettre à jour le badge WebSocket
            NotificationService._update_unread_badge(user)

            return count

        except Exception as e:
            log_error(
                "Mark as read failed", exception=e, logger_instance=notifications_logger
            )
            raise

    @staticmethod
    def archive_old_notifications(days=30):
        """Archive automatiquement les notifications de plus de N jours."""
        try:
            cutoff_date = timezone.now() - timedelta(days=days)

            with transaction.atomic():
                count = Notification.objects.filter(
                    created_at__lt=cutoff_date, is_archived=False
                ).update(is_archived=True, archived_at=timezone.now())

            log_info(
                f"Auto-archived {count} old notifications",
                notifications_logger,
                archived_count=count,
                older_than_days=days,
            )

            return count

        except Exception as e:
            log_error(
                "Archive failed", exception=e, logger_instance=notifications_logger
            )
            raise

    @staticmethod
    def get_unread_count(user):
        """Récupère le nombre de notifications non lues."""
        return Notification.objects.filter(
            recipient=user, is_read=False, is_archived=False
        ).count()

    @staticmethod
    def get_unread_notifications(user, limit=50):
        """Récupère les N dernières notifications non lues."""
        return (
            Notification.objects.filter(
                recipient=user, is_read=False, is_archived=False
            )
            .select_related("document")
            .order_by("-created_at")[:limit]
        )

    @staticmethod
    def should_send_notification(user, notification_type):
        """Vérifie si l'utilisateur veut recevoir ce type de notification."""
        try:
            pref = NotificationPreference.objects.get(user=user)

            # Check channel
            if pref.channel == "NONE":
                return False

            # Check quiet hours
            if pref.quiet_hours_enabled:
                now = timezone.now().time()
                start = pref.quiet_start
                end = pref.quiet_end

                # Si quiet_start > quiet_end (ex: 22:00 -> 08:00), c'est la nuit
                if start < end:
                    in_quiet = start <= now < end
                else:
                    in_quiet = (now >= start) or (now < end)

                # Pour les notifs urgentes, ne pas respecter les quiet hours
                if in_quiet and notification_type != "URGENT":
                    return False

            # Check frequency
            if pref.frequency == "NEVER":
                return False

            return True

        except NotificationPreference.DoesNotExist:
            # Profile par défaut = envoyer
            return True

    @staticmethod
    def _push_websocket(user, notification):
        """Envoie la notification via WebSocket en temps réel."""
        try:
            from .serializers import NotificationDetailSerializer

            channel_layer = get_channel_layer()
            group_name = f"user_{user.id}_notifications"

            # Sérializer
            serializer = NotificationDetailSerializer(notification)

            # Envoyer via WebSocket (async)
            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.new",
                    "data": serializer.data,
                    "unread_count": NotificationService.get_unread_count(user),
                },
            )

            log_info(
                f"WebSocket push: {group_name}",
                notifications_logger,
                user_id=user.id,
                notification_id=notification.id,
            )

        except Exception as e:
            # WebSocket pas dispo? Ne pas bloquer
            log_error(
                "WebSocket push failed",
                exception=e,
                logger_instance=notifications_logger,
            )

    @staticmethod
    def _push_websocket_batch(user_id, notifications):
        """Envoie plusieurs notifications via WebSocket."""
        try:
            from .serializers import NotificationDetailSerializer

            channel_layer = get_channel_layer()
            group_name = f"user_{user_id}_notifications"

            # Sérializer batch
            serializer = NotificationDetailSerializer(notifications, many=True)

            async_to_sync(channel_layer.group_send)(
                group_name,
                {
                    "type": "notification.batch",
                    "data": serializer.data,
                    "count": len(notifications),
                },
            )

        except Exception as e:
            log_error(
                "Batch WebSocket push failed",
                exception=e,
                logger_instance=notifications_logger,
            )

    @staticmethod
    def _update_unread_badge(user):
        """Mettre à jour le badge de compteur non lus via WebSocket."""
        try:
            channel_layer = get_channel_layer()
            group_name = f"user_{user.id}_notifications"
            unread_count = NotificationService.get_unread_count(user)

            async_to_sync(channel_layer.group_send)(
                group_name,
                {"type": "notification.badge_update", "unread_count": unread_count},
            )

        except Exception as e:
            log_error(
                "Badge update failed", exception=e, logger_instance=notifications_logger
            )

    @staticmethod
    def _queue_email_async(notification):
        """Queue l'envoi d'email via Celery (non-bloquant)."""
        try:
            from .tasks import send_notification_email_async

            # Vérifier les préférences avant d'envoyer
            if NotificationService.should_send_notification(
                notification.recipient, notification.notification_type
            ):
                # Délai de 1 sec pour éviter la surcharge immédiate
                send_notification_email_async.apply_async(
                    args=[notification.id], countdown=1
                )

        except Exception as e:
            log_error(
                "Email queue failed", exception=e, logger_instance=notifications_logger
            )

    # ===== Helpers de création spécifiques =====

    @staticmethod
    def notify_on_document_uploaded(document, agent):
        """Notification quand un document est uploadé."""
        notifs = []

        # Alerter tous les admins
        from apps.users.models import User

        admins = User.objects.filter(role__in=["ADMIN", "DOCUMENT_MANAGER"])

        for admin in admins:
            notifs.append(
                {
                    "recipient": admin,
                    "notification_type": "DOCUMENT_UPLOADED",
                    "title": f"Nouveau document: {document.title}",
                    "message": f"{agent.first_name} {agent.last_name} a uploadé un document",
                    "document": document,
                    "priority": "NORMAL",
                    "metadata": {"uploaded_by": agent.id},
                }
            )

        # Créer en batch
        if notifs:
            NotificationService.batch_create_notifications(notifs)

    @staticmethod
    def notify_on_document_approved(document, approving_admin):
        """Notification quand un document est approuvé."""
        NotificationService.create_notification(
            recipient=document.agent,
            notification_type="DOCUMENT_APPROVED",
            title=f"Document approuvé: {document.title}",
            message="Votre document a été approuvé",
            document=document,
            priority="HIGH",
            metadata={"approved_by": approving_admin.id},
        )
