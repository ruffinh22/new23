"""
WebSocket consumers pour les notifications et l'audit en temps réel.
✅ Utilise Django Channels + Redis pour broadcast temps réel
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model
from apps.notifications.models import Notification
from apps.common.audit import AuditLog

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer pour les notifications en temps réel.

    Broadcast les nouvelles notifications aux utilisateurs connectés.
    """

    async def send_json(self, content, close=False):
        """Helper method to send JSON - AsyncWebsocketConsumer doesn't have it by default."""
        await self.send(text_data=json.dumps(content), close=close)

    async def connect(self):
        """Établit la connexion WebSocket."""
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        # ✅ Synchroniser le nom du groupe avec les signaux
        self.room_group_name = f"notifications_{self.user.id}_group"

        # Joindre le groupe
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()
        print(f"✅ Notification WebSocket connecté: {self.user.matricule}")

        # Envoyer les notifications non lues au client
        unread = await self.get_unread_notifications()
        await self.send_json(
            {
                "type": "initial_notifications",
                "notifications": unread,
                "count": len(unread),
            }
        )

    async def disconnect(self, close_code):
        """Ferme la connexion WebSocket."""
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )
        print("❌ Notification WebSocket déconnecté")

    async def receive_json(self, content):
        """Reçoit et traite les messages JSON."""
        action = content.get("action")

        if action == "mark_as_read":
            notification_id = content.get("notification_id")
            await self.mark_notification_as_read(notification_id)

            # Broadcaster au groupe
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    "type": "notification_read",
                    "notification_id": notification_id,
                    "user_id": self.user.id,
                },
            )

        elif action == "get_unread":
            unread = await self.get_unread_notifications()
            await self.send_json(
                {
                    "type": "unread_notifications",
                    "notifications": unread,
                    "count": len(unread),
                }
            )

    # Handlers de groupe (reçus du signal)
    async def notification_created(self, event):
        """Reçoit une notification créée (d'une autre connexion)."""
        print(f"📨 [NotificationConsumer] notification_created reçu: {event}")
        await self.send_json(
            {"type": "notification", "notification": event.get("notification")}
        )

    async def notification_updated(self, event):
        """Reçoit une notification mise à jour."""
        print(f"📨 [NotificationConsumer] notification_updated reçu: {event}")
        await self.send_json(
            {"type": "notification_updated", "notification": event.get("notification")}
        )

    async def notification_read(self, event):
        """Notifie que la notification a été marquée comme lue."""
        print(f"📨 [NotificationConsumer] notification_read reçu: {event}")
        await self.send_json(
            {
                "type": "notification_read",
                "notification_id": event.get("notification_id"),
            }
        )

    @database_sync_to_async
    def get_unread_notifications(self):
        """Récupère les notifications non lues de l'utilisateur."""
        notifications = Notification.objects.filter(
            recipient=self.user, is_read=False
        ).order_by("-created_at")[:20]

        return [
            {
                "id": str(n.id),
                "title": n.title,
                "message": n.message,
                "notification_type": n.notification_type,
                "created_at": n.created_at.isoformat(),
                "metadata": n.metadata or {},
            }
            for n in notifications
        ]

    @database_sync_to_async
    def mark_notification_as_read(self, notification_id):
        """Marque une notification comme lue."""
        try:
            notification = Notification.objects.get(
                id=notification_id, recipient=self.user
            )
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False


class AuditLogConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer pour les logs d'audit en temps réel.

    Broadcast les nouveaux logs d'audit aux admins connectés.
    ✅ ADMIN ONLY
    """

    async def send_json(self, content, close=False):
        """Helper method to send JSON - AsyncWebsocketConsumer doesn't have it by default."""
        await self.send(text_data=json.dumps(content), close=close)

    async def connect(self):
        """Établit la connexion WebSocket."""
        self.user = self.scope["user"]

        # Vérifier que c'est un admin
        if not self.user.is_authenticated or not await self.is_admin():
            await self.close()
            return

        # Créer un groupe global pour les admins
        self.room_group_name = "auditlog_admins"

        # Joindre le groupe
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)

        await self.accept()
        print(f"✅ AuditLog WebSocket connecté: {self.user.matricule} (ADMIN)")

        # Envoyer les logs récents au client
        recent = await self.get_recent_audit_logs()
        await self.send_json(
            {"type": "initial_logs", "logs": recent, "count": len(recent)}
        )

    async def disconnect(self, close_code):
        """Ferme la connexion WebSocket."""
        if hasattr(self, "room_group_name"):
            await self.channel_layer.group_discard(
                self.room_group_name, self.channel_name
            )
        print("❌ AuditLog WebSocket déconnecté")

    async def receive_json(self, content):
        """Reçoit et traite les messages JSON."""
        action = content.get("action")

        if action == "get_recent":
            recent = await self.get_recent_audit_logs()
            await self.send_json({"type": "recent_logs", "logs": recent})

        elif action == "filter":
            action_type = content.get("action_type")
            logs = await self.get_audit_logs_by_type(action_type)
            await self.send_json(
                {"type": "filtered_logs", "logs": logs, "filter": action_type}
            )

    # Handlers de groupe
    async def auditlog_created(self, event):
        """Envoie un nouveau log d'audit au client."""
        await self.send_json({"type": "auditlog", "log": event.get("log")})

    @database_sync_to_async
    def is_admin(self):
        """Vérifie si l'utilisateur est admin."""
        return (
            self.user.is_staff
            or self.user.is_superuser
            or (hasattr(self.user, "role") and self.user.role == "ADMIN")
        )

    @database_sync_to_async
    def get_recent_audit_logs(self):
        """Récupère les logs d'audit récents."""
        logs = AuditLog.objects.all().order_by("-created_at")[:50]

        return [
            {
                "id": log.id,
                "action": log.action,
                "action_display": dict(AuditLog.ACTION_CHOICES).get(
                    log.action, log.action
                ),
                "actor": log.actor.matricule if log.actor else "SYSTEM",
                "actor_id": log.actor_id,
                "created_at": log.created_at.isoformat(),
                "description": log.description,
                "severity": log.severity,
                "severity_display": dict(AuditLog.SEVERITY_CHOICES).get(
                    log.severity, log.severity
                ),
                "changes": log.changes or {},
                "ip_address": log.ip_address or "N/A",
                "success": log.success,
            }
            for log in logs
        ]

    @database_sync_to_async
    def get_audit_logs_by_type(self, action_type):
        """Récupère les logs par type d'action."""
        logs = AuditLog.objects.filter(action=action_type).order_by("-created_at")[:50]

        return [
            {
                "id": log.id,
                "action": log.action,
                "action_display": dict(AuditLog.ACTION_CHOICES).get(
                    log.action, log.action
                ),
                "actor": log.actor.matricule if log.actor else "SYSTEM",
                "actor_id": log.actor_id,
                "created_at": log.created_at.isoformat(),
                "description": log.description,
                "severity": log.severity,
                "severity_display": dict(AuditLog.SEVERITY_CHOICES).get(
                    log.severity, log.severity
                ),
                "changes": log.changes or {},
                "ip_address": log.ip_address or "N/A",
                "success": log.success,
            }
            for log in logs
        ]
