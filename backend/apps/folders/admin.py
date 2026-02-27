from django.contrib import admin
from django.utils.html import format_html
from .models import Folder


@admin.register(Folder)
class FolderAdmin(admin.ModelAdmin):
    """Admin pour gérer l'arborescence des dossiers avec interface améliorée."""

    list_display = (
        "folder_tree",
        "parent_display",
        "is_active_status",
        "created_by",
        "created_at",
    )
    list_filter = ("created_at", "created_by", "is_active")
    search_fields = ("name", "description")
    readonly_fields = ("created_at", "created_by", "full_path_display")

    fieldsets = (
        (
            "📁 Informations du dossier",
            {
                "fields": ("name", "parent", "description", "is_active"),
                "description": "Configurez la structure de votre arborescence",
            },
        ),
        (
            "📍 Chemin complet",
            {
                "fields": ("full_path_display",),
                "description": "Le chemin complet du dossier dans l'arborescence",
            },
        ),
        (
            "🕐 Audit",
            {"fields": ("created_by", "created_at"), "classes": ("collapse",)},
        ),
    )

    def folder_tree(self, obj):
        """Affiche le nom du dossier avec indentation pour montrer la hiérarchie."""
        level = 0
        parent = obj.parent
        while parent:
            level += 1
            parent = parent.parent

        indent = "&nbsp;&nbsp;&nbsp;&nbsp;" * level
        icon = "📂" if obj.is_active else "📁"

        if level > 0:
            return format_html("{}{} <strong>{}</strong>", indent, icon, obj.name)
        return format_html("<strong>{} {}</strong>", icon, obj.name)

    folder_tree.short_description = "Arborescence"

    def parent_display(self, obj):
        """Affiche le parent du dossier."""
        if obj.parent:
            return format_html(
                '<span style="color: #666;">→ {}</span>', obj.parent.name
            )
        return format_html('<span style="color: #999;">Racine</span>')

    parent_display.short_description = "Parent"

    def is_active_status(self, obj):
        """Affiche le statut d'activité."""
        if obj.is_active:
            return format_html('<span style="color: green;">✓ Actif</span>')
        return format_html('<span style="color: red;">✗ Inactif</span>')

    is_active_status.short_description = "Statut"

    def full_path_display(self, obj):
        """Affiche le chemin complet du dossier."""
        return format_html(
            '<code style="background: #f0f0f0; padding: 5px; border-radius: 3px;">{}</code>',
            obj.full_path,
        )

    def save_model(self, request, obj, form, change):
        """Enregistrer l'utilisateur qui crée le dossier."""
        if not change:
            obj.created_by = request.user
        super().save_model(request, obj, form, change)

    def get_queryset(self, request):
        """Optimise la requête pour afficher les dossiers correctement."""
        return super().get_queryset(request).select_related("parent", "created_by")
