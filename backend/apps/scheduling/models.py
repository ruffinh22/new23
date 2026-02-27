from django.db import models
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.utils import timezone
from apps.folders.models import Folder
import uuid

User = get_user_model()


class EmailSchedule(models.Model):
    """Modèle pour programmer l'envoi d'emails automatiques"""

    RECIPIENT_TYPES = [
        ("ALL_USERS", "Tous les utilisateurs"),
        ("POLE", "Pôle spécifique"),
        ("FILIALE", "Filiale spécifique"),
        ("SERVICE", "Service spécifique"),
        ("SUB_SERVICE", "Sous-service spécifique"),
    ]

    STATUS_CHOICES = [
        ("DRAFT", "Brouillon"),
        ("SCHEDULED", "Programmé"),
        ("SENT", "Envoyé"),
        ("FAILED", "Échoué"),
        ("CANCELLED", "Annulé"),
    ]

    # Identifiant unique
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Information sur l'email
    subject = models.CharField(max_length=255, help_text="Sujet de l'email")
    message = models.TextField(help_text="Contenu de l'email")

    # Destinataires
    recipient_type = models.CharField(
        max_length=20,
        choices=RECIPIENT_TYPES,
        default="ALL_USERS",
        help_text="Type de destinataire",
    )
    recipient_folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="email_schedules",
        help_text="Dossier destinataire (si recipient_type != ALL_USERS)",
    )

    # Programmation
    scheduled_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Date et heure d'envoi programmée (pour ONE_TIME)",
    )

    # Récurrence
    RECURRENCE_CHOICES = [
        ("ONE_TIME", "Une seule fois"),
        ("MONTHLY", "Chaque mois"),
    ]

    recurrence_type = models.CharField(
        max_length=20,
        choices=RECURRENCE_CHOICES,
        default="ONE_TIME",
        help_text="Type de programmation: une seule fois ou récurrence mensuelle",
    )

    monthly_days = models.CharField(
        max_length=50,
        blank=True,
        help_text="Jours du mois pour récurrence (ex: 15,23). Séparés par des virgules",
    )

    monthly_time = models.TimeField(
        null=True, blank=True, help_text="Heure d'envoi pour les emails mensuels"
    )

    # Métadonnées
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_email_schedules",
        help_text="Utilisateur qui a créé le planning",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")
    sent_at = models.DateTimeField(null=True, blank=True, help_text="Date d'envoi réel")
    error_message = models.TextField(blank=True, help_text="Message d'erreur si échec")

    class Meta:
        db_table = "email_schedules"
        verbose_name = "Programmation d'email"
        verbose_name_plural = "Programmations d'emails"
        ordering = ["-scheduled_at"]
        indexes = [
            models.Index(fields=["status", "scheduled_at"]),
            models.Index(fields=["created_by"]),
        ]

    def __str__(self):
        return f"Email: {self.subject} - {self.get_recipient_type_display()} ({self.status})"

    def clean(self):
        """Valide que la destination et la programmation sont correctement spécifiées"""
        if self.recipient_type != "ALL_USERS" and not self.recipient_folder:
            raise ValidationError(
                "Un dossier destinataire est requis pour ce type de destinataire"
            )

        # Validation pour ONE_TIME
        if self.recurrence_type == "ONE_TIME" and not self.scheduled_at:
            raise ValidationError(
                "Une date et heure d'envoi est requise pour une programmation unique"
            )

        # Validation pour MONTHLY
        if self.recurrence_type == "MONTHLY":
            if not self.monthly_days:
                raise ValidationError(
                    "Au moins un jour du mois doit être sélectionné pour une programmation mensuelle"
                )
            if not self.monthly_time:
                raise ValidationError(
                    "Une heure d'envoi est requise pour une programmation mensuelle"
                )

            # Valider les jours (doivent être entre 1 et 31)
            try:
                days = [int(d.strip()) for d in self.monthly_days.split(",")]
                for day in days:
                    if day < 1 or day > 31:
                        raise ValueError(
                            f"Le jour {day} est invalide (doit être entre 1 et 31)"
                        )
            except ValueError as e:
                raise ValidationError(f"Format des jours invalide: {str(e)}")

    def get_recipient_emails(self):
        """Retourne la liste des emails destinataires"""
        if self.recipient_type == "ALL_USERS":
            return list(
                User.objects.filter(is_active=True).values_list("email", flat=True)
            )

        elif self.recipient_folder:
            # Récupérer tous les utilisateurs assignés à ce dossier
            # (selon le type de dossier: pole, filiale, service, sub_service)
            folder_type = self.recipient_folder.folder_type

            if folder_type == "pole":
                # Tous les utilisateurs dont branch est assignée à ce pôle
                return list(
                    User.objects.filter(
                        branch__parent=self.recipient_folder, is_active=True
                    ).values_list("email", flat=True)
                )
            elif folder_type == "filiale":
                # Tous les utilisateurs de cette filiale
                return list(
                    User.objects.filter(
                        branch=self.recipient_folder, is_active=True
                    ).values_list("email", flat=True)
                )
            elif folder_type in ["service", "sub_service"]:
                # Tous les utilisateurs assignés à ce service
                return list(
                    User.objects.filter(
                        department=self.recipient_folder, is_active=True
                    ).values_list("email", flat=True)
                )

        return []


class Event(models.Model):
    """Modèle pour les événements publics visibles par tous les utilisateurs"""

    STATUS_CHOICES = [
        ("DRAFT", "Brouillon"),
        ("PUBLISHED", "Publié"),
        ("ARCHIVED", "Archivé"),
    ]

    # Identifiant unique
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Informations de base
    title = models.CharField(max_length=255, help_text="Titre de l'événement")
    description = models.TextField(help_text="Description de l'événement")

    # Dates
    event_date = models.DateTimeField(help_text="Date et heure de l'événement")
    start_time = models.TimeField(null=True, blank=True, help_text="Heure de début")
    end_time = models.TimeField(null=True, blank=True, help_text="Heure de fin")

    # Lieu (optionnel)
    location = models.CharField(
        max_length=255, blank=True, help_text="Lieu de l'événement"
    )

    # Visibilité
    is_public = models.BooleanField(default=True, help_text="Visible par tous")
    visible_to_folder = models.ForeignKey(
        Folder,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="visible_events",
        help_text="Si non public, visible seulement à ce dossier",
    )

    # Métadonnées
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="created_events",
        help_text="Créateur de l'événement",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Statut
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="DRAFT")

    # Image/Media (optionnel)
    image = models.ImageField(
        upload_to="events/", null=True, blank=True, help_text="Image de l'événement"
    )

    class Meta:
        db_table = "events"
        verbose_name = "Événement"
        verbose_name_plural = "Événements"
        ordering = ["-event_date"]
        indexes = [
            models.Index(fields=["status", "event_date"]),
            models.Index(fields=["created_by"]),
            models.Index(fields=["is_public"]),
        ]

    def __str__(self):
        return f"{self.title} - {self.event_date.strftime('%d/%m/%Y %H:%M')}"

    def is_upcoming(self):
        """Vérifie si l'événement est à venir"""
        return self.event_date > timezone.now()

    def is_past(self):
        """Vérifie si l'événement est passé"""
        return self.event_date < timezone.now()
