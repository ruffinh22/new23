"""
Service pour la gestion des documents et leur validation.
"""

from django.db import transaction
from django.utils import timezone
from .models import Document, DocumentValidationResult, DocumentSpecification, DocumentType
from .validators import ValidationService
from .file_upload_validator import FileTypeValidator
from apps.folders.models import Folder


class DocumentService:
    """Service pour gérer les documents avec validation."""
    
    @staticmethod
    def organize_with_hierarchy(folder=None, agent=None, document_type: 'DocumentType' = None, is_recipient_upload: bool = False):
        """
        Organise le document dans la hiérarchie.
        
        Mode normal (is_recipient_upload=False):
          Filiale > Service (agent) > Type Doc
        
        Mode destinataire (is_recipient_upload=True):
          Filiale/Service/Pole (destinataire) > Type Doc (sans service de l'agent)
        
        Crée automatiquement les dossiers manquants.
        
        ✅ VALIDATION: Vérifie que la Filiale est du bon Pôle de l'agent
        
        Args:
            folder: Dossier Filiale/Service/Pole de base
            agent: Utilisateur qui upload (pour accéder au Service et Pôle)
            document_type: Type de document (pour créer le dossier spécifique)
            is_recipient_upload: True si c'est un envoi à destinataire (skip agent's service)
        
        Returns:
            Le dossier où placer le document
        """
        if not folder:
            return None
        
        # ✅ VALIDATION: Vérifier que la Filiale est dans le BON Pôle
        # (Sauf si c'est un envoi à destinataire, où la destination est explicitement choisie)
        if agent and agent.pole and not is_recipient_upload:
            # La filiale doit avoir le même Pôle parent que l'agent
            # folder.parent = folder du Pôle (parent du parent est None pour une filiale racine)
            folder_pole_id = folder.parent_id if folder.parent else None
            
            if folder_pole_id != agent.pole_id:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(
                    f"⚠️ Mismatch Pôle détecté!"
                    f"\n  Filiale {folder.name} (ID:{folder.id}) Pôle parent: {folder_pole_id}"
                    f"\n  Agent {agent.matricule} Pôle: {agent.pole_id}"
                    f"\n  Correction: chercher le bon dossier..."
                )
                # Chercher le bon dossier avec le même nom mais du bon Pôle
                try:
                    pole_folder = agent.pole
                    correct_filiale = Folder.objects.get(
                        name=folder.name,
                        parent=pole_folder,
                        folder_type='filiale'
                    )
                    folder = correct_filiale
                    logger.info(f"✅ Filiale corrigée: {folder.name} (ID:{folder.id}) du Pôle {pole_folder.name}")
                except Folder.DoesNotExist:
                    logger.error(f"❌ Impossible de trouver la filiale {folder.name} du Pôle {agent.pole.name}")
                    pass  # Continuer avec le folder actuel
        
        # Dossier courant = Filiale
        current_folder = folder
        
        # 1️⃣ Service (si l'agent en a un assigné ET si ce n'est PAS un envoi à destinataire)
        # Quand on envoie à un destinataire, la hiérarchie est déjà correcte (Pole/Filiale/Service)
        # On ne doit pas ajouter le service de l'agent
        if agent and agent.department and not is_recipient_upload and folder.folder_type in ['filiale', 'pole']:
            service_name = agent.department.name
            # ✅ Chercher le dossier service (peu importe son type actuuel)
            try:
                service_folder = Folder.objects.get(name=service_name, parent=current_folder)
                # Si le type est incorrect, le mettre à jour
                if service_folder.folder_type != 'service':
                    service_folder.folder_type = 'service'
                    service_folder.save()
            except Folder.DoesNotExist:
                # Créer le dossier service
                service_folder = Folder.objects.create(
                    name=service_name,
                    parent=current_folder,
                    folder_type='service',
                    description=f'Service: {service_name}'
                )
            current_folder = service_folder
        
        # 2️⃣ Dossier Type de Document
        if document_type:
            # Récupérer le libellé du type (document_type est maintenant une instance DocumentType)
            type_label = document_type.display_name if hasattr(document_type, 'display_name') else str(document_type)
            
            # ✅ Chercher le dossier type (peu importe son type actuel)
            try:
                type_folder = Folder.objects.get(name=type_label, parent=current_folder)
                # Si le type est incorrect, le mettre à jour
                if type_folder.folder_type != 'section':
                    type_folder.folder_type = 'section'
                    type_folder.save()
            except Folder.DoesNotExist:
                # Créer le dossier type
                type_folder = Folder.objects.create(
                    name=type_label,
                    parent=current_folder,
                    folder_type='section',
                    description=f'Type: {type_label}'
                )
            current_folder = type_folder
        
        return current_folder
    
    @staticmethod
    def create_document_with_validation(
        title: str,
        file,
        document_type: 'DocumentType',
        agent,
        folder=None,
        folder_id=None,
        description: str = "",
        auto_validate: bool = True,
        is_recipient_upload: bool = False
    ) -> tuple:
        """
        Crée un document et lance la validation.
        
        Si un dossier est fourni, le document est automatiquement organisé
        dans une structure Année/Mois.
        
        Si aucun dossier n'est fourni, essaie de déterminer le dossier automatiquement
        via les routing rules basées sur l'agent et le type de document.
        
        Returns:
            Tuple (document, validation_result, is_valid)
        """
        
        # Récupérer la spécification du type de document
        try:
            specification = DocumentSpecification.objects.get(document_type=document_type)
        except DocumentSpecification.DoesNotExist:
            specification = None
        
        # Si folder_id est fourni, l'utiliser
        if folder_id and not folder:
            try:
                from apps.folders.models import Folder
                candidate_folder = Folder.objects.get(id=folder_id)
                
                # ✅ VALIDATION: Vérifier que le dossier est du bon Pôle
                # (Sauf si c'est un envoi à destinataire, où la destination est explicitement choisie)
                if agent and agent.pole and not is_recipient_upload:
                    # Déterminer le Pôle du dossier
                    folder_pole_id = candidate_folder.parent_id if candidate_folder.parent else None
                    
                    # Si c'est une sous-structure (Service/Type), remonter jusqu'à la Filiale
                    if candidate_folder.folder_type not in ['pole', 'filiale']:
                        # Chercher le parent Filiale
                        temp = candidate_folder.parent
                        while temp and temp.folder_type != 'filiale':
                            temp = temp.parent
                        if temp:
                            folder_pole_id = temp.parent_id
                    
                    # Vérifier que c'est du bon Pôle
                    if folder_pole_id != agent.pole_id:
                        import logging
                        logger = logging.getLogger(__name__)
                        logger.warning(
                            f"⚠️ Dossier {candidate_folder.name} (ID:{folder_id}) du mauvais Pôle!"
                            f"\n  Folder Pôle: {folder_pole_id}, Agent Pôle: {agent.pole_id}"
                            f"\n  Utilisation de la Filiale de l'agent à la place"
                        )
                        # Ne pas utiliser ce dossier, laisser folder = None pour utiliser la branche de l'agent
                    else:
                        folder = candidate_folder
                else:
                    folder = candidate_folder
            except Folder.DoesNotExist:
                pass  # Continuer sans
        
        # Si aucun dossier n'est fourni, utiliser la filiale de l'agent par défaut
        if folder is None:
            if agent and agent.branch:
                folder = agent.branch
        
        # ✅ Construire la hiérarchie: Pole > Filiale > Service > Type Doc
        # ou si c'est une envoi à destinataire: Filiale/Service destinataire > Type Doc (sans service de l'agent)
        # Si l'agent a un Service assigné, créer la structure complète
        organized_folder = DocumentService.organize_with_hierarchy(
            folder=folder,
            agent=agent,
            document_type=document_type,
            is_recipient_upload=is_recipient_upload
        )
        
        # Créer le document avec le statut d'attente de validation
        with transaction.atomic():
            document = Document.objects.create(
                title=title,
                file=file,
                document_type=document_type,
                agent=agent,
                folder=organized_folder,  # Structure hiérarchique: Filiale > Service > Type Doc
                description=description,
                specification=specification,
                status='VALIDATION_EN_COURS',
                file_size=file.size if file else 0,
                file_format=DocumentService._get_file_format(file),
                mime_type=file.content_type if file else '',
            )
            
            # Lancer la validation si demandée
            if auto_validate and specification and specification.requires_validation:
                is_valid, validation_data = ValidationService.validate_document(file, specification)
                
                # Créer le résultat de validation
                validation_result = DocumentValidationResult.objects.create(
                    document=document,
                    status=validation_data['status'],
                    errors=validation_data['errors'],
                    warnings=validation_data['warnings'],
                    validation_details=validation_data['details'],
                )
                
                # Mettre à jour le statut du document
                if is_valid:
                    document.status = 'EN_ATTENTE'  # En attente de traitement
                    document.is_validated = True
                else:
                    document.status = 'REJETE'
                    document.rejection_reason = '; '.join(validation_data['errors'])
                    document.is_validated = False
                
                document.save()
                
                return document, validation_result, is_valid
            else:
                # Pas de spécification ou pas de validation requise
                document.status = 'EN_ATTENTE'
                document.is_validated = True
                document.save()
                
                return document, None, True
    
    @staticmethod
    def pre_validate_file(document_file, specification) -> tuple:
        """
        Prévalide un fichier sans créer un document.
        Utile pour vérifier les fichiers avant upload définitif.
        
        Returns:
            Tuple (is_valid, validation_data)
        """
        is_valid, validation_data = ValidationService.validate_document(document_file, specification)
        return is_valid, validation_data
    
    @staticmethod
    def validate_existing_document(document: Document) -> tuple:
        """
        Valide un document existant.
        
        Returns:
            Tuple (is_valid, validation_result)
        """
        if not document.file:
            return False, None
        
        if not document.specification or not document.specification.requires_validation:
            return True, None
        
        # Ouvrir le fichier pour la validation
        with document.file.open('rb') as f:
            is_valid, validation_data = ValidationService.validate_document(f, document.specification)
        
        # Mettre à jour ou créer le résultat de validation
        validation_result, created = DocumentValidationResult.objects.update_or_create(
            document=document,
            defaults={
                'status': validation_data['status'],
                'errors': validation_data['errors'],
                'warnings': validation_data['warnings'],
                'validation_details': validation_data['details'],
            }
        )
        
        # Mettre à jour le statut du document
        if is_valid:
            document.status = 'EN_ATTENTE'
            document.is_validated = True
        else:
            document.status = 'REJETE'
            document.rejection_reason = '; '.join(validation_data['errors'])
            document.is_validated = False
        
        document.save()
        
        return is_valid, validation_result
    
    @staticmethod
    def approve_document(document: Document, approved_by) -> bool:
        """Approuve un document validé."""
        if not document.is_validated or document.status == 'REJETE':
            return False
        
        document.status = 'VALIDE'
        document.validated_by = approved_by
        document.validated_at = timezone.now()
        document.save()
        
        return True
    
    @staticmethod
    def reject_document(document: Document, reason: str, rejected_by) -> bool:
        """Rejette un document."""
        document.status = 'REJETE'
        document.rejection_reason = reason
        document.is_validated = False
        document.validated_by = rejected_by
        document.validated_at = timezone.now()
        document.save()
        
        return True
    
    @staticmethod
    def _get_file_format(file) -> str:
        """Extrait le format du fichier."""
        if not file:
            return ''
        filename = file.name
        return filename.split('.')[-1].lower()
    
    @staticmethod
    def validate_file_type_config(file) -> tuple:
        """
        Valide un fichier selon les configurations de types de fichiers.
        
        Returns:
            Tuple (is_valid, error_message)
        """
        return FileTypeValidator.validate_file(file)


class DocumentFilterService:
    """✅ SERVICE: Centralise la logique de filtrage des documents.
    
    Élimine la logique métier du DocumentViewSet.list().
    Fournit une interface propre pour filtrer les documents selon:
    - Permissions utilisateur (admin vs user)
    - Statut
    - Type
    - Date
    - Département
    - Dossier
    """
    
    def __init__(self, user):
        """Initialise le service avec l'utilisateur.
        
        Args:
            user: User object (pour les permissions)
        """
        self.user = user
        self.is_admin = self._check_admin()
    
    def _check_admin(self) -> bool:
        """Vérifie si l'utilisateur est admin (single source of truth)."""
        if not self.user or not self.user.is_authenticated:
            return False
        return (
            self.user.is_staff or 
            self.user.is_superuser or 
            (hasattr(self.user, 'role') and self.user.role == 'ADMIN')
        )
    
    def get_accessible_documents(self):
        """Retourne les documents accessibles pour cet utilisateur.
        
        Logique:
        - Admin → tous les documents
        - User → ses propres documents
        
        Returns:
            QuerySet: Documents filtrés + optimisés (select_related, prefetch_related)
        """
        from django.db.models import Prefetch
        
        if self.is_admin:
            queryset = Document.objects.all()
        else:
            queryset = Document.objects.filter(agent=self.user)
        
        # ✅ OPTIMISATION: Pré-charger les relations pour éviter N+1
        return queryset.select_related(
            'agent__department',
            'folder',
            'specification',
            'routing_rule_applied',
            'validation_result'
        ).prefetch_related(
            'folder__parent__parent__parent__parent__parent'  # Hiérarchie jusqu'à 6 niveaux
        )
    
    def apply_filters(self, queryset, filters: dict):
        """Applique tous les filtres à un queryset.
        
        Args:
            queryset: QuerySet initial
            filters: Dict des filtres à appliquer
                - agent: 'me' | 'all' (pour admins seulement)
                - status: statut du document
                - document_type: type de document
                - department_id: ID du département
                - folder_id: ID du dossier
                - created_after: date min (YYYY-MM-DD)
                - created_before: date max (YYYY-MM-DD)
                - search: recherche texte (title, description)
        
        Returns:
            QuerySet: Queryset filtré
        """
        from django.db.models import Q
        
        # Filtre agent (override pour les admins)
        agent_filter = filters.get('agent')
        if agent_filter == 'me':
            queryset = queryset.filter(agent=self.user)
        elif agent_filter == 'all' and not self.is_admin:
            # Les non-admins ne peuvent pas demander "tous"
            queryset = queryset.filter(agent=self.user)
        
        # Filtres simples
        if filters.get('status'):
            queryset = queryset.filter(status=filters['status'])
        
        if filters.get('document_type'):
            queryset = queryset.filter(document_type=filters['document_type'])
        
        if filters.get('department_id'):
            queryset = queryset.filter(agent__department_id=filters['department_id'])
        
        if filters.get('folder_id'):
            queryset = queryset.filter(folder_id=filters['folder_id'])
        
        # Plage de dates
        if filters.get('created_after'):
            queryset = queryset.filter(created_at__gte=filters['created_after'])
        
        if filters.get('created_before'):
            queryset = queryset.filter(created_at__lte=filters['created_before'])
        
        # Recherche texte
        if filters.get('search'):
            search = filters['search']
            queryset = queryset.filter(
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset
    
    def get_filtered_documents(self, filters: dict = None):
        """Méthode pratique: récupère + filtre en une seule appelée.
        
        Args:
            filters: Dict des filtres (voir apply_filters)
        
        Returns:
            QuerySet: Documents filtrés et optimisés
        """
        filters = filters or {}
        queryset = self.get_accessible_documents()
        return self.apply_filters(queryset, filters)
