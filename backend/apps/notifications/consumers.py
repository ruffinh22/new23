"""
WebSocket consumers pour les notifications en temps réel - REFACTORED.
Optimisé pour performance et absence de blocage.
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

logger = logging.getLogger('apps.notifications')


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer pour les notifications en temps réel - Hyper performant.
    
    Fonctionnalités:
    - Connexion persistence sans polling
    - Push instantané des notifications
    - Badge counter real-time
    - Bulk mark as read/archive
    - Quiet hours respectées
    """
    
    async def connect(self):
        """Quand client se connecte."""
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            logger.warning("Unauthenticated connection attempt")
            return
        
        self.group_name = f"user_{self.user.id}_notifications"
        
        # Joindre le groupe
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Envoyer le badge initial
        unread = await self.get_unread_count()
        await self.send_json({
            'type': 'connected',
            'status': 'ok',
            'unread_count': unread,
            'timestamp': timezone.now().isoformat()
        })
        
        logger.info(f"✅ User {self.user.matricule} connected to notifications")
    
    async def disconnect(self, close_code):
        """Quand client se déconnecte."""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
        logger.info(f"User {self.user.matricule} disconnected")
    
    async def receive_json(self, content):
        """Reçoit commandes du client."""
        command = content.get('command')
        
        try:
            if command == 'mark_as_read':
                notif_id = content.get('notification_id')
                await self.mark_as_read(notif_id)
                
            elif command == 'mark_all_as_read':
                count = await self.mark_all_as_read()
                await self.send_json({'type': 'all_marked_read', 'count': count})
                
            elif command == 'archive':
                notif_id = content.get('notification_id')
                await self.archive_notification(notif_id)
                
            elif command == 'get_unread':
                unread = await self.get_unread_count()
                await self.send_json({'type': 'unread_count', 'count': unread})
                
            elif command == 'ping':
                await self.send_json({'type': 'pong', 'timestamp': timezone.now().isoformat()})
                
        except Exception as e:
            logger.error(f"Command {command} error: {str(e)}")
            await self.send_json({'type': 'error', 'message': str(e)})
    
    # ===== Event handlers =====
    
    async def notification_new(self, event):
        """Push nouvelle notification."""
        await self.send_json({
            'type': 'notification_new',
            'data': event['data'],
            'unread_count': event.get('unread_count', 0),
            'timestamp': timezone.now().isoformat()
        })
    
    async def notification_batch(self, event):
        """Push batch de notifications."""
        await self.send_json({
            'type': 'notification_batch',
            'data': event['data'],
            'count': event.get('count', 0),
            'timestamp': timezone.now().isoformat()
        })
    
    async def notification_badge_update(self, event):
        """Update compteur."""
        await self.send_json({
            'type': 'badge_update',
            'unread_count': event['unread_count'],
            'timestamp': timezone.now().isoformat()
        })
    
    # ===== DB operations =====
    
    @database_sync_to_async
    def mark_as_read(self, notification_id):
        """Marquer 1 notification lue."""
        from .models import Notification
        try:
            n = Notification.objects.get(id=notification_id, recipient=self.user)
            n.mark_as_read()
            logger.info(f"Notification {notification_id} marked read")
        except Notification.DoesNotExist:
            logger.warning(f"Notification {notification_id} not found")
    
    @database_sync_to_async
    def mark_all_as_read(self):
        """Marquer toutes = lues."""
        from .models import Notification
        count = Notification.objects.filter(
            recipient=self.user,
            is_read=False,
            is_archived=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        logger.info(f"Marked {count} as read for user {self.user.id}")
        return count
    
    @database_sync_to_async
    def archive_notification(self, notification_id):
        """Archiver 1 notification."""
        from .models import Notification
        try:
            n = Notification.objects.get(id=notification_id, recipient=self.user)
            n.archive()
            logger.info(f"Notification {notification_id} archived")
        except Notification.DoesNotExist:
            logger.warning(f"Notification {notification_id} not found")
    
    @database_sync_to_async
    def get_unread_count(self):
        """Compter notifications non lues."""
        from .models import Notification
        return Notification.objects.filter(
            recipient=self.user,
            is_read=False,
            is_archived=False
        ).count()


class AdminBroadcasterConsumer(AsyncWebsocketConsumer):
    """Broadcaster système pour admins - envoyer notifs globales."""
    
    async def connect(self):
        """Accepter si admin."""
        self.user = self.scope.get('user')
        
        if not self.user or not self.user.is_authenticated or not self.user.is_admin:
            await self.close()
            logger.warning(f"Unauthorized broadcaster: {self.user}")
            return
        
        self.group_name = "admin_broadcaster"
        
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()
        logger.info(f"Admin {self.user.matricule} connected to broadcaster")
    
    async def disconnect(self, close_code):
        """Déconnecter."""
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )
    
    async def receive_json(self, content):
        """Broadcast notif système."""
        if content.get('command') == 'broadcast':
            await self.broadcast_notification(
                title=content.get('title'),
                message=content.get('message'),
                recipients=content.get('recipients'),
                priority=content.get('priority', 'NORMAL')
            )
    
    @database_sync_to_async
    def broadcast_notification(self, title, message, recipients, priority):
        """Envoyer notif batch."""
        from .service_refactored import NotificationService
        from apps.users.models import User
        
        if recipients == 'all':
            target_users = User.objects.filter(is_active=True)
        else:
            target_users = User.objects.filter(id__in=recipients or [])
        
        notifs = [
            {
                'recipient': user,
                'notification_type': 'SYSTEM',
                'title': title,
                'message': message,
                'priority': priority,
                'metadata': {'broadcaster': self.user.id}
            }
            for user in target_users
        ]
        
        if notifs:
            NotificationService.batch_create_notifications(notifs)
            logger.info(f"Broadcasted {len(notifs)} notifications")
