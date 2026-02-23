"""
Sérialiseurs pour les notifications en temps réel - PHASE 5 REFACTORED.
Supporte les nouveaux champs: priority, metadata, archiving, grouping, expiry.
"""

from rest_framework import serializers
from .models import Notification, NotificationPreference


class NotificationSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour le modèle Notification.
    Inclut tous les nouveaux champs (priority, metadata, archiving, grouping).
    """
    
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True, allow_null=True)
    document_title = serializers.SerializerMethodField()
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_unread = serializers.BooleanField(read_only=True)
    time_since_creation = serializers.SerializerMethodField()
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name', 'notification_type',
            'notification_type_display', 'title', 'message', 'document',
            'document_title', 'priority', 'priority_display', 'metadata',
            'is_read', 'read_at', 'is_archived', 'archived_at',
            'group_key', 'expires_at', 'is_unread', 'time_since_creation',
            'created_at'
        ]
        read_only_fields = [
            'id', 'recipient', 'created_at', 'is_unread', 'time_since_creation'
        ]
    
    def get_document_title(self, obj):
        """Récupère le titre du document en toute sécurité."""
        try:
            return obj.document.title if obj.document else None
        except (AttributeError, TypeError):
            return None
    
    def get_time_since_creation(self, obj):
        """Retourne le temps écoulé depuis la création."""
        try:
            return obj.time_since_creation
        except:
            return None


class NotificationDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour les notifications.
    Inclut toutes les infos relatives (user, document, préférences).
    """
    
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True, allow_null=True)
    recipient_email = serializers.CharField(source='recipient.email', read_only=True, allow_null=True)
    document_info = serializers.SerializerMethodField()
    notification_type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    is_unread = serializers.BooleanField(read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'recipient_name', 'recipient_email',
            'notification_type', 'notification_type_display', 'title',
            'message', 'document', 'document_info', 'priority', 'priority_display',
            'metadata', 'is_read', 'read_at', 'is_archived', 'archived_at',
            'group_key', 'expires_at', 'is_unread', 'created_at'
        ]
        read_only_fields = ['id', 'recipient', 'created_at', 'is_unread']
    
    def get_document_info(self, obj):
        """Récupère les infos du document en toute sécurité."""
        try:
            if obj.document:
                return {
                    'id': obj.document.id,
                    'title': getattr(obj.document, 'title', 'Sans titre'),
                    'type': getattr(obj.document, 'document_type', 'UNKNOWN'),
                    'status': getattr(obj.document, 'status', 'UNKNOWN'),
                    'created_at': getattr(obj.document, 'created_at', None)
                }
        except Exception as e:
            # Log erreur mais ne la lève pas (graceful degradation)
            import logging
            logger = logging.getLogger('apps.notifications')
            logger.warning(f"Erreur lors de la récupération des infos document: {e}")
        return None


class NotificationCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer des notifications."""
    
    class Meta:
        model = Notification
        fields = [
            'recipient', 'notification_type', 'title', 'message', 'document',
            'priority', 'metadata', 'group_key', 'expires_at'
        ]


class NotificationPreferenceSerializer(serializers.ModelSerializer):
    """
    Sérialiseur pour les préférences de notifications.
    Gère: canal (IN_APP, EMAIL, etc), fréquence, heures silencieuses.
    """
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    user_email = serializers.CharField(source='user.email', read_only=True)
    channel_display = serializers.CharField(source='get_channel_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    
    class Meta:
        model = NotificationPreference
        fields = [
            'id', 'user', 'user_name', 'user_email',
            'channel', 'channel_display',
            'frequency', 'frequency_display',
            'quiet_hours_start', 'quiet_hours_end',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user', 'created_at', 'updated_at', 'user_name', 'user_email']
