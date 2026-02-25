from rest_framework import serializers
from .models import EmailSchedule, Event
from apps.users.models import User


class EmailScheduleListSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la liste des planifications d'email"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    recipient_folder_name = serializers.CharField(source='recipient_folder.name', read_only=True, allow_null=True)
    
    class Meta:
        model = EmailSchedule
        fields = [
            'id', 'subject', 'recipient_type', 'recipient_folder_name',
            'scheduled_at', 'recurrence_type', 'monthly_days', 'monthly_time',
            'status', 'created_by_username', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class EmailScheduleDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour une planification d'email"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    recipient_folder_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = EmailSchedule
        fields = [
            'id', 'subject', 'message', 'recipient_type', 'recipient_folder',
            'recipient_folder_details', 'scheduled_at', 'recurrence_type',
            'monthly_days', 'monthly_time', 'status', 'sent_at',
            'error_message', 'created_by_username', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'sent_at', 'error_message']
    
    def get_recipient_folder_details(self, obj):
        """Retourne les détails du dossier destinataire"""
        if obj.recipient_folder:
            return {
                'id': obj.recipient_folder.id,
                'name': obj.recipient_folder.name,
                'type': obj.recipient_folder.folder_type,
            }
        return None


class EventListSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la liste des événements"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    visible_to_folder_name = serializers.CharField(
        source='visible_to_folder.name', 
        read_only=True, 
        allow_null=True
    )
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'event_date', 'location', 'is_public', 
            'visible_to_folder_name', 'status', 'created_by_username',
            'image', 'is_upcoming'
        ]
        read_only_fields = ['id']


class EventDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour un événement"""
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    is_upcoming = serializers.BooleanField(read_only=True)
    is_past = serializers.BooleanField(read_only=True)
    visible_to_folder_details = serializers.SerializerMethodField(read_only=True)
    
    class Meta:
        model = Event
        fields = [
            'id', 'title', 'description', 'event_date', 'start_time', 'end_time',
            'location', 'is_public', 'visible_to_folder', 'visible_to_folder_details',
            'status', 'image', 'created_by_username', 'created_at', 'updated_at',
            'is_upcoming', 'is_past'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_visible_to_folder_details(self, obj):
        """Retourne les détails du dossier de visibilité"""
        if obj.visible_to_folder:
            return {
                'id': obj.visible_to_folder.id,
                'name': obj.visible_to_folder.name,
                'type': obj.visible_to_folder.folder_type,
            }
        return None
