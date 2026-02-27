"""
Modèle AuditLog pour tracer toutes les actions importantes du système.
"""

from django.db import models
from django.conf import settings
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class AuditLog(models.Model):
    """Log d'audit pour tracer toutes les actions sensibles du système."""

    ACTION_CHOICES = [
        # Documents
        ("DOCUMENT_UPLOAD", "Document uploadé"),
        ("DOCUMENT_APPROVE", "Document approuvé"),
        ("DOCUMENT_REJECT", "Document rejeté"),
        ("DOCUMENT_DELETE", "Document supprimé"),
        ("DOCUMENT_UPDATE", "Document modifié"),
        ("DOCUMENT_DOWNLOAD", "Document téléchargé"),
        # Utilisateurs
        ("USER_CREATE", "Utilisateur créé"),
        ("USER_UPDATE", "Utilisateur modifié"),
        ("USER_DELETE", "Utilisateur supprimé"),
        ("USER_LOGIN", "Connexion utilisateur"),
        ("USER_LOGOUT", "Déconnexion utilisateur"),
        ("USER_PASSWORD_CHANGE", "Mot de passe modifié"),
        # Admin actions
        ("ADMIN_DEPARTMENT_CREATE", "Département créé"),
        ("ADMIN_DEPARTMENT_UPDATE", "Département modifié"),
        ("ADMIN_DEPARTMENT_DELETE", "Département supprimé"),
        ("ADMIN_ROUTING_RULE_CREATE", "Règle de routage créée"),
        ("ADMIN_ROUTING_RULE_UPDATE", "Règle de routage modifiée"),
        ("ADMIN_ROUTING_RULE_DELETE", "Règle de routage supprimée"),
        ("ADMIN_FILE_TYPE_CONFIG", "Configuration type fichier modifiée"),
        # Sécurité
        ("SECURITY_PERMISSION_DENIED", "Accès refusé"),
        ("SECURITY_SUSPICIOUS_ACTIVITY", "Activité suspecte"),
        ("SECURITY_FAILED_LOGIN", "Connexion échouée"),
        # Système
        ("SYSTEM_ERROR", "Erreur système"),
        ("SYSTEM_BACKUP", "Sauvegarde effectuée"),
    ]

    SEVERITY_CHOICES = [
        ("INFO", "Information"),
        ("WARNING", "Avertissement"),
        ("ERROR", "Erreur"),
        ("CRITICAL", "Critique"),
    ]

    # Acteur
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="audit_logs_created",
    )

    # Action
    action = models.CharField(max_length=50, choices=ACTION_CHOICES)
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES, default="INFO")

    # Objet affecté (generic foreign key)
    content_type = models.ForeignKey(
        ContentType, null=True, blank=True, on_delete=models.SET_NULL
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey("content_type", "object_id")

    # Détails
    description = models.TextField()
    changes = models.JSONField(
        default=dict,
        blank=True,
        help_text="Dictionnaire des changements {champ: [avant, après]}",
    )
    ip_address = models.CharField(
        max_length=45, null=True, blank=True
    )  # Changed from GenericIPAddressField to avoid serializer issues
    user_agent = models.TextField(blank=True)

    # Status
    success = models.BooleanField(default=True)
    error_message = models.TextField(blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_logs"
        verbose_name = "Journal d'audit"
        verbose_name_plural = "Journaux d'audit"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["actor", "-created_at"]),
            models.Index(fields=["action", "-created_at"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["severity"]),
        ]

    def __str__(self):
        actor_name = self.actor.matricule if self.actor else "Système"
        return f"[{self.created_at.strftime('%Y-%m-%d %H:%M:%S')}] {actor_name} - {self.get_action_display()}"

    @classmethod
    def log_action(
        cls,
        actor,
        action,
        description,
        content_object=None,
        changes=None,
        severity="INFO",
        ip_address=None,
        user_agent=None,
        success=True,
        error_message="",
    ):
        """
        Crée un log d'audit.

        Args:
            actor: L'utilisateur qui a effectué l'action
            action: Type d'action (clé dans ACTION_CHOICES)
            description: Description détaillée de l'action
            content_object: L'objet affecté
            changes: Dict des changements {champ: [avant, après]}
            severity: Niveau de sévérité (INFO, WARNING, ERROR, CRITICAL)
            ip_address: Adresse IP du client
            user_agent: User Agent du navigateur
            success: Si l'action a réussi
            error_message: Message d'erreur si applicable
        """
        content_type = None
        object_id = None

        if content_object:
            content_type = ContentType.objects.get_for_model(content_object)
            object_id = content_object.pk

        return cls.objects.create(
            actor=actor,
            action=action,
            severity=severity,
            content_type=content_type,
            object_id=object_id,
            description=description,
            changes=changes or {},
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            error_message=error_message,
        )

    def get_actor_name(self):
        """Retourne le nom de l'acteur."""
        if self.actor:
            return f"{self.actor.first_name} {self.actor.last_name} ({self.actor.matricule})"
        return "Système"

    def get_object_display(self):
        """Retourne une représentation de l'objet affecté."""
        if self.content_object:
            return str(self.content_object)
        return "Système"

    def get_severity_color(self):
        """Retourne la couleur CSS du badge de sévérité."""
        colors = {
            "INFO": "blue",
            "WARNING": "yellow",
            "ERROR": "red",
            "CRITICAL": "red",
        }
        return colors.get(self.severity, "gray")
