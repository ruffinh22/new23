from django.apps import AppConfig


class DocumentsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.documents"
    verbose_name = "Documents"

    def ready(self):

        # Connecter le signal pour DepartmentDocumentType
        from django.db.models.signals import post_save
        from apps.routing_rules.models import DepartmentDocumentType
        from apps.documents.signals import create_folders_on_document_type_added

        post_save.connect(
            create_folders_on_document_type_added, sender=DepartmentDocumentType
        )
