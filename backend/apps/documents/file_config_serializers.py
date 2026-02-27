# FILE: backend/apps/documents/file_config_serializers.py
"""
Serializers pour la configuration des types de fichiers
"""

from rest_framework import serializers
from .file_config_models import FileTypeConfiguration


class FileTypeConfigurationSerializer(serializers.ModelSerializer):
    """Serializer pour FileTypeConfiguration"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    file_type_display = serializers.CharField(
        source="get_file_type_display", read_only=True
    )

    class Meta:
        model = FileTypeConfiguration
        fields = [
            "id",
            "file_type",
            "file_type_display",
            "display_name",
            "description",
            "max_file_size_mb",
            "min_file_size_kb",
            "max_rows",
            "max_columns",
            "max_sheets",
            "max_pages",
            "max_width_px",
            "max_height_px",
            "min_width_px",
            "min_height_px",
            "require_macros_disabled",
            "require_no_password",
            "allow_external_links",
            "require_utf8_encoding",
            "allowed_sheets",
            "forbidden_columns",
            "required_columns",
            "is_enabled",
            "is_auto_validated",
            "created_at",
            "updated_at",
            "created_by_name",
        ]
        read_only_fields = ["id", "created_at", "updated_at", "created_by_name"]


class FileTypeConfigurationListSerializer(serializers.ModelSerializer):
    """Serializer simplifié pour la liste"""

    file_type_display = serializers.CharField(
        source="get_file_type_display", read_only=True
    )

    class Meta:
        model = FileTypeConfiguration
        fields = [
            "id",
            "file_type",
            "file_type_display",
            "display_name",
            "max_file_size_mb",
            "is_enabled",
            "is_auto_validated",
        ]
