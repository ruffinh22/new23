from django.contrib import admin
from .models import EmailSchedule, Event


@admin.register(EmailSchedule)
class EmailScheduleAdmin(admin.ModelAdmin):
    list_display = ['subject', 'recipient_type', 'scheduled_at', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'recipient_type', 'created_at', 'scheduled_at']
    search_fields = ['subject', 'message']
    readonly_fields = ['id', 'created_at', 'updated_at', 'sent_at', 'error_message']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'subject', 'message')
        }),
        ('Destinataires', {
            'fields': ('recipient_type', 'recipient_folder')
        }),
        ('Programmation', {
            'fields': ('scheduled_at',)
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
        ('Résultat', {
            'fields': ('status', 'sent_at', 'error_message')
        }),
    )
    
    def has_delete_permission(self, request, obj=None):
        """Seuls les admins peuvent supprimer"""
        return request.user.is_superuser


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['title', 'event_date', 'is_public', 'status', 'created_by', 'created_at']
    list_filter = ['status', 'is_public', 'event_date', 'created_at']
    search_fields = ['title', 'description']
    readonly_fields = ['id', 'created_at', 'updated_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('id', 'title', 'description', 'image')
        }),
        ('Dates et lieu', {
            'fields': ('event_date', 'start_time', 'end_time', 'location')
        }),
        ('Visibilité', {
            'fields': ('is_public', 'visible_to_folder')
        }),
        ('Métadonnées', {
            'fields': ('status', 'created_by', 'created_at', 'updated_at')
        }),
    )
