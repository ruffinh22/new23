"""
Signaux Django pour gérer les notifications en temps réel.

Quand une notification est créée, elle est immédiatement envoyée au WebSocket
de l'utilisateur destinataire.
"""

import logging
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Notification

logger = logging.getLogger("apps.notifications")
channel_layer = get_channel_layer()


@receiver(post_save, sender=Notification)
def notification_created_or_updated(sender, instance, created, **kwargs):
    """
    Signal déclenché quand une notification est créée ou mise à jour.

    Envoie la notification au WebSocket de l'utilisateur destinataire.
    """
    if not instance.recipient:
        logger.warning(f"⚠️  Notification {instance.id} has no recipient")
        return

    # Préparer les données de la notification
    notification_data = {
        "id": instance.id,
        "notification_type": instance.notification_type,
        "title": instance.title,
        "message": instance.message,
        "is_read": instance.is_read,
        "document_id": instance.document_id,
        "created_at": instance.created_at.isoformat(),
        "read_at": instance.read_at.isoformat() if instance.read_at else None,
    }

    # Déterminer le type d'événement
    event_type = "notification_created" if created else "notification_updated"

    # Envoyer au groupe WebSocket de l'utilisateur
    room_group_name = f"notifications_{instance.recipient.id}_group"

    try:
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                "type": event_type,
                "notification": notification_data,
            },
        )

        action = "✨ Created" if created else "✏️ Updated"
        logger.info(
            f"{action} notification {instance.id} for user {instance.recipient.matricule}"
        )
    except Exception as e:
        logger.error(
            f"❌ Failed to send notification {instance.id} via WebSocket: {str(e)}"
        )


@receiver(post_delete, sender=Notification)
def notification_deleted(sender, instance, **kwargs):
    """
    Signal déclenché quand une notification est supprimée.
    """
    if not instance.recipient:
        return

    room_group_name = f"notifications_{instance.recipient.id}_group"

    try:
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                "type": "notification_deleted",
                "notification_id": instance.id,
            },
        )
        logger.info(f"🗑️  Deleted notification {instance.id}")
    except Exception as e:
        logger.error(f"❌ Failed to send deletion event: {str(e)}")
