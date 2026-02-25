from django.db import models
from django.conf import settings


class Folder(models.Model):
    """Modèle unifié pour toute la hiérarchie organisationnelle.
    
    Structure:
    - Niveau 0 (root, parent=None): Type 'pole' (Pôle)
    - Niveau 1 (parent=pole): Type 'filiale' (Filiale)
    - Niveau 2 (parent=filiale): Type 'service' (Service)
    - Niveau 3+ (parent=service): Type 'sub_service' (Sous-service)
    """
    
    FOLDER_TYPES = [
        ('pole', 'Pôle'),
        ('filiale', 'Filiale'),
        ('service', 'Service'),
        ('sub_service', 'Sous-service'),
        ('year', 'Année'),
        ('month', 'Mois'),
        ('received_user', 'Reçu par utilisateur'),  # Nouveau type pour dossiers personnels Received
        # Anciens types (deprecated, pour compatibilité)
        ('branch', 'Filiale (legacy)'),
        ('department', 'Département (legacy)'),
        ('section', 'Section (legacy)'),
    ]
    
    # Hiérarchie de base
    name = models.CharField(max_length=255, db_index=True)
    parent = models.ForeignKey(
        'self',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='children'
    )
    
    # Type structurel
    folder_type = models.CharField(
        max_length=20,
        choices=FOLDER_TYPES,
        default='section',
        help_text='Type de dossier: Filiale, Département, ou Section'
    )
    
    # Identifiants (codes uniques)
    code = models.CharField(
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text='Code unique (ex: BEN pour Bénin)'
    )
    country_code = models.CharField(
        max_length=2,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        help_text='Code ISO-2 (ex: BJ pour Bénin). Unique uniquement pour les branches.'
    )
    
    # Description
    description = models.TextField(blank=True)
    
    # Dossiers système (created_by vs owner)
    is_system_folder = models.BooleanField(
        default=False,
        help_text='Dossier système créé automatiquement (ex: Received pour utilisateur)'
    )
    owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='owned_folders',
        help_text='Propriétaire du dossier (pour les dossiers personnels comme Received)'
    )
    
    # Métadonnées
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_folders'
    )
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    
    class Meta:
        db_table = 'folders'
        verbose_name = 'Dossier'
        verbose_name_plural = 'Dossiers'
        ordering = ['folder_type', 'name']
        unique_together = [['name', 'parent']]
        indexes = [
            models.Index(fields=['parent', 'is_active'], name='folder_parent_active_idx'),
            models.Index(fields=['folder_type', 'is_active'], name='folder_type_active_idx'),
            models.Index(fields=['code'], name='folder_code_idx'),
        ]
    
    def __str__(self):
        return self.get_full_path()
    
    def get_full_path(self):
        """Retourne le chemin complet du dossier.
        
        Exemple: "Bénin / Commercial / Ventes"
        """
        path_parts = [self.name]
        parent = self.parent
        MAX_DEPTH = 50
        visited = set([self.id])
        
        while parent and len(path_parts) < MAX_DEPTH:
            if parent.id in visited:
                # Boucle détectée
                break
            visited.add(parent.id)
            path_parts.insert(0, parent.name)
            parent = parent.parent
        
        return ' / '.join(path_parts)
    
    def get_level(self):
        """Retourne le niveau de profondeur du dossier (0=root)."""
        level = 0
        parent = self.parent
        MAX_DEPTH = 50
        visited = set()
        
        while parent and level < MAX_DEPTH:
            if parent.id in visited:
                break
            visited.add(parent.id)
            level += 1
            parent = parent.parent
        return level
    
    @property
    def auto_type(self):
        """Auto-détermine le type basé sur la profondeur (nouveau schéma).
        
        Niveau 0 (root) = pole
        Niveau 1 = filiale
        Niveau 2 = service
        Niveau 3+ = sub_service
        """
        level = self.get_level()
        if level == 0:
            return 'pole'
        elif level == 1:
            return 'filiale'
        elif level == 2:
            return 'service'
        else:
            return 'sub_service'
    
    def get_ancestors(self):
        """Retourne tous les dossiers parents (du plus proche au plus lointain)."""
        ancestors = []
        parent = self.parent
        MAX_DEPTH = 50
        visited = set()
        
        while parent:
            if parent.id in visited:
                break
            visited.add(parent.id)
            ancestors.insert(0, parent)
            parent = parent.parent
            
            if len(ancestors) > MAX_DEPTH:
                break
        return ancestors
    
    def get_descendants(self):
        """Retourne tous les sous-dossiers récursivement."""
        descendants = list(self.children.all())
        for child in self.children.all():
            descendants.extend(child.get_descendants())
        return descendants
    
    def get_descendants_ids(self):
        """Retourne les IDs de tous les sous-dossiers récursivement."""
        descendants = []
        for child in self.children.all():
            descendants.append(child.id)
            descendants.extend(child.get_descendants_ids())
        return descendants
    
    def get_all_children_ids(self):
        """Retourne TOUS les IDs des enfants (récursif, incluant self)."""
        all_ids = set([self.id])
        
        def collect_ids(folder):
            for child in folder.children.all():
                all_ids.add(child.id)
                collect_ids(child)
        
        collect_ids(self)
        return all_ids
