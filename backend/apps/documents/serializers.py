"""
Sérialiseurs pour les documents avec validation.
"""

from rest_framework import serializers
from django.core.exceptions import ValidationError
from apps.common.validators import DocumentValidator
from .models import Document, DocumentSpecification, DocumentValidationResult, DocumentTransfer, DocumentType
from .file_upload_validator import FileTypeValidator


class DocumentTypeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les types de documents."""
    
    allowed_formats_list = serializers.SerializerMethodField()
    required_columns_list = serializers.SerializerMethodField()
    
    def get_allowed_formats_list(self, obj):
        """Parse allowed_formats string to list."""
        if not obj.allowed_formats:
            return []
        return [f.strip() for f in obj.allowed_formats.split(',')]
    
    def get_required_columns_list(self, obj):
        """Parse required_columns string to list."""
        if not obj.required_columns:
            return []
        return [c.strip() for c in obj.required_columns.split(',')]
    
    class Meta:
        model = DocumentType
        fields = [
            'id',
            'name',
            'display_name',
            'description',
            'is_active',
            'icon',
            'color',
            'allowed_formats',
            'allowed_formats_list',
            'max_file_size_mb',
            'requires_excel',
            'excel_sheet_name',
            'required_columns',
            'required_columns_list',
            'max_rows',
            'requires_validation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'allowed_formats_list', 'required_columns_list']


class DocumentSpecificationSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les spécifications de documents."""
    
    allowed_formats_list = serializers.SerializerMethodField()
    required_columns_list = serializers.SerializerMethodField()
    
    class Meta:
        model = DocumentSpecification
        fields = [
            'id',
            'document_type',
            'display_name',
            'description',
            'allowed_formats',
            'allowed_formats_list',
            'requires_excel',
            'excel_sheet_name',
            'required_columns',
            'required_columns_list',
            'max_file_size_mb',
            'max_rows',
            'is_active',
            'requires_validation',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_allowed_formats_list(self, obj):
        """Retourne la liste des formats autorisés."""
        return obj.get_allowed_formats_list()
    
    def get_required_columns_list(self, obj):
        """Retourne la liste des colonnes requises."""
        return obj.get_required_columns_list()


class DocumentValidationResultSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les résultats de validation."""
    
    class Meta:
        model = DocumentValidationResult
        fields = [
            'id',
            'document',
            'status',
            'errors',
            'warnings',
            'validation_details',
            'validated_at',
        ]
        read_only_fields = ['id', 'validated_at']


class DocumentListSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la liste des documents."""
    
    agent_username = serializers.CharField(source='agent.matricule', read_only=True)
    agent_email = serializers.CharField(source='agent.email', read_only=True)
    agent_department = serializers.CharField(source='agent.department.name', read_only=True, allow_null=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True, allow_null=True)
    folder_path = serializers.SerializerMethodField()
    specification_display = serializers.SerializerMethodField()
    classification = serializers.SerializerMethodField()
    validation_status = serializers.SerializerMethodField()
    file_format = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'document_type',
            'status',
            'validation_status',
            'agent_username',
            'agent_email',
            'agent_department',
            'folder_name',
            'folder_path',
            'specification_display',
            'classification',
            'file_format',
            'file_size',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'file_size',
            'created_at',
            'updated_at',
        ]
    
    def get_file_format(self, obj):
        """Retourne le format du fichier extraits dynamiquement."""
        return obj.get_file_format()
    
    def get_specification_display(self, obj):
        """Retourne le nom d'affichage de la spécification."""
        if obj.specification and obj.specification.display_name:
            return obj.specification.display_name
        return None
    
    def get_folder_path(self, obj):
        """Retourne le chemin complet du dossier (hiérarchie).
        
        ✅ OPTIMISÉ: Utilise folder.get_full_path() qui a protection MAX_DEPTH
        Évite de réitérer la hiérarchie complètement pour chaque document.
        """
        if not obj.folder:
            return None
        
        # Utiliser la méthode du modèle Folder (déjà optimisée avec MAX_DEPTH=50)
        return obj.folder.get_full_path()
    
    def get_classification(self, obj):
        """Retourne la classification du document (folder ou specification)."""
        # Priorité 1: Folder si assigné
        if obj.folder and obj.folder.name:
            return obj.folder.name
        # Priorité 2: Specification display name
        elif obj.specification and obj.specification.display_name:
            return obj.specification.display_name
        # Priorité 3: Document type display
        else:
            return obj.document_type.display_name if obj.document_type else 'Unknown'
    
    def get_validation_status(self, obj):
        """Retourne le statut de validation."""
        if hasattr(obj, 'validation_result') and obj.validation_result:
            return obj.validation_result.status
        return 'Non validé'


class DocumentDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour un document unique."""
    
    agent_username = serializers.CharField(source='agent.matricule', read_only=True)
    agent_email = serializers.CharField(source='agent.email', read_only=True)
    agent_id = serializers.IntegerField(source='agent.id', read_only=True)
    folder_name = serializers.CharField(source='folder.name', read_only=True, allow_null=True)
    folder_path = serializers.SerializerMethodField()
    folder_id = serializers.IntegerField(source='folder.id', read_only=True, allow_null=True)
    specification = DocumentSpecificationSerializer(read_only=True)
    validation_result = DocumentValidationResultSerializer(read_only=True)
    routing_rule_name = serializers.CharField(source='routing_rule_applied.name', read_only=True, allow_null=True)
    file_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'description',
            'document_type',
            'file_url',
            'status',
            'agent_id',
            'agent_username',
            'agent_email',
            'folder_id',
            'folder_name',
            'folder_path',
            'specification',
            'validation_result',
            'rejection_reason',
            'file_size',
            'mime_type',
            'file_format',
            'excel_sheet_name',
            'excel_row_count',
            'excel_column_count',
            'routed_automatically',
            'routing_rule_name',
            'opened_at',
            'accepted_at',
            'rejected_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'id',
            'file_size',
            'mime_type',
            'created_at',
            'updated_at',
        ]
    
    def get_folder_path(self, obj):
        """Retourne le chemin complet du dossier (hiérarchie).
        
        ✅ OPTIMISÉ: Utilise folder.get_full_path() qui a protection MAX_DEPTH
        Évite de réitérer la hiérarchie complètement pour chaque document.
        """
        if not obj.folder:
            return None
        
        # Utiliser la méthode du modèle Folder (déjà optimisée avec MAX_DEPTH=50)
        return obj.folder.get_full_path()
    
    def get_file_url(self, obj):
        """Retourne l'URL du fichier si disponible."""
        request = self.context.get('request')
        if obj.file and request:
            return request.build_absolute_uri(obj.file.url)
        return None


class DocumentCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour la création de documents avec validation automatique.
    
    ✅ UTILISE DocumentValidator pour validation explicite du JSON.
    ✅ SUPPORTE la distribution aux destinataires (pôle/filiale/service) lors du téléchargement.
    """
    
    validation_details = serializers.SerializerMethodField(read_only=True)
    validation_errors = serializers.SerializerMethodField(read_only=True)
    validation_warnings = serializers.SerializerMethodField(read_only=True)
    validation_status = serializers.SerializerMethodField(read_only=True)
    file_type_validation = serializers.SerializerMethodField(read_only=True)
    folder_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    agent_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    # Accept integer or string (FormData sends strings) - convert to DocumentType on save
    document_type = serializers.IntegerField(
        required=True,
        help_text="ID du type de document"
    )
    
    # Champs pour la distribution du document au destinataire
    send_to_recipient = serializers.BooleanField(default=False, write_only=True, required=False)
    recipient_type = serializers.ChoiceField(
        choices=['pole', 'filiale', 'service', 'user'],
        required=False,
        allow_blank=True,
        write_only=True
    )
    recipient_pole_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    recipient_filiale_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    recipient_service_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    recipient_user_id = serializers.IntegerField(required=False, allow_null=True, write_only=True)
    
    class Meta:
        model = Document
        fields = [
            'id',
            'title',
            'file',
            'document_type',
            'description',
            'folder_id',
            'agent_id',
            'status',
            'validation_status',
            'validation_errors',
            'validation_warnings',
            'validation_details',
            'file_type_validation',
            'send_to_recipient',
            'recipient_type',
            'recipient_pole_id',
            'recipient_filiale_id',
            'recipient_service_id',
            'recipient_user_id',
        ]
        read_only_fields = ['id', 'status', 'validation_status', 'validation_errors', 'validation_warnings', 'validation_details', 'file_type_validation']
    
    def validate(self, data):
        """Valide les données de création avec DocumentValidator.
        
        ✅ UTILISE DocumentValidator.validate_document_create() pour validation centralisée.
        ✅ Valide également les données de destinataire si send_to_recipient=true.
        ✅ Convertit l'ID document_type en objet DocumentType APRÈS validation.
        """
        # Garder document_type comme int pour la validation (le validator l'utilise en recherche)
        document_type_id = data.get('document_type')
        
        # Préparer les données pour la validation (gardez l'ID pour le validateur)
        validation_data = {
            'title': data.get('title'),
            'document_type': document_type_id,  # Passer l'ID au validateur
            'description': data.get('description'),
            'file': data.get('file'),
        }
        
        # Utiliser le validator pour validation explicite
        try:
            DocumentValidator.validate_document_create(validation_data)
        except ValidationError as e:
            raise serializers.ValidationError(str(e))
        
        # MAINTENANT convertir l'ID document_type en objet DocumentType
        # FormData envoie toujours des strings, donc accepter int ou str
        if document_type_id:
            try:
                # Convertir en entier si c'est une string
                if isinstance(document_type_id, str):
                    document_type_id = int(document_type_id)
                # Récupérer l'objet DocumentType
                document_type_obj = DocumentType.objects.get(id=document_type_id, is_active=True)
                data['document_type'] = document_type_obj
            except (DocumentType.DoesNotExist, ValueError) as e:
                raise serializers.ValidationError(
                    {'document_type': f'Type de document invalide: {e}'}
                )
        
        # Valider les données de destinataire si applicables
        send_to_recipient = data.get('send_to_recipient', False)
        if send_to_recipient:
            recipient_type = data.get('recipient_type')
            
            if not recipient_type:
                raise serializers.ValidationError(
                    {'recipient_type': 'Type de destinataire requis si send_to_recipient est vrai.'}
                )
            
            # Valider que l'ID du destinataire correspond au type
            if recipient_type == 'pole':
                recipient_id = data.get('recipient_pole_id')
                if not recipient_id:
                    raise serializers.ValidationError(
                        {'recipient_pole_id': 'ID du pôle requis.'}
                    )
            elif recipient_type == 'filiale':
                recipient_id = data.get('recipient_filiale_id')
                if not recipient_id:
                    raise serializers.ValidationError(
                        {'recipient_filiale_id': 'ID de la filiale requis.'}
                    )
            elif recipient_type == 'service':
                recipient_id = data.get('recipient_service_id')
                if not recipient_id:
                    raise serializers.ValidationError(
                        {'recipient_service_id': 'ID du service requis.'}
                    )
            elif recipient_type == 'user':
                recipient_user_id = data.get('recipient_user_id')
                if not recipient_user_id:
                    raise serializers.ValidationError(
                        {'recipient_user_id': 'ID de l\'utilisateur requis.'}
                    )
                # Vérifier que l'utilisateur existe
                from apps.users.models import User
                try:
                    recipient_user = User.objects.get(id=recipient_user_id)
                except User.DoesNotExist:
                    raise serializers.ValidationError(
                        {'recipient_user_id': 'L\'utilisateur n\'existe pas.'}
                    )
                return data
            
            # Vérifier que le destinataire (Folder) existe pour pole/filiale/service
            from apps.folders.models import Folder
            try:
                folder = Folder.objects.get(id=recipient_id)
            except Folder.DoesNotExist:
                raise serializers.ValidationError(
                    {f'recipient_{recipient_type}_id': f'Le destinataire {recipient_type} n\'existe pas.'}
                )
        
        return data
    
    def validate_file(self, value):
        """Valide le fichier selon la configuration des types de fichiers."""
        if not value:
            return value
        
        # Valider avec le système de configuration de types de fichiers
        is_valid, error_message = FileTypeValidator.validate_file(value)
        
        if not is_valid:
            raise ValidationError(error_message or "Fichier invalide selon la configuration des types de fichiers")
        
        # Stocker le résultat de validation pour l'afficher dans la réponse
        value._file_type_validation = {
            'is_valid': True,
            'message': 'Fichier valide selon la configuration',
        }
        
        return value
    
    def create(self, validated_data):
        """Crée le document avec validation automatique et assigne le dossier optionnel.
        
        Si send_to_recipient=true, crée également un DocumentShare vers le destinataire.
        - Pour POLE/FILIALE/SERVICE: DocumentShare vers le dossier
        - Pour USER: Crée un dossier "Received" pour l'utilisateur et y place le document
        ✅ Utilise une transaction pour garantir la cohérence.
        """
        from .services import DocumentService
        from apps.folders.models import Folder
        from django.db import transaction
        from .models import DocumentShare
        from apps.users.models import User
        
        # Extraire les données de destinataire
        send_to_recipient = validated_data.pop('send_to_recipient', False)
        recipient_type = validated_data.pop('recipient_type', None)
        recipient_pole_id = validated_data.pop('recipient_pole_id', None)
        recipient_filiale_id = validated_data.pop('recipient_filiale_id', None)
        recipient_service_id = validated_data.pop('recipient_service_id', None)
        recipient_user_id = validated_data.pop('recipient_user_id', None)
        
        file_obj = validated_data['file']
        folder_id = validated_data.pop('folder_id', None)  # Extraire folder_id du frontend
        
        # Récupérer le résultat de validation de fichier s'il existe
        file_type_validation = None
        if hasattr(file_obj, '_file_type_validation'):
            file_type_validation = file_obj._file_type_validation
        
        # Créer le document + éventuellement le partage en transaction atomique
        with transaction.atomic():
            # Si destination est un utilisateur, créer/trouver le dossier "Received"
            if send_to_recipient and recipient_type == 'user' and recipient_user_id:
                recipient_user = User.objects.get(id=recipient_user_id)
                
                # Créer ou récupérer le dossier "Received" pour cet utilisateur
                received_folder_name = f'Received - {recipient_user.get_full_name() or recipient_user.username}'
                received_folder, created = Folder.objects.get_or_create(
                    owner=recipient_user,
                    folder_type='received_user',
                    defaults={
                        'name': received_folder_name,
                        'is_system_folder': True,
                        'description': f'Dossier de réception automatique pour {recipient_user.get_full_name() or recipient_user.username}',
                        'parent': None,  # C'est un dossier racine personnel
                    }
                )
                
                # Utiliser le dossier "Received" comme destination
                folder_id = received_folder.id
            elif send_to_recipient and recipient_type in ['pole', 'filiale', 'service']:
                # Pour les destinataires organisationnels, placer le document dans leur dossier
                recipient_id = {
                    'pole': recipient_pole_id,
                    'filiale': recipient_filiale_id,
                    'service': recipient_service_id,
                }.get(recipient_type)
                
                if recipient_id:
                    recipient_folder = Folder.objects.get(id=recipient_id)
                    # Placer le document dans le dossier du destinataire
                    folder_id = recipient_folder.id
            
            document, validation_result, is_valid = DocumentService.create_document_with_validation(
                title=validated_data['title'],
                file=file_obj,
                document_type=validated_data['document_type'],
                agent=self.context['request'].user,
                description=validated_data.get('description', ''),
                folder_id=folder_id,
                auto_validate=True,
                is_recipient_upload=send_to_recipient
            )
            
            # Si le document doit être envoyé à un destinataire, créer le DocumentShare
            if send_to_recipient and recipient_type:
                if recipient_type == 'user' and recipient_user_id:
                    # DocumentShare vers l'utilisateur
                    recipient_user = User.objects.get(id=recipient_user_id)
                    DocumentShare.objects.create(
                        document=document,
                        shared_by=self.context['request'].user,
                        share_type='USER',
                        shared_with=recipient_user,
                        permission='VIEW',
                        message=f'Document envoyé à {recipient_user.get_full_name() or recipient_user.username}'
                    )
                else:
                    # DocumentShare vers un dossier (pole/filiale/service)
                    recipient_id = {
                        'pole': recipient_pole_id,
                        'filiale': recipient_filiale_id,
                        'service': recipient_service_id,
                    }.get(recipient_type)
                    
                    if recipient_id:
                        recipient_folder = Folder.objects.get(id=recipient_id)
                        DocumentShare.objects.create(
                            document=document,
                            shared_by=self.context['request'].user,
                            share_type='FOLDER',
                            shared_with_folder=recipient_folder,
                            permission='VIEW',
                            message=f'Document envoyé à {recipient_folder.name}'
                        )
        
        # Stocker les détails de validation pour le sérializer
        if validation_result:
            document._validation_result = validation_result
        
        if file_type_validation:
            document._file_type_validation = file_type_validation
        
        return document
    
    def get_validation_errors(self, obj):
        """Retourne les erreurs de validation s'il y en a."""
        if hasattr(obj, '_validation_result') and obj._validation_result:
            return obj._validation_result.errors
        elif hasattr(obj, 'validation_result') and obj.validation_result:
            return obj.validation_result.errors
        return []
    
    def get_validation_warnings(self, obj):
        """Retourne les avertissements de validation s'il y en a."""
        if hasattr(obj, '_validation_result') and obj._validation_result:
            return obj._validation_result.warnings
        elif hasattr(obj, 'validation_result') and obj.validation_result:
            return obj.validation_result.warnings
        return []
    
    def get_validation_status(self, obj):
        """Retourne le statut de validation."""
        if hasattr(obj, '_validation_result') and obj._validation_result:
            return obj._validation_result.status
        elif hasattr(obj, 'validation_result') and obj.validation_result:
            return obj.validation_result.status
        return 'PENDING'
    
    def get_validation_details(self, obj):
        """Retourne les détails de validation."""
        if hasattr(obj, '_validation_result') and obj._validation_result:
            return obj._validation_result.validation_details
        elif hasattr(obj, 'validation_result') and obj.validation_result:
            return obj.validation_result.validation_details
        return {}
    
    def get_file_type_validation(self, obj):
        """Retourne le résultat de validation de type de fichier."""
        if hasattr(obj, '_file_type_validation'):
            return obj._file_type_validation
        return None


class FileTypeConfigurationSerializer(serializers.Serializer):
    """Sérialiseur pour les configurations de type de fichier."""
    
    id = serializers.IntegerField()
    file_type = serializers.CharField()
    display_name = serializers.CharField()
    description = serializers.CharField()
    max_file_size_mb = serializers.IntegerField()
    is_enabled = serializers.BooleanField()
    is_auto_validated = serializers.BooleanField()


class FileTypeRequirementSerializer(serializers.Serializer):
    """Sérialiseur pour les associations règle routage <-> types fichiers."""
    
    id = serializers.IntegerField()
    routing_rule_id = serializers.IntegerField()
    routing_rule_name = serializers.CharField(source='routing_rule.name', read_only=True)
    file_type_config_id = serializers.IntegerField()
    file_type_config = FileTypeConfigurationSerializer(source='file_type_config', read_only=True)
    max_file_size_mb = serializers.IntegerField(allow_null=True)
    is_required = serializers.BooleanField()
    effective_max_size = serializers.SerializerMethodField()
    
    def get_effective_max_size(self, obj):
        """Retourne la taille max effective."""
        return obj.get_effective_max_size()


class FileTypeRequirementCreateSerializer(serializers.Serializer):
    """Sérialiseur pour créer/éditer une association."""
    
    routing_rule_id = serializers.IntegerField()
    file_type_config_id = serializers.IntegerField()
    max_file_size_mb = serializers.IntegerField(allow_null=True, required=False)
    is_required = serializers.BooleanField(default=False)


class DocumentTransferSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les transfers de documents."""
    
    from_folder_name = serializers.CharField(source='from_folder.name', read_only=True, allow_null=True)
    to_folder_name = serializers.CharField(source='to_folder.name', read_only=True, allow_null=True)
    transferred_by_name = serializers.CharField(source='transferred_by.get_full_name', read_only=True, allow_null=True)
    transfer_type_display = serializers.CharField(source='get_transfer_type_display', read_only=True)
    document_name = serializers.CharField(source='document.name', read_only=True)
    
    class Meta:
        model = DocumentTransfer
        fields = [
            'id', 'document', 'document_name',
            'from_folder', 'from_folder_name',
            'to_folder', 'to_folder_name',
            'transferred_by', 'transferred_by_name',
            'transfer_type', 'transfer_type_display',
            'reason', 'transferred_at', 'notes'
        ]
        read_only_fields = ['id', 'transferred_at', 'transferred_by', 'from_folder']
