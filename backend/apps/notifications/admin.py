from django.contrib import admin
from .models import Notification


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    """Admin pour gérer les notifications."""

    list_display = (
        "get_title",
        "recipient",
        "notification_type",
        "is_read",
        "created_at",
    )
    list_filter = ("is_read", "notification_type", "created_at")
    search_fields = ("title", "message", "recipient__email")
    readonly_fields = ("created_at",)

    fieldsets = (
        (
            "Notification",
            {"fields": ("recipient", "notification_type", "title", "message")},
        ),
        ("Statut", {"fields": ("is_read", "read_at")}),
        ("Lien document", {"fields": ("document",), "classes": ("collapse",)}),
        ("Métadonnées", {"fields": ("created_at",), "classes": ("collapse",)}),
    )

    def get_title(self, obj):
        return obj.title or obj.notification_type

    get_title.short_description = "Titre"
