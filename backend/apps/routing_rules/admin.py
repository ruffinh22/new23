from django.contrib import admin
from .models import RoutingRule, DepartmentDocumentType


@admin.register(DepartmentDocumentType)
class DepartmentDocumentTypeAdmin(admin.ModelAdmin):
    """Admin pour configurer les types de documents par département."""

    list_display = ("department", "document_type", "is_available", "created_at")
    list_filter = ("department", "is_available", "created_at")
    search_fields = ("department", "document_type")
    readonly_fields = ("created_at", "updated_at")

    fieldsets = (
        ("Configuration", {"fields": ("department", "document_type", "is_available")}),
        ("Détails", {"fields": ("description",)}),
        (
            "Métadonnées",
            {"fields": ("created_at", "updated_at"), "classes": ("collapse",)},
        ),
    )

    def get_readonly_fields(self, request, obj=None):
        """Rendre les champs non-modifiables après création."""
        if obj:  # Editing an existing object
            return self.readonly_fields + ["department", "document_type"]
        return self.readonly_fields


@admin.register(RoutingRule)
class RoutingRuleAdmin(admin.ModelAdmin):
    """Admin pour configurer les règles de routage automatique des documents."""

    list_display = (
        "name",
        "destination_folder",
        "priority",
        "is_active",
        "times_applied",
    )
    list_filter = ("is_active", "created_at")
    search_fields = ("name", "destination_folder__name")
    readonly_fields = (
        "created_by",
        "created_at",
        "updated_at",
        "times_applied",
        "last_applied",
    )

    fieldsets = (
        ("Règle de routage", {"fields": ("name", "description")}),
        (
            "Critères de routage",
            {
                "fields": ("destination_folder", "priority", "conditions"),
                "description": 'Définissez les conditions pour appliquer cette règle. Exemple: {"department": {"value": "RH", "operator": "equals"}, "document_type": {"value": "CONGE", "operator": "equals"}}',
            },
        ),
        ("État", {"fields": ("is_active",)}),
        (
            "Statistiques",
            {
                "fields": (
                    "times_applied",
                    "last_applied",
                    "created_by",
                    "created_at",
                    "updated_at",
                ),
                "classes": ("collapse",),
            },
        ),
    )

    def save_model(self, request, obj, form, change):
        """Enregistrer l'utilisateur qui crée la règle."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)
