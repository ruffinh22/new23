from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.documents.models import Document
import json


class NotificationPreference(models.Model):
    """Préférences de notification pour chaque utilisateur."""
    
    FREQUENCY_CHOICES = [
        ('IMMEDIATE', 'Immédiat'),
        ('DIGEST_HOURLY', 'Résumé hourly'),
        ('DIGEST_DAILY', 'Résumé quotidien'),
        ('DIGEST_WEEKLY', 'Résumé hebdo'),
        ('NEVER', 'Jamais'),
    ]
    
    CHANNEL_CHOICES = [
        ('IN_APP', 'In-app seulement'),
        ('EMAIL', 'Email seulement'),
        ('BOTH', 'In-app + Email'),
        ('NONE', 'Aucun'),
    ]
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preference'
    )
    
    # Canaux
    channel = models.CharField(max_length=10, choices=CHANNEL_CHOICES, default='IN_APP')
    frequency = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='IMMEDIATE')
    
    # Silences
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_start = models.TimeField(default='22:00', help_text='Pas de notifications de 22h à...')
    quiet_end = models.TimeField(default='08:00', help_text='...à 8h')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Notification Preference'
        db_table = 'notification_preferences'
        indexes = [models.Index(fields=['user'])]
    
    def __str__(self):
        return f"Prefs de {self.user.matricule}"


class Notification(models.Model):
    """Modèle pour les notifications optimisé."""
    
    TYPE_CHOICES = [
        ('DOCUMENT_UPLOADED', 'Document uploadé'),
        ('DOCUMENT_OPENED', 'Document ouvert'),
        ('DOCUMENT_APPROVED', 'Document approuvé'),
        ('DOCUMENT_REJECTED', 'Document rejeté'),
        ('DOCUMENT_DELETED', 'Document supprimé'),
        ('VALIDATION', 'Document validé'),
        ('COMMENT', 'Nouveau commentaire'),
        ('ROUTING', 'Document routé'),
        ('SYSTEM', 'Notification système'),
        ('MENTION', 'Vous avez été mentionné'),
        ('SHARE', 'Document partagé'),
    ]
    
    PRIORITY_CHOICES = [
        ('LOW', 'Basse'),
        ('NORMAL', 'Normal'),
        ('HIGH', 'Haute'),
        ('URGENT', 'Urgent'),
    ]
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications'
    )
    notification_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='NORMAL')
    title = models.CharField(max_length=255)
    message = models.TextField()
    
    # Lien vers le document
    document = models.ForeignKey(
        Document,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='notifications'
    )
    
    # Metadata flexible
    metadata = models.JSONField(default=dict, blank=True, help_text='Extra data (actor, reason, etc)')
    
    # Status
    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    is_archived = models.BooleanField(default=False, db_index=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    
    # Grouping
    group_key = models.CharField(max_length=100, null=True, blank=True, db_index=True, help_text='Pour grouper les notifications similaires')
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, help_text='Auto-delete après cette date')
    
    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['recipient', 'is_archived']),
            models.Index(fields=['recipient', 'created_at']),
            models.Index(fields=['group_key', 'created_at']),
            models.Index(fields=['priority', 'created_at']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"[{self.priority}] {self.title}"
    
    def mark_as_read(self):
        """Marquer comme lu."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def archive(self):
        """Archiver la notification."""
        if not self.is_archived:
            self.is_archived = True
            self.archived_at = timezone.now()
            self.save(update_fields=['is_archived', 'archived_at'])
    
    @property
    def is_unread(self):
        return not self.is_read
    
    @property
    def time_since_creation(self):
        """Temps écoulé lisible."""
        from django.utils.timesince import timesince
        return timesince(self.created_at)
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"{self.recipient.matricule} - {self.title}"
    
    def mark_as_read(self):
        """Marque la notification comme lue."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
