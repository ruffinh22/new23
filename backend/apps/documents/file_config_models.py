# FILE: backend/apps/documents/file_config_models.py
"""
Modèles pour la configuration des types de fichiers et leurs validations
"""

from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.utils import timezone
from apps.routing_rules.models import RoutingRule


class FileTypeConfiguration(models.Model):
    """Configuration des types de fichiers acceptés et leurs règles de validation"""
    
    FILE_TYPE_CHOICES = [
        # Documents
        ('pdf', 'PDF'),
        ('doc', 'Word (.doc)'),
        ('docx', 'Word (.docx)'),
        ('txt', 'Texte (.txt)'),
        
        # Excel - Formats modernes
        ('xlsx', 'Excel (.xlsx) - Moderne'),
        ('xlsm', 'Excel Macro (.xlsm)'),
        ('xltx', 'Template Excel (.xltx)'),
        ('xltm', 'Template Excel Macro (.xltm)'),
        
        # Excel - Formats anciens
        ('xls', 'Excel (.xls) - Ancien'),
        ('xlt', 'Template Excel ancien (.xlt)'),
        
        # Excel - Formats binaires
        ('xlsb', 'Excel Binaire (.xlsb)'),
        ('xlam', 'Add-in Excel (.xlam)'),
        
        # Données délimitées
        ('csv', 'CSV (Données délimitées)'),
        ('tsv', 'TSV (Tab délimité)'),
        
        # OpenDocument
        ('ods', 'OpenDocument Spreadsheet (.ods)'),
        
        # Autres
        ('image', 'Image (JPG, PNG, etc.)'),
        ('zip', 'Archive (ZIP)'),
    ]

    # Identification
    file_type = models.CharField(
        max_length=20, 
        choices=FILE_TYPE_CHOICES, 
        unique=True,
        help_text="Type de fichier (extension)"
    )
    display_name = models.CharField(
        max_length=100,
        help_text="Nom d'affichage du type de fichier"
    )
    description = models.TextField(
        blank=True,
        help_text="Description du type de fichier"
    )

    # Restrictions de taille
    max_file_size_mb = models.PositiveIntegerField(
        default=50,
        validators=[MinValueValidator(1), MaxValueValidator(5000)],
        help_text="Taille maximale du fichier en MB"
    )
    min_file_size_kb = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Taille minimale du fichier en KB"
    )

    # Restrictions pour feuilles de calcul (Excel, CSV, ODS, etc.)
    max_rows = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(1000000)],
        help_text="Nombre maximum de lignes (pour les feuilles de calcul)"
    )
    max_columns = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(16384)],
        help_text="Nombre maximum de colonnes (pour les feuilles de calcul)"
    )
    max_sheets = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Nombre maximum de feuilles (pour les classeurs)"
    )

    # Restrictions pour documents
    max_pages = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        help_text="Nombre maximum de pages (pour les documents)"
    )

    # Restrictions pour images
    max_width_px = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Largeur maximale en pixels (pour les images)"
    )
    max_height_px = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Hauteur maximale en pixels (pour les images)"
    )
    min_width_px = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Largeur minimale en pixels (pour les images)"
    )
    min_height_px = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Hauteur minimale en pixels (pour les images)"
    )

    # Restrictions additionnelles
    require_macros_disabled = models.BooleanField(
        default=False,
        help_text="Les macros doivent être désactivées"
    )
    require_no_password = models.BooleanField(
        default=False,
        help_text="Le fichier ne doit pas être protégé par mot de passe"
    )
    allow_external_links = models.BooleanField(
        default=True,
        help_text="Les liens externes sont autorisés"
    )
    require_utf8_encoding = models.BooleanField(
        default=False,
        help_text="L'encodage UTF-8 est obligatoire"
    )

    # Métadonnées personnalisées
    allowed_sheets = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des noms de feuilles autorisées (vide = toutes autorisées)"
    )
    forbidden_columns = models.JSONField(
        default=list,
        blank=True,
        help_text="Colonnes interdites par nom ou index"
    )
    required_columns = models.JSONField(
        default=list,
        blank=True,
        help_text="Colonnes obligatoires"
    )

    # Status
    is_enabled = models.BooleanField(
        default=True,
        help_text="Ce type de fichier est accepté"
    )
    is_auto_validated = models.BooleanField(
        default=True,
        help_text="Valider automatiquement lors de l'upload"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        'users.User',
        on_delete=models.PROTECT,
        related_name='created_file_configs',
        null=True,
        blank=True
    )

    class Meta:
        db_table = 'file_type_configurations'
        verbose_name = 'Configuration Type Fichier'
        verbose_name_plural = 'Configurations Types Fichiers'
        ordering = ['file_type']

    def __str__(self):
        return f"{self.display_name} ({self.file_type})"

    def to_dict(self):
        """Convertir en dictionnaire pour les validations"""
        return {
            'file_type': self.file_type,
            'display_name': self.display_name,
            'max_file_size_mb': self.max_file_size_mb,
            'min_file_size_kb': self.min_file_size_kb,
            'max_rows': self.max_rows,
            'max_columns': self.max_columns,
            'max_sheets': self.max_sheets,
            'max_pages': self.max_pages,
            'max_width_px': self.max_width_px,
            'max_height_px': self.max_height_px,
            'min_width_px': self.min_width_px,
            'min_height_px': self.min_height_px,
            'require_macros_disabled': self.require_macros_disabled,
            'require_no_password': self.require_no_password,
            'allow_external_links': self.allow_external_links,
            'require_utf8_encoding': self.require_utf8_encoding,
            'allowed_sheets': self.allowed_sheets,
            'forbidden_columns': self.forbidden_columns,
            'required_columns': self.required_columns,
            'is_enabled': self.is_enabled,
        }


class FileTypeRequirement(models.Model):
    """
    Association entre une règle de routage et les types de fichiers autorisés.
    
    Exemple: 
    - RH + Congé → Accepte PDF, DOCX (max 10MB)
    - IT + Rapport → Accepte XLSX, CSV (max 50MB)
    """
    
    routing_rule = models.ForeignKey(
        RoutingRule,
        on_delete=models.CASCADE,
        related_name='file_type_requirements',
        help_text="Règle de routage associée"
    )
    
    file_type_config = models.ForeignKey(
        FileTypeConfiguration,
        on_delete=models.CASCADE,
        related_name='routing_requirements',
        help_text="Type de fichier autorisé pour cette règle"
    )
    
    # Contraintes optionnelles spécifiques à cette règle
    max_file_size_mb = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Taille max pour cette combinaison (remplace la config générale si défini)"
    )
    
    # Status
    is_required = models.BooleanField(
        default=False,
        help_text="Ce type de fichier est obligatoire pour cette règle (au moins un parmi les required)"
    )
    
    # Métadonnées
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'file_type_requirements'
        verbose_name = 'Exigence Type Fichier'
        verbose_name_plural = 'Exigences Types Fichiers'
        unique_together = ('routing_rule', 'file_type_config')
        ordering = ['routing_rule', 'file_type_config']
    
    def __str__(self):
        return f"{self.routing_rule.name} → {self.file_type_config.display_name}"
    
    def get_effective_max_size(self):
        """Retourne la taille max effective (spécifique ou générale)"""
        if self.max_file_size_mb:
            return self.max_file_size_mb
        return self.file_type_config.max_file_size_mb
