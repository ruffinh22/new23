from rest_framework import serializers
from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    """✅ Sérialiseur UNIFIÉ pour tous les types de Folder.
    
    Consolidé: Remplace FolderBranchSerializer, FolderPoleSerializer, FolderServiceSerializer.
    Ajoute dynamiquement les champs pertinents selon le type (pole, filiale, service, sub_service).
    
    Validation:
    - folder_type: doit être pole|filiale|service|sub_service
    - name: 2-255 caractères
    """
    
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    parent_type = serializers.CharField(source='parent.folder_type', read_only=True, allow_null=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    level = serializers.IntegerField(source='get_level', read_only=True)
    auto_type = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    children_count = serializers.SerializerMethodField()
    
    # Champs dynamiques selon le type
    filiales_count = serializers.SerializerMethodField()
    services_count = serializers.SerializerMethodField()
    sous_services_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'folder_type', 'code', 'country_code',
            'parent', 'parent_name', 'parent_type', 'description',
            'full_path', 'level', 'auto_type', 'children_count',
            'filiales_count', 'services_count', 'sous_services_count',
            'is_active', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_path', 'level', 'auto_type', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'code': {'required': False, 'allow_null': True},
            'country_code': {'required': False, 'allow_null': True},
        }
    
    def validate_folder_type(self, value):
        """Valide que folder_type est une valeur acceptée."""
        valid_types = ['pole', 'filiale', 'service', 'sub_service']
        if value not in valid_types:
            raise serializers.ValidationError(
                f"Invalid folder_type. Must be one of: {valid_types}"
            )
        return value
    
    def validate_name(self, value):
        """Valide que name a 2-255 caractères."""
        if len(value) < 2 or len(value) > 255:
            raise serializers.ValidationError(
                "Name must be between 2 and 255 characters"
            )
        return value
    
    def get_children_count(self, obj):
        """Nombre total d'enfants directs."""
        return obj.children.filter(is_active=True).count()
    
    def get_filiales_count(self, obj):
        """Filiales (pour poles): retourne le nombre, None sinon."""
        if obj.folder_type == 'pole':
            return obj.children.filter(folder_type='filiale', is_active=True).count()
        return None
    
    def get_services_count(self, obj):
        """Services (pour filiales): retourne le nombre, None sinon."""
        if obj.folder_type == 'filiale':
            return obj.children.filter(folder_type='service', is_active=True).count()
        return None
    
    def get_sous_services_count(self, obj):
        """Sous-services (pour services): retourne le nombre, None sinon."""
        if obj.folder_type == 'service':
            return obj.children.filter(folder_type='sub_service', is_active=True).count()
        return None


# ✅ ALIASES BACKWARD COMPATIBILITY (deprecated, utiliser FolderSerializer)
class FolderBranchSerializer(FolderSerializer):
    """⚠️ DEPRECATED alias - Utiliser FolderSerializer.
    Garde pour compatibilité rétroactive (type='filiale')."""
    pass


class FolderPoleSerializer(FolderSerializer):
    """⚠️ DEPRECATED alias - Utiliser FolderSerializer.
    Garde pour compatibilité rétroactive (type='pole')."""
    pass


class FolderServiceSerializer(FolderSerializer):
    """⚠️ DEPRECATED alias - Utiliser FolderSerializer.
    Garde pour compatibilité rétroactive (type='service')."""
    pass


class FolderDepartmentSerializer(FolderSerializer):
    """⚠️ DEPRECATED alias - Utiliser FolderSerializer.
    Garde pour compatibilité rétroactive (ancien nom 'department')."""
    pass


class FolderDetailSerializer(FolderSerializer):
    """Sérialiseur détaillé avec hiérarchie parente."""
    
    ancestors = serializers.SerializerMethodField()
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['ancestors']
    
    def get_ancestors(self, obj):
        """Retourne tous les ancêtres du dossier."""
        ancestors = obj.get_ancestors()
        return FolderSerializer(ancestors, many=True).data


class FolderTreeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour afficher l'arborescence complète des dossiers avec imbrication."""
    
    children = serializers.SerializerMethodField()
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    level = serializers.IntegerField(source='get_level', read_only=True)
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'folder_type', 'code', 'description',
            'full_path', 'level', 'is_active', 'children'
        ]
    
    def get_children(self, obj):
        """Retourne tous les enfants du dossier avec imbrication récursive."""
        children = obj.children.filter(is_active=True)
        serializer = FolderTreeSerializer(children, many=True, context=self.context)
        return serializer.data


class FolderCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer des dossiers."""
    
    class Meta:
        model = Folder
        fields = ['id', 'name', 'folder_type', 'code', 'country_code', 'parent', 'description', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
        extra_kwargs = {
            'code': {'required': False, 'allow_null': True},
            'country_code': {'required': False, 'allow_null': True},
            'parent': {'required': False, 'allow_null': True},
        }
