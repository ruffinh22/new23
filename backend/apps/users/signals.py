"""
Signals pour les modèles Branch et Department.
Crée automatiquement les dossiers quand une branche ou un département est créé.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Branch, Department
from apps.folders.models import Folder
import logging

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Branch)
def create_branch_folder(sender, instance, created, **kwargs):
    """
    Crée automatiquement un dossier racine pour la filiale quand elle est créée.
    
    Structure:
    - Branche (à la racine du système de dossiers)
      └── Département 1
      └── Département 2
    """
    if not created:
        return
    
    # Si la branche a déjà un dossier, ne rien faire
    if instance.folder:
        logger.info(f"✓ Branche {instance.name}: Dossier existant ({instance.folder.name})")
        return
    
    try:
        # Créer le dossier racine de la branche (à la racine du système, parent=None)
        folder = Folder.objects.create(
            name=instance.name,
            description=f"Dossier racine de la filiale {instance.name} ({instance.code})",
            created_by=None,
            parent=None,  # À la racine
            is_active=True
        )
        
        # Associer le dossier à la branche
        instance.folder = folder
        instance.save(update_fields=['folder'])
        
        logger.info(f"✅ Branche créée: {instance.name} ({instance.code})")
        logger.info(f"   └─ Dossier racine créé: {folder.name} (ID: {folder.id})")
    
    except Exception as e:
        logger.error(f"❌ Erreur création dossier pour branche {instance.name}: {str(e)}")


@receiver(post_save, sender=Department)
def create_department_folder(sender, instance, created, **kwargs):
    """
    Crée automatiquement un dossier racine pour le département quand il est créé.
    
    Le dossier devient le parent pour tous les types de documents du département.
    Structure:
    - Si department.branch existe: Branche → Département (sous la branche)
    - Si pas de branche: Département (à la racine)
    """
    if not created:
        return
    
    # Si le département a déjà un dossier, ne rien faire
    if instance.folder:
        logger.info(f"✓ Département {instance.name}: Dossier existant ({instance.folder.name})")
        return
    
    try:
        # Déterminer le parent du dossier (le dossier de la branche si elle existe)
        parent_folder = None
        if instance.branch and instance.branch.folder:
            parent_folder = instance.branch.folder
            logger.info(f"📁 Parent trouvé: {parent_folder.name} (Branche)")
        
        # Créer le dossier racine du département
        folder = Folder.objects.create(
            name=instance.name,
            description=f"Dossier racine du département {instance.name}",
            created_by=None,
            parent=parent_folder,  # Peut être None si pas de branche
            is_active=True
        )
        
        # Associer le dossier au département
        instance.folder = folder
        instance.save(update_fields=['folder'])
        
        logger.info(f"✅ Département créé: {instance.name} ({instance.code})")
        logger.info(f"   └─ Dossier créé: {folder.name} (ID: {folder.id})")
        if parent_folder:
            logger.info(f"   └─ Parent: {parent_folder.name}")
    
    except Exception as e:
        logger.error(f"❌ Erreur création dossier pour {instance.name}: {str(e)}")
