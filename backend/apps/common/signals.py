"""
Signaux Django pour l'audit en temps réel.

Quand un log d'audit est créé, il est immédiatement envoyé au WebSocket
des administrateurs connectés.
"""

import json
import logging
from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .audit import AuditLog

logger = logging.getLogger('apps.common')
channel_layer = get_channel_layer()


@receiver(post_save, sender=AuditLog)
def auditlog_created(sender, instance, created, **kwargs):
    """
    Signal déclenché quand un log d'audit est créé.
    
    Envoie le log d'audit à tous les admins connectés via WebSocket.
    """
    if not created:
        # On ne broadcast que les nouveaux logs, pas les mises à jour
        return
    
    # Préparer les données du log d'audit
    auditlog_data = {
        'id': instance.id,
        'actor': instance.actor.get_full_name() if instance.actor else 'Système',
        'actor_id': instance.actor_id,
        'action': instance.action,
        'action_display': instance.get_action_display(),
        'severity': instance.severity,
        'severity_display': instance.get_severity_display(),
        'description': instance.description,
        'changes': instance.changes or {},
        'ip_address': instance.ip_address,
        'user_agent': instance.user_agent[:100] if instance.user_agent else '',
        'success': instance.success,
        'error_message': instance.error_message,
        'created_at': instance.created_at.isoformat(),
        'object_id': instance.object_id,
        'content_type': str(instance.content_type) if instance.content_type else None,
    }
    
    # Envoyer au groupe WebSocket des admins
    room_group_name = 'auditlog_admins'
    
    try:
        async_to_sync(channel_layer.group_send)(
            room_group_name,
            {
                'type': 'auditlog_created',
                'log': auditlog_data,
            }
        )
        
        logger.info(
            f'📝 New audit log {instance.id}: {instance.action} by {instance.actor}'
        )
    except Exception as e:
        logger.error(
            f'❌ Failed to send audit log {instance.id} via WebSocket: {str(e)}'
        )
