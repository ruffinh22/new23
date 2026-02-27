"""
Tâches Celery pour notifications - OPTIMISÉE (non-bloquant, batch).
"""

from celery import shared_task
from django.core.mail import send_mail, EmailMultiAlternatives
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from .models import Notification
from apps.users.models import User
from apps.common.logger import log_info, log_error, notifications_logger
import logging

celery_logger = logging.getLogger("celery")


@shared_task(bind=True, max_retries=3)
def send_notification_email_async(self, notification_id, retry_count=0):
    """
    Envoie email d'une notification - ASYNC (non-bloquant).
    Retry 3x si echec.

    Args:
        notification_id: ID de la notification
        retry_count: Nb de tentatives

    Returns:
        'success' ou erreur
    """
    try:
        notification = Notification.objects.select_related("recipient", "document").get(
            id=notification_id
        )
        recipient = notification.recipient

        # Vérifier les préférences
        from .service_refactored import NotificationService

        if not NotificationService.should_send_notification(
            recipient, notification.notification_type
        ):
            log_info(
                "Email skipped (user preferences)",
                notifications_logger,
                notification_id=notification_id,
            )
            return "skipped"

        # Préparer l'email
        subject = f"[SGDRA] {notification.title}"
        text_content = notification.message

        # HTML si possible
        html_content = f"""
        <h3>{notification.title}</h3>
        <p>{notification.message}</p>
        <p style="color: #999; font-size: 12px;">
            {notification.created_at.strftime("%d/%m/%Y %H:%M")}
        </p>
        """

        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[recipient.email],
        )
        email.attach_alternative(html_content, "text/html")
        email.send(fail_silently=False)

        log_info(
            "Email sent",
            notifications_logger,
            notification_id=notification_id,
            recipient_email=recipient.email,
        )

        return "success"

    except Notification.DoesNotExist:
        log_error(
            f"Notification {notification_id} not found",
            logger_instance=notifications_logger,
        )
        return "not_found"

    except Exception as e:
        log_error(
            "Email send failed",
            exception=e,
            logger_instance=notifications_logger,
            retry_count=retry_count,
        )

        # Retry avec backoff exponentiel
        if retry_count < 3:
            raise self.retry(exc=e, countdown=60 * (2**retry_count))

        return "failed_max_retries"


@shared_task(bind=True)
def batch_send_notification_emails(self, notification_ids, batch_size=50):
    """
    Envoie emails pour un batch de notifications.
    Divise le travail pour éviter les timeouts.

    Args:
        notification_ids: Liste d'IDs
        batch_size: Taille des sous-batches

    Returns:
        Count d'emails envoyés
    """
    sent_count = 0
    failed_count = 0

    # Traiter par chunks
    for i in range(0, len(notification_ids), batch_size):
        chunk = notification_ids[i : i + batch_size]

        for notif_id in chunk:
            try:
                result = send_notification_email_async(notif_id)
                if result == "success":
                    sent_count += 1
                elif result == "skipped":
                    pass
                else:
                    failed_count += 1
            except Exception as e:
                log_error(
                    "Batch email error",
                    exception=e,
                    logger_instance=notifications_logger,
                )
                failed_count += 1

    log_info(
        "Batch emails completed",
        notifications_logger,
        sent=sent_count,
        failed=failed_count,
        total=len(notification_ids),
    )

    return {"sent": sent_count, "failed": failed_count}


@shared_task
def archive_old_notifications():
    """Archive automatiquement les vieilles notifications (30+ jours)."""
    try:
        from .service_refactored import NotificationService

        count = NotificationService.archive_old_notifications(days=30)

        log_info(
            f"Auto-archived {count} old notifications",
            notifications_logger,
            archived_count=count,
        )

        return count

    except Exception as e:
        log_error(
            "Auto-archive failed", exception=e, logger_instance=notifications_logger
        )
        return 0


@shared_task
def cleanup_expired_notifications():
    """Supprimer les notifications expirées."""
    try:
        deleted_count = Notification.objects.filter(
            expires_at__lt=timezone.now()
        ).delete()[0]

        log_info(
            f"Deleted {deleted_count} expired notifications",
            notifications_logger,
            deleted_count=deleted_count,
        )

        return deleted_count

    except Exception as e:
        log_error("Cleanup failed", exception=e, logger_instance=notifications_logger)
        return 0


@shared_task
def send_daily_digest(user_id):
    """Envoye un résumé quotidien des notifications."""
    try:

        user = User.objects.get(id=user_id)
        unread = Notification.objects.filter(
            recipient=user,
            is_read=False,
            created_at__gte=timezone.now() - timedelta(days=1),
        ).count()

        if unread == 0:
            return "no_notifications"

        subject = f"[SGDRA] Résumé: {unread} notifications non lues"
        message = (
            f"Vous avez {unread} notifications non lues. Consultez l'app pour les voir."
        )

        email = EmailMultiAlternatives(
            subject=subject,
            body=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[user.email],
        )

        email.send(fail_silently=False)

        log_info(
            "Daily digest sent",
            notifications_logger,
            user_id=user_id,
            unread_count=unread,
        )

        return "sent"

    except User.DoesNotExist:
        log_error(f"User {user_id} not found", logger_instance=notifications_logger)
        return "user_not_found"

    except Exception as e:
        log_error(
            "Daily digest failed", exception=e, logger_instance=notifications_logger
        )
        return "failed"


@shared_task
def send_notification_email(notification_id, recipient_email=None):
    """
    Envoie un email de notification.

    Args:
        notification_id: ID de la notification
        recipient_email: Email du destinataire (optionnel)
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        recipient = notification.recipient

        email_to = recipient_email or recipient.email

        # Construire le contenu de l'email
        subject = f"[SGDRA] {notification.title}"
        text_content = notification.message

        # Créer l'email
        email = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=settings.DEFAULT_FROM_EMAIL,
            to=[email_to],
        )

        # Envoyer
        email.send(fail_silently=False)

        return f"✓ Email envoyé à {email_to}"

    except Notification.DoesNotExist:
        return f"✗ Notification {notification_id} non trouvée"
    except Exception as e:
        return f"✗ Erreur lors de l'envoi: {str(e)}"


@shared_task
def send_subscription_reminder_email():
    """
    Envoie des emails de rappel pour les abonnements/dépôts.
    Utilisé pour notifier les utilisateurs que le dépôt commence bientôt.

    Exemple: Tous les 22 du mois, envoyer un email que le dépôt commence le 25.
    """
    try:
        # Récupérer tous les utilisateurs actifs
        users = User.objects.filter(is_active=True)

        if not users.exists():
            return "Aucun utilisateur actif"

        # Déterminer la date du dépôt (25e du mois)
        today = timezone.now().date()
        if today.day < 25:
            deposit_date = today.replace(day=25)
        else:
            # Si on est après le 25, le prochain dépôt est le 25 du mois suivant
            next_month = today.replace(day=1) + timedelta(days=32)
            deposit_date = next_month.replace(day=25)

        days_left = (deposit_date - today).days

        subject = f"[SGDRA] Rappel: Le dépôt commence dans {days_left} jours ({deposit_date.strftime('%d/%m/%Y')})"

        message = f"""
Bonjour,

Nous vous rappelons que la période de dépôt débutera le {deposit_date.strftime("%d %B %Y")}.

Il vous reste {days_left} jour(s) pour préparer vos documents.

Merci,
L'équipe SGDRA
        """.strip()

        # Envoyer l'email à tous les utilisateurs
        emails_sent = 0
        for user in users:
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                emails_sent += 1
            except Exception as e:
                log_error(
                    f"Failed to send email to {user.email}",
                    exception=e,
                    logger_instance=base_logger,
                )

        return f"✓ {emails_sent} email(s) de rappel envoyé(s)"

    except Exception as e:
        return f"✗ Erreur lors de l'envoi des rappels: {str(e)}"


@shared_task
def send_document_validation_email(document_id, status):
    """
    Envoie un email quand un document est validé ou rejeté.

    Args:
        document_id: ID du document
        status: 'approved' ou 'rejected'
    """
    try:
        from apps.documents.models import Document

        document = Document.objects.get(id=document_id)
        agent = document.agent

        if status == "approved":
            subject = f"[SGDRA] Document validé: {document.title}"
            message = f"""
Bonjour {agent.first_name},

Votre document "{document.title}" a été validé et accepté.

Merci,
L'équipe SGDRA
            """.strip()
        elif status == "rejected":
            subject = f"[SGDRA] Document rejeté: {document.title}"
            message = f"""
Bonjour {agent.first_name},

Votre document "{document.title}" a été rejeté.

Raison: {document.rejection_reason}

Veuillez corriger et réessayer.

Merci,
L'équipe SGDRA
            """.strip()
        else:
            return f"✗ Statut inconnu: {status}"

        send_mail(
            subject=subject,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[agent.email],
            fail_silently=False,
        )

        return f"✓ Email envoyé à {agent.email}"

    except Document.DoesNotExist:
        return f"✗ Document {document_id} non trouvé"
    except Exception as e:
        return f"✗ Erreur lors de l'envoi: {str(e)}"


@shared_task
def send_bulk_notification_email(title, message, recipient_filter=None):
    """
    Envoie un email groupé à plusieurs utilisateurs.

    Args:
        title: Titre de la notification
        message: Contenu du message
        recipient_filter: Dictionnaire de filtre (ex: {'is_staff': True})
    """
    try:
        # Récupérer les destinataires
        if recipient_filter:
            users = User.objects.filter(**recipient_filter, is_active=True)
        else:
            users = User.objects.filter(is_active=True)

        if not users.exists():
            return "Aucun destinataire trouvé"

        subject = f"[SGDRA] {title}"

        # Envoyer l'email
        emails_sent = 0
        for user in users:
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=False,
                )
                emails_sent += 1
            except Exception as e:
                print(f"Erreur lors de l'envoi à {user.email}: {str(e)}")

        return f"✓ {emails_sent} email(s) envoyé(s)"

    except Exception as e:
        return f"✗ Erreur lors de l'envoi en masse: {str(e)}"


@shared_task
def cleanup_old_notifications():
    """
    Nettoie les anciennes notifications (plus de 30 jours).
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=30)
        deleted_count, _ = Notification.objects.filter(
            created_at__lt=cutoff_date, is_read=True
        ).delete()

        return f"✓ {deleted_count} notification(s) supprimée(s)"
    except Exception as e:
        return f"✗ Erreur lors du nettoyage: {str(e)}"
