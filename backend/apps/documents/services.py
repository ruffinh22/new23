"""
Service pour la gestion des documents et leur validation.
"""

from django.db import transaction
from django.utils import timezone
from .models import Document, DocumentValidationResult, DocumentSpecification
from .validators import ValidationService
from .file_upload_validator import FileTypeValidator
from apps.folders.models import Folder


class DocumentService:
    """Service pour gérer les documents avec validation."""
    
    MONTHS_FR = {
        1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
        5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
        9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
    }
    
    @staticmethod
    def organize_document_folder(folder=None, created_at=None):
        """
        Organise le classement du document dans une hiérarchie Année/Mois.
        
        Si un dossier est fourni, crée une structure Année/Mois en dessous.
        
        Args:
            folder: Dossier parent (optionnel)
            created_at: Date de création (défaut: maintenant)
        
        Returns:
            Le dossier Mois où classer le document
        """
        if not folder:
            return None
        
        if not created_at:
            created_at = timezone.now()
        
        year = str(created_at.year)
        month_num = created_at.month
        month_name = DocumentService.MONTHS_FR.get(month_num, f'Mois {month_num}')
        
        # Créer ou récupérer le dossier Année
        year_folder, _ = Folder.objects.get_or_create(
            name=year,
            parent=folder,
            defaults={'description': f'Documents de l\'année {year}'}
        )
        
        # Créer ou récupérer le dossier Mois
        month_folder, _ = Folder.objects.get_or_create(
            name=month_name,
            parent=year_folder,
            defaults={'description': f'Documents de {month_name} {year}'}
        )
        
        return month_folder
    
    @staticmethod
    def create_document_with_validation(
        title: str,
        file,
        document_type: str,
        agent,
        folder=None,
        description: str = "",
        auto_validate: bool = True
    ) -> tuple:
        """
        Crée un document et lance la validation.
        
        Si un dossier est fourni, le document est automatiquement organisé
        dans une structure Année/Mois.
        
        Returns:
            Tuple (document, validation_result, is_valid)
        """
        
        # Récupérer la spécification du type de document
        try:
            specification = DocumentSpecification.objects.get(document_type=document_type)
        except DocumentSpecification.DoesNotExist:
            specification = None
        
        # Organiser le dossier avec la structure Année/Mois
        organized_folder = DocumentService.organize_document_folder(folder)
        
        # Créer le document avec le statut d'attente de validation
        with transaction.atomic():
            document = Document.objects.create(
                title=title,
                file=file,
                document_type=document_type,
                agent=agent,
                folder=organized_folder,  # Utiliser le dossier organisé (Année/Mois)
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
