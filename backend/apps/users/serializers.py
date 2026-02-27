from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from .models import User
from apps.folders.models import Folder
from apps.folders.serializers import (
    FolderBranchSerializer,
    FolderDepartmentSerializer,
)
import logging

# Logger pour les événements d'authentification
logger = logging.getLogger("apps.users")

User = get_user_model()


# ===== SERIALIZERS POUR ACCÈS VIA API UNIFIÉE (Folder-based) =====


class BranchSerializer(FolderBranchSerializer):
    """Sérialiseur pour les Filiales via la structure unifiée Folder.

    Hérite de FolderBranchSerializer pour exposer les filiales comme des Folders type='filiale'.
    ✅ CONVERGED: Legacy Branch model removed, now uses Folder('filiale')
    """

    pass


class BranchSerializerV2(FolderBranchSerializer):
    """Alias pour BranchSerializer - compatibilité avec ancien code."""

    pass


class DepartmentSerializer(FolderDepartmentSerializer):
    """Sérialiseur pour les Services/Départements via la structure unifiée Folder.

    Hérite de FolderDepartmentSerializer pour exposer les services comme des Folders type='service'.
    ✅ CONVERGED: Legacy Department model removed, now uses Folder('service')
    """

    pass


class DepartmentSerializerV2(FolderDepartmentSerializer):
    """Alias pour DepartmentSerializer - compatibilité avec ancien code."""

    pass


class DepartmentDetailSerializer(FolderDepartmentSerializer):
    """Sérialiseur détaillé pour les Services/Départements.

    ✅ CONVERGED: Now derives from FolderDepartmentSerializer
    """

    pass


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle User."""

    class Meta:
        model = User
        fields = [
            "id",
            "matricule",
            "email",
            "first_name",
            "last_name",
            "pole",
            "branch",
            "department",
            "role",
            "phone",
            "avatar",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]


class UserDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour les utilisateurs."""

    department_display = serializers.SerializerMethodField()
    branch_display = serializers.SerializerMethodField()
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    permissions = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "matricule",
            "email",
            "first_name",
            "last_name",
            "department",
            "department_display",
            "branch",
            "branch_display",
            "role",
            "role_display",
            "phone",
            "avatar",
            "is_active",
            "is_staff",
            "is_superuser",
            "date_joined",
            "last_login",
            "permissions",
        ]
        read_only_fields = ["id", "date_joined", "last_login", "permissions"]

    def get_department_display(self, obj):
        """Retourne l'affichage du département ou None."""
        return obj.department.name if obj.department else None

    def get_branch_display(self, obj):
        """Retourne l'affichage de la branche ou None."""
        return obj.branch.name if obj.branch else None

    def get_permissions(self, obj):
        """Retourne la liste des permissions de l'utilisateur."""
        return list(obj.user_permissions.values_list("codename", flat=True))


class UserCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer des utilisateurs."""

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(
        write_only=True, min_length=8, required=False
    )
    pole = serializers.IntegerField(required=False, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.IntegerField(required=False, allow_null=True)
    role = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    class Meta:
        model = User
        fields = [
            "matricule",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "pole",
            "department",
            "branch",
            "role",
            "phone",
        ]

    def validate(self, data):
        password_confirm = data.pop("password_confirm", None)
        if password_confirm and data["password"] != password_confirm:
            raise serializers.ValidationError(
                {"password": "Les mots de passe ne correspondent pas."}
            )

        # Extract pole_id before processing
        pole_id = data.pop("pole", None)

        # Convert department name to Folder(type='service') instance
        department_name = data.pop("department", None)
        branch_id = data.pop("branch", None)

        if department_name:
            try:
                # Filter by name and type='service'
                # If branch_id (Folder type='filiale') is provided, find service that is child of this filiale
                if branch_id:
                    department = Folder.objects.get(
                        name=department_name, folder_type="service", parent_id=branch_id
                    )
                else:
                    department = Folder.objects.get(
                        name=department_name, folder_type="service"
                    )
                data["department"] = department
            except Folder.DoesNotExist:
                raise serializers.ValidationError(
                    {
                        "department": f'Service "{department_name}" introuvable pour cette filiale.'
                    }
                )
            except Folder.MultipleObjectsReturned:
                raise serializers.ValidationError(
                    {
                        "department": f'Plusieurs services "{department_name}" trouvés. Spécifiez la filiale.'
                    }
                )

        # Put pole_id and branch_id back in data for User creation
        if pole_id:
            data["pole_id"] = pole_id
        if branch_id:
            data["branch_id"] = branch_id

        return data

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        user.is_active = True  # Active the user immediately after registration
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour mettre à jour un utilisateur."""

    role = serializers.ChoiceField(choices=User.ROLE_CHOICES, required=False)
    is_staff = serializers.BooleanField(required=False)
    password = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False, allow_blank=True)
    pole = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.filter(folder_type="pole", is_active=True),
        required=False,
        allow_null=True,
    )
    branch = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.filter(folder_type="filiale", is_active=True),
        required=False,
        allow_null=True,
    )
    department = serializers.PrimaryKeyRelatedField(
        queryset=Folder.objects.filter(folder_type="service", is_active=True),
        required=False,
        allow_null=True,
    )
    class Meta:
        model = User
        fields = [
            "email",
            "first_name",
            "last_name",
            "pole",
            "department",
            "branch",
            "phone",
            "avatar",
            "role",
            "is_staff",
            "password",
            "password_confirm",
        ]

    def validate_role(self, value):
        """Valider le rôle."""
        if value not in dict(User.ROLE_CHOICES):
            raise serializers.ValidationError("Rôle invalide.")
        return value

    def validate(self, data):
        """Valider les données, notamment les mots de passe."""
        password = data.get('password')
        password_confirm = data.get('password_confirm')
        
        # Si un mot de passe est fourni
        if password:
            if password_confirm != password:
                raise serializers.ValidationError(
                    {"password": "Les mots de passe ne correspondent pas."}
                )
            # Retirer password_confirm car ce n'est pas un champ du modèle
            data.pop('password_confirm', None)
        else:
            # Si aucun mot de passe, retirer les deux champs
            data.pop('password', None)
            data.pop('password_confirm', None)
        
        return data

    def update(self, instance, validated_data):
        """Mettre à jour l'utilisateur et synchroniser role/is_staff."""
        # Extract password before handling other fields
        password = validated_data.pop('password', None)
        
        # Handle branch - already a Folder object from PrimaryKeyRelatedField
        branch = validated_data.get("branch")
        department = validated_data.get("department")

        # Validate department belongs to branch (department.parent == branch)
        if department is not None and branch is not None:
            if department.parent_id != branch.id:
                raise serializers.ValidationError(
                    {"department": "Le service n'appartient pas à cette filiale."}
                )

        # Handle role and is_staff synchronization
        role = validated_data.get("role")
        is_staff = validated_data.get("is_staff")

        # If role is being updated, auto-adjust is_staff
        if role:
            validated_data["role"] = role
            # Auto-set is_staff based on role
            validated_data["is_staff"] = role == "ADMIN"
        elif is_staff is not None:
            # If only is_staff is being updated, ensure role is set appropriately
            validated_data["is_staff"] = is_staff
            if is_staff and instance.role != "ADMIN":
                validated_data["role"] = "ADMIN"
            elif not is_staff and instance.role == "ADMIN":
                validated_data["role"] = "AGENT"

        # Explicitly update all fields on the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        # Update password if provided
        if password:
            instance.set_password(password)

        # Explicitly call save() to ensure persistence
        instance.save()

        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """
    Sérialiseur personnalisé pour obtenir des tokens JWT.
    Utilise 'matricule' au lieu de 'username'.
    """

    matricule = serializers.CharField()
    password = serializers.CharField()

    def validate(self, attrs):
        """Valider les credentials avec matricule."""
        matricule = attrs.get("matricule")
        authenticate_kwargs = {
            "matricule": matricule,
            "password": attrs.get("password"),
        }
        try:
            authenticate_kwargs["request"] = self.context.get("request")
        except KeyError:
            pass

        self.user = authenticate(**authenticate_kwargs)

        if not self.user:
            # Enregistrer l'échec d'authentification
            logger.warning(
                f"Tentative de connexion échouée | Matricule: {matricule} | Statut: LOGIN_FAILED"
            )
            msg = _("Unable to log in with provided credentials.")
            raise serializers.ValidationError(msg, code="authentication")

        # Enregistrer la connexion réussie
        logger.info(
            f"Connexion réussie | Utilisateur: {self.user.matricule} ({self.user.first_name} {self.user.last_name}) | "
            f"Rôle: {self.user.role} | Département: {self.user.department.name if self.user.department else 'N/A'} | "
            f"Statut: LOGIN_SUCCESS"
        )

        # Appeler la méthode parent pour obtenir les tokens
        data = {}
        refresh = self.get_token(self.user)
        data["refresh"] = str(refresh)
        data["access"] = str(refresh.access_token)
        return data

    @classmethod
    def get_token(cls, user):
        """Obtenir les tokens pour l'utilisateur avec ses données incluses."""
        token = RefreshToken.for_user(user)

        # Ajouter les données utilisateur au token pour éviter un appel /me supplémentaire
        token["matricule"] = user.matricule
        token["email"] = user.email
        token["first_name"] = user.first_name
        token["last_name"] = user.last_name
        token["role"] = (
            user.role
        )  # Use the actual role value (AGENT, ADMIN) not the display name

        # Pole - safely access the FK with explicit None checks
        try:
            if hasattr(user, 'pole') and user.pole_id is not None:
                token["pole"] = user.pole.id
                token["pole_id"] = user.pole.id
                token["pole_name"] = user.pole.name
            else:
                token["pole"] = None
                token["pole_id"] = None
                token["pole_name"] = None
        except Exception:
            token["pole"] = None
            token["pole_id"] = None
            token["pole_name"] = None

        # Branch (Filiale) - safely access the FK with explicit None checks
        try:
            if hasattr(user, 'branch') and user.branch_id is not None:
                token["branch"] = user.branch.id
                token["branch_id"] = user.branch.id
                token["branch_name"] = user.branch.name
                token["filiale_id"] = user.branch.id
                token["filiale_name"] = user.branch.name
            else:
                token["branch"] = None
                token["branch_id"] = None
                token["branch_name"] = None
                token["filiale_id"] = None
                token["filiale_name"] = None
        except Exception:
            token["branch"] = None
            token["branch_id"] = None
            token["branch_name"] = None
            token["filiale_id"] = None
            token["filiale_name"] = None

        # Service (Department folder) - safely access the FK with explicit None checks
        try:
            if hasattr(user, 'department') and user.department_id is not None:
                token["service"] = user.department.id
                token["service_id"] = user.department.id
                token["service_name"] = user.department.name
            else:
                token["service"] = None
                token["service_id"] = None
                token["service_name"] = None
        except Exception:
            token["service"] = None
            token["service_id"] = None
            token["service_name"] = None

        token["is_staff"] = user.is_staff
        token["is_superuser"] = user.is_superuser
        if user.avatar:
            token["avatar"] = str(user.avatar)

        return token


# Import de la traduction


class UserDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour les utilisateurs avec les nouveaux rôles hiérarchiques.
    Inclut: Pôle, Filiale, Service et permissions d'accès.
    """

    pole_name = serializers.CharField(
        source="pole.name", read_only=True, allow_null=True
    )
    branch_name = serializers.CharField(
        source="branch.name", read_only=True, allow_null=True
    )
    department_name = serializers.CharField(
        source="department.name", read_only=True, allow_null=True
    )
    role_display = serializers.CharField(source="get_role_display", read_only=True)
    is_admin = serializers.SerializerMethodField()
    is_pole_manager = serializers.SerializerMethodField()
    is_filiale_manager = serializers.SerializerMethodField()
    is_service_manager = serializers.SerializerMethodField()
    is_document_manager = serializers.SerializerMethodField()
    access_hierarchy = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            "id",
            "matricule",
            "email",
            "first_name",
            "last_name",
            "pole",
            "pole_name",
            "branch",
            "branch_name",
            "department",
            "department_name",
            "role",
            "role_display",
            "is_admin",
            "is_pole_manager",
            "is_filiale_manager",
            "is_service_manager",
            "is_document_manager",
            "phone",
            "avatar",
            "access_hierarchy",
            "is_active",
            "is_staff",
            "date_joined",
            "last_login",
        ]
        read_only_fields = ["id", "date_joined", "last_login"]

    def get_is_admin(self, obj):
        return obj.is_admin

    def get_is_pole_manager(self, obj):
        return obj.is_pole_manager

    def get_is_filiale_manager(self, obj):
        return obj.is_filiale_manager

    def get_is_service_manager(self, obj):
        return obj.is_service_manager

    def get_is_document_manager(self, obj):
        return obj.is_document_manager

    def get_access_hierarchy(self, obj):
        """Retourne la hiérarchie d'accès de l'utilisateur."""
        return {
            "role": obj.role,
            "pole": obj.pole.name if obj.pole else None,
            "filiale": obj.branch.name if obj.branch else None,
            "service": obj.department.name if obj.department else None,
            "access_level": self._get_access_level(obj),
        }

    @staticmethod
    def _get_access_level(user):
        """Retourne le niveau d'accès de l'utilisateur."""
        if user.role == "ADMIN":
            return 0  # Maximum access
        elif user.role == "POLE_MANAGER":
            return 1  # Pôle level
        elif user.role == "FILIALE_MANAGER":
            return 2  # Filiale level
        elif user.role == "SERVICE_MANAGER":
            return 3  # Service level
        elif user.role == "DOCUMENT_MANAGER":
            return 0  # Can re-route globally
        else:
            return 4  # Agent - service only


class DocumentShareSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les partages de documents."""

    shared_by_name = serializers.CharField(
        source="shared_by.get_full_name", read_only=True
    )
    shared_with_name = serializers.SerializerMethodField()
    shared_with_folder_name = serializers.CharField(
        source="shared_with_folder.name", read_only=True
    )
    shared_with_folder_type = serializers.CharField(
        source="shared_with_folder.folder_type", read_only=True
    )
    document_name = serializers.CharField(source="document.title", read_only=True)
    permission_display = serializers.CharField(
        source="get_permission_display", read_only=True
    )
    share_type_display = serializers.CharField(
        source="get_share_type_display", read_only=True
    )
    is_valid = serializers.SerializerMethodField()

    class Meta:
        from django.apps import apps

        model = apps.get_model("documents", "DocumentShare")
        fields = [
            "id",
            "document",
            "document_name",
            "shared_by",
            "shared_by_name",
            "share_type",
            "share_type_display",
            "shared_with",
            "shared_with_name",
            "shared_with_folder",
            "shared_with_folder_name",
            "shared_with_folder_type",
            "permission",
            "permission_display",
            "message",
            "shared_at",
            "expires_at",
            "accessed_at",
            "is_valid",
        ]
        read_only_fields = ["id", "shared_at", "accessed_at", "shared_by"]

    def get_shared_with_name(self, obj):
        if obj.shared_with:
            return obj.shared_with.get_full_name()
        return None

    def get_is_valid(self, obj):
        return obj.is_valid()


class DocumentShareCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer un partage de document."""

    # Support deux modes: partage avec utilisateur OU avec dossier
    shared_with_matricule = serializers.CharField(
        write_only=True, required=False, allow_blank=True
    )
    shared_with_folder_id = serializers.IntegerField(write_only=True, required=False)

    class Meta:
        from django.apps import apps

        model = apps.get_model("documents", "DocumentShare")
        fields = [
            "document",
            "share_type",
            "shared_with_matricule",
            "shared_with_folder_id",
            "permission",
            "message",
            "expires_at",
        ]

    def validate(self, data):
        """Valider que soit shared_with_matricule soit shared_with_folder_id est fourni."""
        shared_with_matricule = data.get("shared_with_matricule")
        shared_with_folder_id = data.get("shared_with_folder_id")

        if not shared_with_matricule and not shared_with_folder_id:
            raise serializers.ValidationError(
                "Either 'shared_with_matricule' (for user) or 'shared_with_folder_id' (for folder) must be provided"
            )

        if shared_with_matricule and shared_with_folder_id:
            raise serializers.ValidationError(
                "Provide either 'shared_with_matricule' OR 'shared_with_folder_id', not both"
            )

        return data

    def create(self, validated_data):
        """Crée le partage (utilisateur ou dossier)."""
        from apps.users.models import User
        from apps.folders.models import Folder

        shared_with_matricule = validated_data.pop("shared_with_matricule", None)
        shared_with_folder_id = validated_data.pop("shared_with_folder_id", None)

        share_obj = {}

        if shared_with_matricule:
            # Partage avec utilisateur
            try:
                user = User.objects.get(matricule=shared_with_matricule)
                share_obj = {
                    "shared_with": user,
                    "share_type": "USER",
                    **validated_data,
                }
            except User.DoesNotExist:
                raise serializers.ValidationError(
                    f"Utilisateur '{shared_with_matricule}' not found"
                )

        elif shared_with_folder_id:
            # Partage avec dossier
            try:
                folder = Folder.objects.get(id=shared_with_folder_id)
                share_obj = {
                    "shared_with_folder": folder,
                    "share_type": "FOLDER",
                    **validated_data,
                }
            except Folder.DoesNotExist:
                raise serializers.ValidationError(
                    f"Dossier avec id {shared_with_folder_id} not found"
                )

        from django.apps import apps

        DocumentShare = apps.get_model("documents", "DocumentShare")
        share_obj["shared_by"] = self.context["request"].user

        return DocumentShare.objects.create(**share_obj)
