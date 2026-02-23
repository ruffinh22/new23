from rest_framework import serializers
from .models import Folder


class FolderSerializer(serializers.ModelSerializer):
    """Sérialiseur principal pour le modèle Folder unifié.
    
    Expose tous les types d'objet organisationnel (Filiale, Département, Section).
    """
    
    parent_name = serializers.CharField(source='parent.name', read_only=True, allow_null=True)
    full_path = serializers.CharField(source='get_full_path', read_only=True)
    level = serializers.IntegerField(source='get_level', read_only=True)
    auto_type = serializers.CharField(read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True, allow_null=True)
    children_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Folder
        fields = [
            'id', 'name', 'folder_type', 'code', 'country_code',
            'parent', 'parent_name', 'description',
            'full_path', 'level', 'auto_type', 'children_count',
            'is_active', 'created_by', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'full_path', 'level', 'auto_type', 'created_by', 'created_at', 'updated_at']
        extra_kwargs = {
            'code': {'required': False, 'allow_null': True},
            'country_code': {'required': False, 'allow_null': True},
        }
    
    def get_children_count(self, obj):
        return obj.children.count()


class FolderBranchSerializer(FolderSerializer):
    """Sérialiseur pour les Folders de type 'filiale' (Filiales).
    
    ANCIEN: 'branch', NOUVEAU: 'filiale'
    """
    
    services_count = serializers.SerializerMethodField()
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['services_count']
    
    def get_services_count(self, obj):
        """Compte les services directs sous cette filiale."""
        return obj.children.filter(folder_type='service').count()


class FolderPoleSerializer(FolderSerializer):
    """Sérialiseur pour les Folders de type 'pole' (Pôles)."""
    
    filiales_count = serializers.SerializerMethodField()
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['filiales_count']
    
    def get_filiales_count(self, obj):
        """Compte les filiales sous ce pôle."""
        return obj.children.filter(folder_type='filiale').count()


class FolderDepartmentSerializer(FolderSerializer):
    """Sérialiseur pour les Folders de type 'service' (Services/Départements).
    
    ANCIEN: 'department', NOUVEAU: 'service'
    """
    
    parent_type = serializers.CharField(source='parent.folder_type', read_only=True, allow_null=True)
    parent_code = serializers.CharField(source='parent.code', read_only=True, allow_null=True)
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['parent_type', 'parent_code']


class FolderServiceSerializer(FolderSerializer):
    """Sérialiseur pour les Folders de type 'service' (Services/Départements)."""
    
    parent_type = serializers.CharField(source='parent.folder_type', read_only=True, allow_null=True)
    sous_services_count = serializers.SerializerMethodField()
    
    class Meta(FolderSerializer.Meta):
        fields = FolderSerializer.Meta.fields + ['parent_type', 'sous_services_count']
    
    def get_sous_services_count(self, obj):
        """Compte les sous-services directes sous ce service."""
        return obj.children.filter(folder_type='sub_service').count()


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
        }
