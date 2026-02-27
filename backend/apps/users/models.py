# ========================================
# MODÈLES DJANGO - BASE DE DONNÉES
# ========================================

# ============================================================
# FILE: backend/apps/users/models.py
# ============================================================
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone


# ✅ LEGACY MODELS REMOVED: Branch et Department
# → Remplacés par Folder(folder_type='filiale') et Folder(folder_type='service')
# → User.branch pointe maintenant vers Folder(type='filiale')
# → User.department pointe maintenant vers Folder(type='service')


class UserManager(BaseUserManager):
    """Manager personnalisé pour le modèle User."""

    def create_user(self, matricule, email, password=None, **extra_fields):
        """Crée et sauvegarde un utilisateur normal."""
        if not matricule:
            raise ValueError("Le matricule est obligatoire")
        if not email:
            raise ValueError("L'email est obligatoire")

        email = self.normalize_email(email)
        user = self.model(matricule=matricule, email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, matricule, email, password=None, **extra_fields):
        """Crée et sauvegarde un superutilisateur."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", "ADMIN")

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser doit avoir is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser doit avoir is_superuser=True.")

        return self.create_user(matricule, email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """Modèle utilisateur personnalisé."""

    ROLE_CHOICES = [
        ("AGENT", "Agent"),
        ("ADMIN", "Administrateur"),
        ("POLE_MANAGER", "Gestionnaire Pôle"),
        ("FILIALE_MANAGER", "Gestionnaire Filiale"),
        ("SERVICE_MANAGER", "Gestionnaire Service"),
        ("DOCUMENT_MANAGER", "Gestionnaire Document (Re-routing)"),
    ]

    matricule = models.CharField(max_length=20, unique=True, db_index=True)
    email = models.EmailField(unique=True)
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)

    # Hiérarchie: Pôle > Filiale > Service
    # ✨ NOUVEAU: Champ pour le Pôle
    pole = models.ForeignKey(
        "folders.Folder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="pole_users",
        limit_choices_to={"folder_type": "pole"},
        help_text="Pôle de l'utilisateur (si POLE_MANAGER)",
    )

    # NOUVEAU: FK vers Folder (nouveau schéma: Pôle > Filiale > Service)
    branch = models.ForeignKey(
        "folders.Folder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="branch_users",
        limit_choices_to={"folder_type": "filiale"},  # CHANGÉ: 'branch' → 'filiale'
        help_text="Filiale de l'utilisateur",
    )
    department = models.ForeignKey(
        "folders.Folder",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="department_users",
        limit_choices_to={"folder_type": "service"},  # CHANGÉ: 'department' → 'service'
        help_text="Service (département) de l'utilisateur",
    )

    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="AGENT")
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    # Timestamps
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)

    objects = UserManager()

    USERNAME_FIELD = "matricule"
    REQUIRED_FIELDS = ["email", "first_name", "last_name"]

    class Meta:
        db_table = "users"
        verbose_name = "Utilisateur"
        verbose_name_plural = "Utilisateurs"
        ordering = ["-date_joined"]

    def __str__(self):
        return f"{self.matricule} - {self.get_full_name()}"

    def get_full_name(self):
        return f"{self.first_name} {self.last_name}"

    def get_short_name(self):
        return self.first_name

    @property
    def is_admin(self):
        return self.role == "ADMIN"

    @property
    def is_agent(self):
        return self.role == "AGENT"

    @property
    def is_pole_manager(self):
        return self.role == "POLE_MANAGER"

    @property
    def is_filiale_manager(self):
        return self.role == "FILIALE_MANAGER"

    @property
    def is_service_manager(self):
        return self.role == "SERVICE_MANAGER"

    @property
    def is_document_manager(self):
        return self.role == "DOCUMENT_MANAGER"

    def has_access_to_folder(self, folder):
        """
        Vérifie si l'utilisateur a accès à un dossier selon son rôle et sa hiérarchie.

        Hiérarchie:
        - ADMIN: Accès à tout
        - POLE_MANAGER: Accès au Pôle + ses filiales + ses services
        - FILIALE_MANAGER: Accès à la Filiale + ses services
        - SERVICE_MANAGER: Accès au Service uniquement
        - AGENT: Accès au Service uniquement
        - DOCUMENT_MANAGER: Peut re-router à n'importe quel dossier
        """
        if self.is_admin:
            return True

        if self.is_document_manager:
            return True  # Les document managers peuvent re-router partout

        if self.is_pole_manager:
            # Vérifier si le dossier est dans le Pôle courant
            if folder == self.pole:
                return True
            if folder.parent == self.pole:  # Filiale
                return True
            if folder.parent and folder.parent.parent == self.pole:  # Service
                return True
            return False

        if self.is_filiale_manager:
            # Vérifier si le dossier est dans la Filiale courante
            if folder == self.branch:
                return True
            if folder.parent == self.branch:  # Service
                return True
            if folder.parent and folder.parent.parent == self.branch:  # Sub-service
                return True
            return False

        if self.is_service_manager or self.is_agent:
            # Accès au Service uniquement
            if folder == self.department:
                return True
            if folder.parent == self.department:  # Sub-service
                return True
            return False

        return False
