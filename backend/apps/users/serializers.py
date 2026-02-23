from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model, authenticate
from django.utils.translation import gettext_lazy as _
from .models import User, Department, Branch
from apps.folders.serializers import FolderSerializer, FolderBranchSerializer, FolderDepartmentSerializer
from apps.documents.models import DocumentTransfer
import logging

# Logger pour les événements d'authentification
logger = logging.getLogger('apps.users')

User = get_user_model()


# ===== SERIALIZERS POUR ACCÈS VIA API UNIFIÉE  (Folder-based) =====

class BranchSerializerV2(FolderBranchSerializer):
    """Sérialiseur pour les Branches via la structure unifiée Folder.
    
    Utilise FolderBranchSerializer pour exposer les filiales comme des Folders type='branch'.
    """
    pass


class DepartmentSerializerV2(FolderDepartmentSerializer):
    """Sérialiseur pour les Departements via la structure unifiée Folder.
    
    Utilise FolderDepartmentSerializer pour exposer les département comme des Folders type='department'.
    """
    pass


# ===== SERIALIZERS POUR COMPATIBILITÉ RÉTROACTIVE (Branch/Department models) =====

class BranchSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle Branch - DEPRECATED.
    
    Garder pour la compatibilité rétroactive. Utiliser BranchSerializerV2 pour nouvelle API.
    """
    
    folder_name = serializers.CharField(source='folder.name', read_only=True)
    departments_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Branch
        fields = [
            'id', 'name', 'code', 'country_code', 'description', 'folder',
            'folder_name', 'departments_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'folder', 'created_at', 'updated_at']
    
    def get_departments_count(self, obj):
        """Compte le nombre de départements dans la filiale."""
        return obj.departments.count() if obj.departments else 0


class DepartmentSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle Department - DEPRECATED.
    
    Garder pour la compatibilité rétroactive. Utiliser DepartmentSerializerV2 pour nouvelle API.
    """
    
    folder_name = serializers.CharField(source='folder.name', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    users_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'folder',
            'folder_name', 'branch', 'branch_name', 'users_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'folder', 'created_at', 'updated_at']
    
    def get_users_count(self, obj):
        """Compte le nombre d'utilisateurs dans le département."""
        if not obj.folder:
            return 0
        
        # Count users where department (FK to Folder) points to this department's folder
        from apps.users.models import User
        return User.objects.filter(department=obj.folder).count()


class DepartmentDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour les départements - DEPRECATED."""
    
    folder_data = serializers.SerializerMethodField()
    users = serializers.SerializerMethodField()
    
    class Meta:
        model = Department
        fields = [
            'id', 'name', 'code', 'description', 'folder',
            'folder_data', 'users', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'folder', 'created_at', 'updated_at']
    
    def get_folder_data(self, obj):
        """Retourne les détails du dossier."""
        if obj.folder:
            return {
                'id': obj.folder.id,
                'name': obj.folder.name,
                'full_path': obj.folder.get_full_path(),
            }
        return None
    
    def get_users(self, obj):
        """Retourne la liste des utilisateurs."""
        if not obj.folder:
            return []
        
        from apps.users.models import User
        users = User.objects.filter(department=obj.folder).values('id', 'matricule', 'email', 'first_name', 'last_name', 'role')
        return list(users)


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur pour le modèle User."""
    
    class Meta:
        model = User
        fields = [
            'id', 'matricule', 'email', 'first_name', 'last_name',
            'department', 'role', 'phone', 'avatar', 'is_active', 'is_staff',
            'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']


class UserDetailSerializer(serializers.ModelSerializer):
    """Sérialiseur détaillé pour les utilisateurs."""
    
    department_display = serializers.SerializerMethodField()
    branch_display = serializers.SerializerMethodField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'matricule', 'email', 'first_name', 'last_name',
            'department', 'department_display', 'branch', 'branch_display',
            'role', 'role_display',
            'phone', 'avatar', 'is_active', 'is_staff', 'is_superuser',
            'date_joined', 'last_login', 'permissions'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'permissions']
    
    def get_department_display(self, obj):
        """Retourne l'affichage du département ou None."""
        return obj.department.name if obj.department else None
    
    def get_branch_display(self, obj):
        """Retourne l'affichage de la branche ou None."""
        return obj.branch.name if obj.branch else None
    
    def get_permissions(self, obj):
        """Retourne la liste des permissions de l'utilisateur."""
        return list(obj.user_permissions.values_list('codename', flat=True))


class UserCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer des utilisateurs."""
    
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8, required=False)
    pole = serializers.IntegerField(required=False, allow_null=True)
    department = serializers.CharField(required=False, allow_blank=True)
    branch = serializers.IntegerField(required=False, allow_null=True)
    role = serializers.CharField(required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = User
        fields = [
            'matricule', 'email', 'password', 'password_confirm',
            'first_name', 'last_name', 'pole', 'department', 'branch', 'role', 'phone'
        ]
    
    def validate(self, data):
        password_confirm = data.pop('password_confirm', None)
        if password_confirm and data['password'] != password_confirm:
            raise serializers.ValidationError({'password': 'Les mots de passe ne correspondent pas.'})
        
        # Extract pole_id before processing
        pole_id = data.pop('pole', None)
        
        # Convert department name to Department instance
        department_name = data.pop('department', None)
        branch_id = data.pop('branch', None)
        
        if department_name:
            try:
                # Filter by both name and branch if branch is provided
                query = {'name': department_name}
                if branch_id:
                    query['branch_id'] = branch_id
                
                department = Department.objects.get(**query)
                data['department'] = department
            except Department.DoesNotExist:
                raise serializers.ValidationError({'department': f'Département "{department_name}" introuvable pour cette filiale.'})
            except Department.MultipleObjectsReturned:
                raise serializers.ValidationError({'department': f'Plusieurs départements "{department_name}" trouvés. Spécifiez la filiale.'})
        
        # Put pole_id and branch_id back in data for User creation
        if pole_id:
            data['pole_id'] = pole_id
        if branch_id:
            data['branch_id'] = branch_id
        
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
    branch = serializers.PrimaryKeyRelatedField(queryset=Branch.objects.all(), required=False, allow_null=True)
    department = serializers.PrimaryKeyRelatedField(queryset=Department.objects.all(), required=False, allow_null=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'first_name', 'last_name', 'department', 'branch', 'phone', 'avatar',
            'role', 'is_staff'
        ]
    
    def validate_role(self, value):
        """Valider le rôle."""
        if value not in dict(User.ROLE_CHOICES):
            raise serializers.ValidationError('Rôle invalide.')
        return value
    
    def update(self, instance, validated_data):
        """Mettre à jour l'utilisateur et synchroniser role/is_staff."""
        # Handle branch - already a Branch object from PrimaryKeyRelatedField
        branch = validated_data.get('branch')
        department = validated_data.get('department')
        
        # Validate department belongs to branch
        if department is not None and branch is not None:
            if department.branch_id != branch.id:
                raise serializers.ValidationError({'department': 'Le département n\'appartient pas à cette filiale.'})
        
        # Handle role and is_staff synchronization
        role = validated_data.get('role')
        is_staff = validated_data.get('is_staff')
        
        # If role is being updated, auto-adjust is_staff
        if role:
            validated_data['role'] = role
            # Auto-set is_staff based on role
            validated_data['is_staff'] = role == 'ADMIN'
        elif is_staff is not None:
            # If only is_staff is being updated, ensure role is set appropriately
            validated_data['is_staff'] = is_staff
            if is_staff and instance.role != 'ADMIN':
                validated_data['role'] = 'ADMIN'
            elif not is_staff and instance.role == 'ADMIN':
                validated_data['role'] = 'AGENT'
        
        # Explicitly update all fields on the instance
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        
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
        matricule = attrs.get('matricule')
        authenticate_kwargs = {
            'matricule': matricule,
            'password': attrs.get('password'),
        }
        try:
            authenticate_kwargs['request'] = self.context.get('request')
        except KeyError:
            pass
        
        self.user = authenticate(**authenticate_kwargs)
        
        if not self.user:
            # Enregistrer l'échec d'authentification
            logger.warning(
                f'Tentative de connexion échouée | Matricule: {matricule} | Statut: LOGIN_FAILED'
            )
            msg = _('Unable to log in with provided credentials.')
            raise serializers.ValidationError(msg, code='authentication')
        
        # Enregistrer la connexion réussie
        logger.info(
            f'Connexion réussie | Utilisateur: {self.user.matricule} ({self.user.first_name} {self.user.last_name}) | '
            f'Rôle: {self.user.role} | Département: {self.user.department.name if self.user.department else "N/A"} | '
            f'Statut: LOGIN_SUCCESS'
        )
        
        # Appeler la méthode parent pour obtenir les tokens
        data = {}
        refresh = self.get_token(self.user)
        data['refresh'] = str(refresh)
        data['access'] = str(refresh.access_token)
        return data
    
    @classmethod
    def get_token(cls, user):
        """Obtenir les tokens pour l'utilisateur avec ses données incluses."""
        token = RefreshToken.for_user(user)
        
        # Ajouter les données utilisateur au token pour éviter un appel /me supplémentaire
        token['matricule'] = user.matricule
        token['email'] = user.email
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['role'] = user.role  # Use the actual role value (AGENT, ADMIN) not the display name
        
        # Branch (Filiale) 
        token['branch'] = user.branch.id if user.branch else None
        token['branch_name'] = user.branch.name if user.branch else None
        
        # Department
        token['department'] = user.department.id if user.department else None
        token['department_name'] = user.department.name if user.department else None
        
        token['is_staff'] = user.is_staff
        token['is_superuser'] = user.is_superuser
        if user.avatar:
            token['avatar'] = str(user.avatar)
        
        return token


# Import de la traduction
from django.utils.translation import gettext_lazy as _



class UserDetailSerializer(serializers.ModelSerializer):
    """
    Sérialiseur détaillé pour les utilisateurs avec les nouveaux rôles hiérarchiques.
    Inclut: Pôle, Filiale, Service et permissions d'accès.
    """
    
    pole_name = serializers.CharField(source='pole.name', read_only=True, allow_null=True)
    branch_name = serializers.CharField(source='branch.name', read_only=True, allow_null=True)
    department_name = serializers.CharField(source='department.name', read_only=True, allow_null=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    is_admin = serializers.SerializerMethodField()
    is_pole_manager = serializers.SerializerMethodField()
    is_filiale_manager = serializers.SerializerMethodField()
    is_service_manager = serializers.SerializerMethodField()
    is_document_manager = serializers.SerializerMethodField()
    access_hierarchy = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'matricule', 'email', 'first_name', 'last_name',
            'pole', 'pole_name',
            'branch', 'branch_name',
            'department', 'department_name',
            'role', 'role_display',
            'is_admin', 'is_pole_manager', 'is_filiale_manager', 'is_service_manager', 'is_document_manager',
            'phone', 'avatar',
            'access_hierarchy',
            'is_active', 'is_staff', 'date_joined', 'last_login'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
    
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
            'role': obj.role,
            'pole': obj.pole.name if obj.pole else None,
            'filiale': obj.branch.name if obj.branch else None,
            'service': obj.department.name if obj.department else None,
            'access_level': self._get_access_level(obj),
        }
    
    @staticmethod
    def _get_access_level(user):
        """Retourne le niveau d'accès de l'utilisateur."""
        if user.role == 'ADMIN':
            return 0  # Maximum access
        elif user.role == 'POLE_MANAGER':
            return 1  # Pôle level
        elif user.role == 'FILIALE_MANAGER':
            return 2  # Filiale level
        elif user.role == 'SERVICE_MANAGER':
            return 3  # Service level
        elif user.role == 'DOCUMENT_MANAGER':
            return 0  # Can re-route globally
        else:
            return 4  # Agent - service only



class DocumentShareSerializer(serializers.ModelSerializer):
    """Sérialiseur pour les partages de documents entre utilisateurs."""
    
    shared_by_name = serializers.CharField(source='shared_by.get_full_name', read_only=True)
    shared_with_name = serializers.CharField(source='shared_with.get_full_name', read_only=True)
    document_name = serializers.CharField(source='document.name', read_only=True)
    permission_display = serializers.CharField(source='get_permission_display', read_only=True)
    is_valid = serializers.SerializerMethodField()
    
    class Meta:
        from django.apps import apps
        model = apps.get_model('documents', 'DocumentShare')
        fields = [
            'id', 'document', 'document_name',
            'shared_by', 'shared_by_name',
            'shared_with', 'shared_with_name',
            'permission', 'permission_display',
            'message', 'shared_at', 'expires_at',
            'accessed_at', 'is_valid'
        ]
        read_only_fields = ['id', 'shared_at', 'accessed_at', 'shared_by']
    
    def get_is_valid(self, obj):
        return obj.is_valid()


class DocumentShareCreateSerializer(serializers.ModelSerializer):
    """Sérialiseur pour créer un partage de document."""
    
    shared_with_matricule = serializers.CharField(write_only=True, required=True)
    
    class Meta:
        from django.apps import apps
        model = apps.get_model('documents', 'DocumentShare')
        fields = [
            'document', 'shared_with_matricule',
            'permission', 'message', 'expires_at'
        ]
    
    def validate_shared_with_matricule(self, value):
        """Vérifie que l'utilisateur existe."""
        from apps.users.models import User
        try:
            user = User.objects.get(matricule=value)
            return user
        except User.DoesNotExist:
            raise serializers.ValidationError(f"Utilisateur '{value}' not found")
    
    def create(self, validated_data):
        """Crée le partage avec l'utilisateur courant comme partageur."""
        request = self.context.get('request')
        shared_with = validated_data.pop('shared_with_matricule')
        
        from django.apps import apps
        DocumentShare = apps.get_model('documents', 'DocumentShare')
        
        share = DocumentShare.objects.create(
            shared_by=request.user,
            shared_with=shared_with,
            **validated_data
        )
        return share
