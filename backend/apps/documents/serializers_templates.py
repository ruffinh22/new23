"""
Serializers for Document Template API
"""

from rest_framework import serializers
from apps.documents.models import DocumentTemplate, TemplateVersion, TemplateDownloadLog
from apps.folders.models import Folder


class DepartmentSimpleSerializer(serializers.ModelSerializer):
    """Simple service/department info for templates (uses Folder model now)"""

    class Meta:
        model = Folder
        fields = ["id", "name", "code"]


class TemplateVersionSerializer(serializers.ModelSerializer):
    """Serializer for template versions"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )

    class Meta:
        model = TemplateVersion
        fields = ["id", "version_number", "changelog", "created_at", "created_by_name"]
        read_only_fields = ["id", "created_at", "created_by_name"]


class DocumentTemplateListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for template listings"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    file_url = serializers.CharField(source="get_download_url", read_only=True)
    type_display = serializers.CharField(
        source="get_template_type_display", read_only=True
    )

    class Meta:
        model = DocumentTemplate
        fields = [
            "id",
            "name",
            "description",
            "template_type",
            "type_display",
            "file_type",
            "file_size",
            "downloads_count",
            "created_by_name",
            "is_active",
            "version",
            "created_at",
            "updated_at",
            "file_url",
            "visibility",
        ]
        read_only_fields = [
            "id",
            "file_size",
            "file_type",
            "downloads_count",
            "created_by_name",
            "created_at",
            "updated_at",
            "file_url",
        ]


class DocumentTemplateDetailSerializer(serializers.ModelSerializer):
    """Complete serializer for template details and management"""

    created_by_name = serializers.CharField(
        source="created_by.get_full_name", read_only=True
    )
    departments_data = DepartmentSimpleSerializer(
        source="departments", many=True, read_only=True
    )
    allowed_users_data = serializers.SerializerMethodField()
    versions = TemplateVersionSerializer(many=True, read_only=True)
    file_url = serializers.CharField(source="get_download_url", read_only=True)
    type_display = serializers.CharField(
        source="get_template_type_display", read_only=True
    )
    visibility_display = serializers.CharField(
        source="get_visibility_display", read_only=True
    )

    class Meta:
        model = DocumentTemplate
        fields = [
            "id",
            "name",
            "description",
            "template_type",
            "type_display",
            "file",
            "file_url",
            "file_type",
            "file_size",
            "created_by_name",
            "is_active",
            "version",
            "visibility",
            "visibility_display",
            "departments",
            "departments_data",
            "allowed_users",
            "allowed_users_data",
            "downloads_count",
            "created_at",
            "updated_at",
            "versions",
        ]
        read_only_fields = [
            "id",
            "file_size",
            "file_type",
            "downloads_count",
            "created_by_name",
            "created_at",
            "updated_at",
            "versions",
        ]

    def get_allowed_users_data(self, obj):
        """Get basic user info for allowed_users"""
        users = obj.allowed_users.all()
        return [
            {"id": u.id, "matricule": u.matricule, "full_name": u.get_full_name()}
            for u in users
        ]

    def create(self, validated_data):
        """Add creator to template"""
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

    def update(self, instance, validated_data):
        """Handle file updates as new versions"""
        if "file" in validated_data and validated_data["file"] != instance.file:
            # Create a version of the old file
            TemplateVersion.objects.create(
                template=instance,
                version_number=instance.version,
                file=instance.file,
                changelog=validated_data.get("changelog", "Mise à jour"),
                created_by=self.context["request"].user,
            )
            # Increment version
            instance.version += 1

        # Remove many-to-many fields for now
        departments = validated_data.pop("departments", None)
        allowed_users = validated_data.pop("allowed_users", None)

        # Update other fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        # Update many-to-many
        if departments is not None:
            instance.departments.set(departments)
        if allowed_users is not None:
            instance.allowed_users.set(allowed_users)

        return instance


class DocumentTemplateCreateSerializer(serializers.ModelSerializer):
    """Serializer specifically for creating templates"""

    class Meta:
        model = DocumentTemplate
        fields = [
            "name",
            "description",
            "template_type",
            "file",
            "visibility",
            "departments",
            "allowed_users",
        ]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)


class TemplateDownloadLogSerializer(serializers.ModelSerializer):
    """Serializer for download tracking"""

    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = TemplateDownloadLog
        fields = ["id", "user_name", "downloaded_at", "ip_address"]
        read_only_fields = ["id", "downloaded_at", "ip_address"]
