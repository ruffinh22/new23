from rest_framework import serializers
from .models import RoutingRule, DepartmentDocumentType


class DepartmentDocumentTypeSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les types de documents par département."""
    
    department_display = serializers.CharField(source='get_department_display', read_only=True)
    document_type_display = serializers.CharField(source='get_document_type_display', read_only=True)
    target_folder = serializers.CharField(source='target_folder.name', read_only=True, allow_null=True)
    target_folder_id = serializers.IntegerField(source='target_folder.id', read_only=True, allow_null=True)
    file_type_config_name = serializers.CharField(source='file_type_configuration.display_name', read_only=True, allow_null=True)
    file_type_config_id = serializers.IntegerField(source='file_type_configuration.id', read_only=True, allow_null=True)
    
    class Meta:
        model = DepartmentDocumentType
        fields = [
            'id', 'department', 'department_display', 'document_type',
            'document_type_display', 'is_available', 'description',
            'target_folder', 'target_folder_id',
            'file_type_configuration', 'file_type_config_id', 'file_type_config_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['created_at', 'updated_at']


class RoutingRuleSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle RoutingRule."""
    
    destination_folder_name = serializers.CharField(source='destination_folder.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    pole_name = serializers.CharField(source='pole.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    class Meta:
        model = RoutingRule
        fields = [
            'id', 'name', 'description', 'conditions', 'destination_folder',
            'destination_folder_name', 'pole', 'pole_name', 'branch', 'branch_name', 
            'routing_path', 'auto_create_hierarchy', 'priority', 'is_active',
            'times_applied', 'last_applied', 'created_by', 'created_by_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'times_applied', 'last_applied', 'created_by', 'created_at', 'updated_at']


class RoutingRuleCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer des règles de routage."""
    
    destination_folder_name = serializers.CharField(source='destination_folder.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    pole_name = serializers.CharField(source='pole.name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    
    def validate(self, data):
        """Valide que les conditions sont correctement formatées."""
        import logging
        logger = logging.getLogger(__name__)
        
        logger.info(f"[RoutingRuleCreateSerializer.validate] Input data:")
        logger.info(f"  - Raw: {data}")
        logger.info(f"  - Conditions: {data.get('conditions')}")
        
        if 'conditions' in data and data['conditions']:
            conditions = data['conditions']
            logger.info(f"  - Conditions type: {type(conditions)}")
            logger.info(f"  - Conditions keys: {conditions.keys() if isinstance(conditions, dict) else 'N/A'}")
        
        return data
    
    class Meta:
        model = RoutingRule
        fields = [
            'id', 'name', 'description', 'conditions', 'destination_folder',
            'destination_folder_name', 'pole', 'pole_name', 'branch', 'branch_name', 
            'routing_path', 'auto_create_hierarchy', 'priority', 'is_active',
            'times_applied', 'created_by', 'created_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'times_applied', 'created_by', 'created_by_name', 'created_at']


class RoutingRuleListSerializer(serializers.ModelSerializer):
    """Sérialiseur simplifié pour la liste des règles."""
    
    destination_folder_name = serializers.CharField(source='destination_folder.name', read_only=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    pole_name = serializers.CharField(source='pole.name', read_only=True, allow_null=True)
    
    class Meta:
        model = RoutingRule
        fields = [
            'id', 'name', 'description', 'conditions', 'destination_folder', 
            'destination_folder_name', 'pole', 'pole_name', 'branch', 'branch_name', 
            'routing_path', 'auto_create_hierarchy', 'priority', 'is_active', 'times_applied'
        ]
