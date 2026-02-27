import os
import json
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import (
    FileExtensionValidator,
    MinLengthValidator,
)
from apps.folders.models import Folder


def document_upload_path(instance, filename):
    """
    ⚠️ CORRECTION CRITIQUE : Ce chemin est TEMPORAIRE uniquement pour le stockage physique du fichier.

    ❌ AVANT (PROBLÈME) : Cette fonction créait des dossiers et essayait de router
    ✅ MAINTENANT : Stockage simple, le SIGNAL gère le routage en BDD

    Le signal `create_department_folders_on_upload` assignera le bon dossier en BDD après création.

    Structure de stockage physique simple: documents/temp/MATRICULE_TIMESTAMP.ext
    """
    # Préparer le fichier avec timestamp
    ext = filename.split(".")[-1].lower()
    timestamp = timezone.now().strftime("%Y%m%d_%H%M%S")
    new_filename = f"{instance.agent.matricule}_{timestamp}.{ext}"

    # ✅ STOCKAGE TEMPORAIRE SIMPLE - Pas de logique de routage ici!
    # Le signal assignera le bon folder en BDD
    return os.path.join("documents", "temp", new_filename)


class DocumentSpecification(models.Model):
    """Définit les spécifications de validation pour chaque type de document."""

    ALLOWED_FORMATS = [
        # Documents
        ("pdf", "PDF"),
        ("doc", "Word (.doc)"),
        ("docx", "Word (.docx)"),
        ("txt", "Texte (.txt)"),
        # Excel - Formats modernes
        ("xlsx", "Excel (.xlsx) - Moderne"),
        ("xlsm", "Excel Macro (.xlsm)"),
        ("xltx", "Template Excel (.xltx)"),
        ("xltm", "Template Excel Macro (.xltm)"),
        # Excel - Formats anciens
        ("xls", "Excel (.xls) - Ancien"),
        ("xlt", "Template Excel ancien (.xlt)"),
        # Excel - Formats binaires
        ("xlsb", "Excel Binaire (.xlsb)"),
        ("xlam", "Add-in Excel (.xlam)"),
        # Données délimitées
        ("csv", "CSV (Données délimitées)"),
        ("tsv", "TSV (Tab délimité)"),
        # OpenDocument
        ("ods", "OpenDocument Spreadsheet (.ods)"),
        # Autres
        ("image", "Image (JPG, PNG, etc.)"),
        ("zip", "Archive (ZIP)"),
    ]

    document_type = models.CharField(max_length=30, unique=True)
    display_name = models.CharField(max_length=100)
    description = models.TextField(blank=True)

    # Formats autorisés
    allowed_formats = models.CharField(
        max_length=255,
        default="pdf,docx",
        help_text="Formats autorisés séparés par des virgules (ex: pdf,xlsx,xlsm,xls,csv)",
    )

    # Validation pour Excel
    requires_excel = models.BooleanField(default=False)
    excel_sheet_name = models.CharField(
        max_length=100, blank=True, help_text="Nom de la feuille Excel requise"
    )

    # Colonnes requises (pour Excel)
    required_columns = models.JSONField(
        default=list,
        blank=True,
        help_text="Liste des colonnes requises en JSON: ['Colonne1', 'Colonne2']",
    )

    # Limites
    max_file_size_mb = models.IntegerField(default=50)
    max_rows = models.IntegerField(
        default=100000, null=True, blank=True, help_text="Pour les fichiers Excel"
    )

    # Options
    is_active = models.BooleanField(default=True)
    requires_validation = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_specifications"
        verbose_name = "Spécification de document"
        verbose_name_plural = "Spécifications de documents"

    def __str__(self):
        return f"{self.display_name} ({self.document_type})"

    def get_allowed_formats_list(self):
        """Retourne la liste des formats autorisés."""
        return [fmt.strip() for fmt in self.allowed_formats.split(",")]

    def get_required_columns_list(self):
        """Retourne la liste des colonnes requises."""
        if isinstance(self.required_columns, list):
            return self.required_columns
        return json.loads(self.required_columns) if self.required_columns else []


class DocumentType(models.Model):
    """Modèle flexible pour gérer les types de documents dynamiquement."""

    name = models.CharField(
        max_length=100,
        unique=True,
        help_text="Nom unique du type de document (ex: Facture, Congé, Rapport)",
    )
    display_name = models.CharField(
        max_length=100, help_text="Nom affiché dans l'interface (ex: Demande de congé)"
    )
    description = models.TextField(
        blank=True, help_text="Description du type de document"
    )
    is_active = models.BooleanField(
        default=True, help_text="Active ce type de document"
    )
    icon = models.CharField(
        max_length=50,
        blank=True,
        default="file",
        help_text="Icône Lucide (ex: file, file-pdf, file-text)",
    )
    color = models.CharField(
        max_length=7,
        blank=True,
        default="#6B7280",
        help_text="Couleur hex pour l'affichage",
    )
    # Validation fields
    allowed_formats = models.CharField(
        max_length=200,
        blank=True,
        default="pdf,docx,xlsx",
        help_text="Formats autorisés (séparés par des virgules, ex: pdf,docx,xlsx)",
    )
    max_file_size_mb = models.IntegerField(
        default=50, help_text="Taille maximale du fichier en MB"
    )
    requires_excel = models.BooleanField(
        default=False, help_text="Ce type nécessite une validation Excel"
    )
    excel_sheet_name = models.CharField(
        max_length=100, blank=True, help_text="Nom de la feuille Excel à valider"
    )
    required_columns = models.TextField(
        blank=True, help_text="Colonnes requises pour Excel (séparées par des virgules)"
    )
    max_rows = models.IntegerField(
        null=True, blank=True, help_text="Nombre maximum de lignes pour Excel"
    )
    requires_validation = models.BooleanField(
        default=True, help_text="La validation est requise pour ce type"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "document_types"
        verbose_name = "Type de document"
        verbose_name_plural = "Types de documents"
        ordering = ["display_name"]

    def __str__(self):
        return self.display_name

    @staticmethod
    def get_or_create_defaults():
        """Crée les types par défaut s'ils n'existent pas."""
        defaults = [
            {
                "name": "FACTURE",
                "display_name": "Facture",
                "icon": "file-text",
                "color": "#10B981",
            },
            {
                "name": "BON_COMMANDE",
                "display_name": "Bon de Commande",
                "icon": "shopping-cart",
                "color": "#3B82F6",
            },
            {
                "name": "CONTRAT",
                "display_name": "Contrat",
                "icon": "file",
                "color": "#8B5CF6",
            },
            {
                "name": "RAPPORT",
                "display_name": "Rapport",
                "icon": "bar-chart-2",
                "color": "#F59E0B",
            },
            {
                "name": "CONGE",
                "display_name": "Demande de congé",
                "icon": "calendar",
                "color": "#EF4444",
            },
            {
                "name": "NOTE_FRAIS",
                "display_name": "Note de frais",
                "icon": "credit-card",
                "color": "#06B6D4",
            },
            {
                "name": "MEDICAL",
                "display_name": "Certificat médical",
                "icon": "heart",
                "color": "#EC4899",
            },
            {
                "name": "TEMPS",
                "display_name": "Fiche de temps",
                "icon": "clock",
                "color": "#14B8A6",
            },
            {
                "name": "FORMATION",
                "display_name": "Demande de formation",
                "icon": "book",
                "color": "#F97316",
            },
            {
                "name": "ADMINISTRATIF",
                "display_name": "Document administratif",
                "icon": "file-text",
                "color": "#6B7280",
            },
            {
                "name": "JUSTIFICATIF",
                "display_name": "Justificatif",
                "icon": "check-circle",
                "color": "#10B981",
            },
            {
                "name": "EVALUATION",
                "display_name": "Évaluation",
                "icon": "star",
                "color": "#FBBF24",
            },
            {
                "name": "BUDGET",
                "display_name": "Budget",
                "icon": "pie-chart",
                "color": "#3B82F6",
            },
            {
                "name": "DEMANDE",
                "display_name": "Demande",
                "icon": "inbox",
                "color": "#8B5CF6",
            },
            {
                "name": "ATTESTATION",
                "display_name": "Attestation",
                "icon": "award",
                "color": "#10B981",
            },
            {
                "name": "DONNEES_EXCEL",
                "display_name": "Données Excel",
                "icon": "table",
                "color": "#059669",
            },
            {
                "name": "DONNEES_AGENTS",
                "display_name": "Données des agents",
                "icon": "users",
                "color": "#0891B2",
            },
            {
                "name": "DONNEES_PROJETS",
                "display_name": "Données des projets",
                "icon": "briefcase",
                "color": "#7C3AED",
            },
            {
                "name": "DONNEES_HEURES",
                "display_name": "Données des heures",
                "icon": "clock",
                "color": "#DC2626",
            },
            {
                "name": "DONNEES_ABSENCES",
                "display_name": "Données des absences",
                "icon": "x-circle",
                "color": "#EA580C",
            },
            {
                "name": "RAPPORT_MENSUEL",
                "display_name": "Rapport mensuel",
                "icon": "calendar",
                "color": "#0369A1",
            },
            {
                "name": "RAPPORT_ANNUEL",
                "display_name": "Rapport annuel",
                "icon": "bar-chart-2",
                "color": "#1E40AF",
            },
        ]

        for doc_type in defaults:
            DocumentType.objects.get_or_create(
                name=doc_type["name"],
                defaults={
                    "display_name": doc_type["display_name"],
                    "icon": doc_type["icon"],
                    "color": doc_type["color"],
                },
            )


class DocumentValidationResult(models.Model):
    """Résultat de la validation d'un document."""

    STATUS_CHOICES = [
        ("PASSED", "Validé"),
        ("FAILED", "Échoué"),
        ("WARNING", "Avertissement"),
    ]

    document = models.OneToOneField(
        "Document",
        on_delete=models.CASCADE,
        related_name="validation_result",
        null=True,
        blank=True,
    )

    status = models.CharField(max_length=10, choices=STATUS_CHOICES)
    errors = models.JSONField(default=list, blank=True)
    warnings = models.JSONField(default=list, blank=True)
    validation_details = models.JSONField(default=dict, blank=True)

    validated_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "document_validation_results"
        verbose_name = "Résultat de validation"
        verbose_name_plural = "Résultats de validation"

    def __str__(self):
        return f"Validation {self.document.title if self.document else 'N/A'} - {self.status}"

    def is_valid(self):
        """Retourne True si le document est valide."""
        return self.status in ["PASSED", "WARNING"]


class Document(models.Model):
    """Modèle pour les documents uploadés avec validation."""

    STATUS_CHOICES = [
        ("NOUVEAU", "Nouveau"),
        ("EN_COURS", "En cours de révision"),
        ("VALIDE", "Validé"),
        ("REJETE", "Rejeté"),
        ("ARCHIVE", "Archivé"),
    ]

    # Informations principales
    title = models.CharField(
        max_length=255,
        validators=[MinLengthValidator(3)],  # At least 3 chars
        help_text="Document title (3-255 characters)",
    )
    file = models.FileField(upload_to=document_upload_path)
    document_type = models.ForeignKey(
        DocumentType,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
        help_text="Type de document",
    )
    # Legacy field for backward compatibility during migration
    document_type_legacy = models.CharField(
        max_length=30,
        null=True,
        blank=True,
        help_text="Ancien champ - sera supprimé après migration",
    )
    description = models.TextField(blank=True)

    # Relations
    agent = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="documents"
    )
    folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )

    # Spécification du document
    specification = models.ForeignKey(
        DocumentSpecification,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="documents",
    )

    # Status et workflow
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="NOUVEAU")

    # Timestamps du workflow
    opened_at = models.DateTimeField(null=True, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    rejected_at = models.DateTimeField(null=True, blank=True)
    archived_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)

    # Métadonnées du fichier
    file_size = models.IntegerField(default=0)
    mime_type = models.CharField(max_length=100, blank=True)
    file_format = models.CharField(max_length=20, blank=True)

    # Pour les fichiers Excel
    excel_sheet_name = models.CharField(max_length=100, blank=True)
    excel_row_count = models.IntegerField(default=0)
    excel_column_count = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Routage
    routed_automatically = models.BooleanField(default=False)
    routing_rule_applied = models.ForeignKey(
        "routing_rules.RoutingRule", on_delete=models.SET_NULL, null=True, blank=True
    )

    class Meta:
        db_table = "documents"
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["agent", "status"]),
            models.Index(fields=["document_type", "created_at"]),
            models.Index(fields=["folder", "status"]),
            models.Index(fields=["status", "created_at"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.agent.matricule}"

    def get_file_format(self):
        """Extrait le format du fichier."""
        if self.file:
            return self.file.name.split(".")[-1].lower()
        return ""

    @property
    def file_name(self):
        return os.path.basename(self.file.name)

    @property
    def file_size_mb(self):
        return round(self.file_size / (1024 * 1024), 2)

    def mark_as_opened(self):
        """Marque le document comme en cours de révision par l'admin."""
        if self.status == "NOUVEAU":
            self.status = "EN_COURS"
            self.opened_at = timezone.now()
            self.save()

    def accept(self):
        """Accepte et valide le document."""
        self.status = "VALIDE"
        self.accepted_at = timezone.now()
        self.save()

    def reject(self, reason):
        """Rejette le document avec une raison."""
        self.status = "REJETE"
        self.rejected_at = timezone.now()
        self.rejection_reason = reason
        self.save()

    def archive(self):
        """Archive le document."""
        self.status = "ARCHIVE"
        self.archived_at = timezone.now()
        self.save()


# Document Template Models
class DocumentTemplate(models.Model):
    """
    Template model for documents that admins can create and share with agents.
    Templates can be assigned to specific departments or globally available.
    """

    TEMPLATE_TYPE_CHOICES = [
        ("REPORT", "Rapport"),
        ("LETTER", "Lettre"),
        ("REQUEST", "Demande"),
        ("CONTRACT", "Contrat"),
        ("PROCEDURE", "Procédure"),
        ("FORM", "Formulaire"),
        ("OTHER", "Autre"),
    ]

    VISIBILITY_CHOICES = [
        ("ALL", "Tous les agents"),
        ("DEPARTMENT", "Par département"),
        ("CUSTOM", "Agents sélectionnés"),
    ]

    # Basic Info
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    template_type = models.CharField(
        max_length=20, choices=TEMPLATE_TYPE_CHOICES, default="OTHER"
    )

    # File Management
    file = models.FileField(
        upload_to="templates/%Y/%m/%d/",
        validators=[
            FileExtensionValidator(
                allowed_extensions=["pdf", "docx", "xlsx", "pptx", "doc", "xls", "ppt"]
            )
        ],
    )
    file_size = models.BigIntegerField(editable=False, default=0)
    file_type = models.CharField(max_length=20, editable=False, default="DOC")

    # Creator & Ownership
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="created_templates",
    )

    # Visibility & Sharing
    visibility = models.CharField(
        max_length=20, choices=VISIBILITY_CHOICES, default="ALL"
    )

    # NOUVEAU: Department-based sharing via Folder au lieu de Department model
    departments = models.ManyToManyField(
        "folders.Folder",
        blank=True,
        related_name="template_access",
        limit_choices_to={"folder_type": "service"},  # CHANGÉ: 'department' → 'service'
        help_text="Services (départements) autorisés à accéder à ce template",
    )

    # User-level sharing
    allowed_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL, blank=True, related_name="accessible_templates"
    )

    # Metadata
    is_active = models.BooleanField(default=True)
    downloads_count = models.IntegerField(default=0, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    version = models.IntegerField(default=1)

    class Meta:
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["created_by", "-created_at"]),
            models.Index(fields=["visibility", "is_active"]),
            models.Index(fields=["template_type"]),
        ]

    def __str__(self):
        return f"{self.name} (v{self.version})"

    def save(self, *args, **kwargs):
        if self.file:
            self.file_size = self.file.size
            ext = self.file.name.split(".")[-1].upper()
            ext_map = {
                "PDF": "PDF",
                "DOCX": "DOCX",
                "DOC": "DOCX",
                "XLSX": "XLSX",
                "XLS": "XLSX",
                "PPTX": "PPTX",
                "PPT": "PPTX",
            }
            self.file_type = ext_map.get(ext, "DOC")
        super().save(*args, **kwargs)

    def is_available_to_user(self, user):
        if not self.is_active:
            return False
        if user == self.created_by:
            return True
        if user.role == "ADMIN":
            return True
        if self.visibility == "ALL":
            return True
        if self.visibility == "DEPARTMENT":
            # NOUVEAU: Vérifier si le département de l'utilisateur est dans la liste
            if hasattr(user, "department") and user.department:
                return self.departments.filter(id=user.department.id).exists()
            return False
        if self.visibility == "CUSTOM":
            return self.allowed_users.filter(id=user.id).exists()
        return False

    def get_download_url(self):
        if self.file:
            return self.file.url
        return None


class TemplateVersion(models.Model):
    """Keep track of template versions for audit"""

    template = models.ForeignKey(
        DocumentTemplate, on_delete=models.CASCADE, related_name="versions"
    )
    version_number = models.IntegerField()
    file = models.FileField(upload_to="template_versions/%Y/%m/%d/")
    changelog = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True
    )

    class Meta:
        ordering = ["-version_number"]
        unique_together = ["template", "version_number"]

    def __str__(self):
        return f"{self.template.name} - v{self.version_number}"


class TemplateDownloadLog(models.Model):
    """Track template downloads for analytics"""

    template = models.ForeignKey(
        DocumentTemplate, on_delete=models.CASCADE, related_name="download_logs"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="template_downloads",
    )
    downloaded_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    class Meta:
        ordering = ["-downloaded_at"]


# Import FileTypeConfiguration at the end to avoid circular imports
from .file_config_models import FileTypeConfiguration  # noqa: F401, E402


class DocumentTransfer(models.Model):
    """
    Modèle pour tracker les transfers/re-routages de documents.
    """

    TRANSFER_TYPES = [
        ("AUTO_ROUTING", "Routage automatique"),
        ("MANUAL_TRANSFER", "Transfer manuel"),
        ("CROSS_POLE", "Transfer entre Pôles"),
        ("CROSS_FILIALE", "Transfer entre Filiales"),
        ("CROSS_SERVICE", "Transfer entre Services"),
        ("COMPLIANCE_MOVE", "Mouvement pour conformité"),
        ("OTHER", "Autre raison"),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="transfers",
        help_text="Document transféré",
    )

    from_folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_from",
        help_text="Dossier d'origine",
    )

    to_folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transfers_to",
        help_text="Dossier de destination",
    )

    transferred_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        related_name="document_transfers",
        help_text="Utilisateur qui a effectué le transfer",
    )

    transfer_type = models.CharField(
        max_length=20, choices=TRANSFER_TYPES, default="MANUAL_TRANSFER"
    )

    reason = models.TextField(blank=True)
    transferred_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        db_table = "document_transfers"
        verbose_name = "Transfer de document"
        verbose_name_plural = "Transfers de documents"
        ordering = ["-transferred_at"]

    def __str__(self):
        return f"{self.document.name} → {self.to_folder.name}"


class DocumentShare(models.Model):
    """
    Modèle pour partager des documents:
    - Entre utilisateurs individuels (shared_with)
    - Avec des groupes/dossiers (shared_with_folder: Pôle, Filiale ou Service)
    """

    PERMISSION_CHOICES = [
        ("VIEW", "Lecture seule"),
        ("COMMENT", "Lecture + Commentaires"),
        ("DOWNLOAD", "Téléchargement"),
        ("EDIT", "Édition"),
        ("SHARE", "Can re-share"),
    ]

    SHARE_TYPE_CHOICES = [
        ("USER", "Utilisateur"),
        ("FOLDER", "Dossier (Pôle/Filiale/Service)"),
    ]

    document = models.ForeignKey(
        Document,
        on_delete=models.CASCADE,
        related_name="shares",
        help_text="Document partagé",
    )

    shared_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents_shared_by_me",
        help_text="Utilisateur qui partage le document",
    )

    # Type de partage
    share_type = models.CharField(
        max_length=20,
        choices=SHARE_TYPE_CHOICES,
        default="USER",
        help_text="Partage avec un utilisateur ou un dossier",
    )

    # Partage avec utilisateur (optionnel if share_type='FOLDER')
    shared_with = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="documents_shared_with_me",
        help_text="Utilisateur qui reçoit le document",
        null=True,
        blank=True,
    )

    # Partage avec dossier (optionnel if share_type='USER')
    shared_with_folder = models.ForeignKey(
        "folders.Folder",
        on_delete=models.CASCADE,
        related_name="documents_shared_with_folder",
        help_text="Pôle, Filiale ou Service avec qui partager le document",
        null=True,
        blank=True,
    )

    permission = models.CharField(
        max_length=20,
        choices=PERMISSION_CHOICES,
        default="VIEW",
        help_text="Niveau de permission",
    )

    message = models.TextField(
        blank=True, help_text="Message personnel avec le partage"
    )

    shared_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="La date d'expiration du partage (vide = pas d'expiration)",
    )

    # Tracking
    accessed_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Dernière fois que le destinataire a accédé au document",
    )

    class Meta:
        db_table = "document_shares"
        verbose_name = "Partage de document"
        verbose_name_plural = "Partages de documents"
        ordering = ["-shared_at"]
        indexes = [
            models.Index(fields=["shared_with", "-shared_at"]),
            models.Index(fields=["shared_by"]),
            models.Index(fields=["document"]),
            models.Index(fields=["shared_with_folder", "-shared_at"]),
            models.Index(fields=["share_type"]),
        ]

    def __str__(self):
        if self.share_type == "USER":
            return f"{self.document.title} shared with {self.shared_with.matricule}"
        else:
            return f"{self.document.title} shared with {self.shared_with_folder.name} ({self.shared_with_folder.folder_type})"

    def is_valid(self):
        """Vérifie si le partage est toujours valide."""
        if self.expires_at and self.expires_at < timezone.now():
            return False
        return True
