"""
Document Template Model - Allows admins to create and manage templates for agents
"""
from django.db import models
from django.contrib.auth import get_user_model
from django.core.validators import FileExtensionValidator
from django.utils.translation import gettext_lazy as _
from apps.folders.models import Folder

User = get_user_model()


class DocumentTemplate(models.Model):
    """
    Template model for documents that admins can create and share with agents.
    Templates can be assigned to specific departments or globally available.
    """
    
    TEMPLATE_TYPE_CHOICES = [
        ('REPORT', _('Rapport')),
        ('LETTER', _('Lettre')),
        ('REQUEST', _('Demande')),
        ('CONTRACT', _('Contrat')),
        ('PROCEDURE', _('Procédure')),
        ('FORM', _('Formulaire')),
        ('OTHER', _('Autre')),
    ]
    
    VISIBILITY_CHOICES = [
        ('ALL', _('Tous les agents')),
        ('DEPARTMENT', _('Par département')),
        ('CUSTOM', _('Agents sélectionnés')),
    ]

    # Basic Info
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255, verbose_name=_('Nom du modèle'))
    description = models.TextField(blank=True, verbose_name=_('Description'))
    template_type = models.CharField(
        max_length=20,
        choices=TEMPLATE_TYPE_CHOICES,
        default='OTHER',
        verbose_name=_('Type de modèle')
    )
    
    # File Management
    file = models.FileField(
        upload_to='templates/%Y/%m/%d/',
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'docx', 'xlsx', 'pptx', 'doc', 'xls', 'ppt']
        )],
        verbose_name=_('Fichier')
    )
    file_size = models.BigIntegerField(editable=False, default=0)  # In bytes
    file_type = models.CharField(max_length=20, editable=False, default='DOC')
    
    # Creator & Ownership
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='created_templates',
        verbose_name=_('Créé par')
    )
    
    # Visibility & Sharing
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='ALL',
        verbose_name=_('Visibilité')
    )
    
    # Department-based sharing (refactored to Folder(type='service'))
    departments = models.ManyToManyField(
        'folders.Folder',
        blank=True,
        related_name='templates',
        verbose_name=_('Services/Départements autorisés'),
        help_text=_('Services (type=service) autorisés. Laissez vide pour tous les services'),
        limit_choices_to={'folder_type': 'service'}
    )
    
    # User-level sharing (for CUSTOM visibility)
    allowed_users = models.ManyToManyField(
        User,
        blank=True,
        related_name='accessible_templates',
        verbose_name=_('Agents autorisés'),
        help_text=_('Utilisé uniquement si la visibilité est "Agents sélectionnés"')
    )
    
    # Metadata
    is_active = models.BooleanField(default=True, verbose_name=_('Actif'))
    downloads_count = models.IntegerField(default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1, verbose_name=_('Version'))
    
    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Modèle de Document')
        verbose_name_plural = _('Modèles de Documents')
        indexes = [
            models.Index(fields=['created_by', '-created_at']),
            models.Index(fields=['visibility', 'is_active']),
            models.Index(fields=['template_type']),
        ]
    
    def __str__(self):
        return f"{self.name} (v{self.version})"
    
    def save(self, *args, **kwargs):
        """Update file_size and file_type on save"""
        if self.file:
            self.file_size = self.file.size
            # Extract file extension and convert to uppercase
            ext = self.file.name.split('.')[-1].upper()
            # Map extensions to file types
            ext_map = {
                'PDF': 'PDF',
                'DOCX': 'DOCX', 'DOC': 'DOCX',
                'XLSX': 'XLSX', 'XLS': 'XLSX',
                'PPTX': 'PPTX', 'PPT': 'PPTX',
            }
            self.file_type = ext_map.get(ext, 'DOC')
        super().save(*args, **kwargs)
    
    def is_available_to_user(self, user):
        """Check if template is available to a specific user"""
        if not self.is_active:
            return False
        
        # Creator always has access
        if user == self.created_by:
            return True
        
        # Admin users always have access
        if user.role == 'ADMIN':
            return True
        
        # Check visibility level
        if self.visibility == 'ALL':
            return True
        
        if self.visibility == 'DEPARTMENT':
            # Check if user's department has access
            if hasattr(user, 'department'):
                return self.departments.filter(id=user.department.id).exists()
            return False
        
        if self.visibility == 'CUSTOM':
            return self.allowed_users.filter(id=user.id).exists()
        
        return False
    
    def get_download_url(self):
        """Get the URL for downloading this template"""
        if self.file:
            return self.file.url
        return None


class TemplateVersion(models.Model):
    """
    Keep track of template versions for audit and rollback purposes
    """
    template = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version_number = models.IntegerField()
    file = models.FileField(upload_to='template_versions/%Y/%m/%d/')
    changelog = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True
    )
    
    class Meta:
        ordering = ['-version_number']
        unique_together = ['template', 'version_number']
    
    def __str__(self):
        return f"{self.template.name} - v{self.version_number}"


class TemplateDownloadLog(models.Model):
    """
    Track template downloads for analytics
    """
    template = models.ForeignKey(
        DocumentTemplate,
        on_delete=models.CASCADE,
        related_name='download_logs'
    )
    user = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name='template_downloads'
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    
    class Meta:
        ordering = ['-downloaded_at']
