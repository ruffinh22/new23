from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from django.contrib.auth import get_user_model

from .models import Department, Branch
from .serializers import (
    BranchSerializer,
    DepartmentSerializer,
    DepartmentDetailSerializer,
    UserSerializer,
    UserDetailSerializer,
    UserCreateSerializer,
    UserUpdateSerializer,
    CustomTokenObtainPairSerializer,
)

User = get_user_model()


class BranchViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les filiales."""
    
    queryset = Branch.objects.all()
    serializer_class = BranchSerializer
    
    def get_permissions(self):
        """Retourne les permissions selon l'action."""
        if self.action in ['list', 'retrieve', 'choices']:
            # Les listes publiques sont accessibles sans authentification (pour l'inscription)
            return [permissions.AllowAny()]
        # Les autres actions requièrent l'authentification et l'admin
        return [permissions.IsAdminUser()]
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retourne les choix de filiale."""
        choices = Branch.objects.filter(is_active=True).values('id', 'name')
        return Response(list(choices))
    
    @action(detail=True, methods=['get'])
    def departments(self, request, pk=None):
        """Retourne les départements de la filiale."""
        branch = self.get_object()
        departments = branch.departments.filter(is_active=True).values(
            'id', 'name', 'code', 'description'
        )
        return Response(list(departments))


class DepartmentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les départements."""
    
    queryset = Department.objects.all()
    
    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        if self.action == 'retrieve':
            return DepartmentDetailSerializer
        return DepartmentSerializer
    
    def get_permissions(self):
        """Retourne les permissions selon l'action."""
        if self.action in ['list', 'retrieve', 'choices']:
            # Les listes publiques sont accessibles sans authentification (pour l'inscription)
            return [permissions.AllowAny()]
        # Les autres actions requièrent l'authentification et l'admin
        return [permissions.IsAdminUser()]
    
    @action(detail=False, methods=['get'])
    def choices(self, request):
        """Retourne les choix de département."""
        choices = Department.objects.filter(is_active=True).values('id', 'name')
        return Response(list(choices))
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Retourne les utilisateurs du département."""
        department = self.get_object()
        users = department.users.values(
            'id', 'matricule', 'email', 'first_name', 'last_name', 'role', 'is_active'
        )
        return Response(list(users))


class UserViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les utilisateurs."""
    
    queryset = User.objects.all()
    parser_classes = (JSONParser, MultiPartParser, FormParser)
    
    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        elif self.action == 'retrieve':
            return UserDetailSerializer
        return UserSerializer
    
    def get_permissions(self):
        """Retourne les permissions selon l'action."""
        if self.action == 'register':
            return [permissions.AllowAny()]
        elif self.action == 'create':
            return [permissions.AllowAny()]
        elif self.action in ['list', 'retrieve', 'update', 'partial_update', 'destroy', 'me']:
            return [permissions.IsAuthenticated()]
        return [permissions.IsAdminUser()]
    
    def get_queryset(self):
        """Retourne les utilisateurs selon les permissions."""
        user = self.request.user
        
        # Les utilisateurs peuvent voir leur propre profil
        if self.action == 'retrieve':
            return User.objects.all()
        
        # Les admins voient tous les utilisateurs
        if user.is_staff or user.is_superuser:
            return User.objects.all()
        
        # Les autres utilisateurs ne peuvent voir que leur propre profil
        return User.objects.filter(id=user.id)
    
    def update(self, request, *args, **kwargs):
        """Override update to enforce admin permissions for role changes."""
        # Check if trying to update role field
        if 'role' in request.data or 'is_staff' in request.data:
            # Only admins can change role
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'Seuls les administrateurs peuvent modifier le rôle d\'un utilisateur'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().update(request, *args, **kwargs)
    
    def partial_update(self, request, *args, **kwargs):
        """Override partial_update to enforce admin permissions for role changes."""
        # Check if trying to update role field
        if 'role' in request.data or 'is_staff' in request.data:
            # Only admins can change role
            if not (request.user.is_staff or request.user.is_superuser):
                return Response(
                    {'error': 'Seuls les administrateurs peuvent modifier le rôle d\'un utilisateur'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return super().partial_update(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        """Retourne les informations de l'utilisateur connecté avec optimisations."""
        # Optimiser avec select_related pour éviter les N+1 queries
        user = User.objects.select_related('department').get(id=request.user.id)
        serializer = UserDetailSerializer(user)
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'], permission_classes=[permissions.AllowAny], authentication_classes=[])
    def register(self, request):
        """Endpoint d'enregistrement pour les nouvelles inscriptions."""
        from rest_framework_simplejwt.tokens import RefreshToken
        
        serializer = UserCreateSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            
            # Generate tokens for auto-login
            refresh = RefreshToken.for_user(user)
            access = refresh.access_token
            
            # Add user data to token
            access['matricule'] = user.matricule
            access['email'] = user.email
            access['first_name'] = user.first_name
            access['last_name'] = user.last_name
            access['role'] = user.role
            access['branch'] = user.branch_id
            access['branch_name'] = user.branch.name if user.branch else None
            access['department'] = user.department_id
            access['department_name'] = user.department.name if user.department else None
            
            return Response(
                {
                    'id': user.id,
                    'email': user.email,
                    'matricule': user.matricule,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'message': 'Utilisateur créé avec succès',
                    'refresh': str(refresh),
                    'access': str(access),
                },
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def by_department(self, request):
        """Retourne les utilisateurs d'un département."""
        department = request.query_params.get('department')
        if not department:
            return Response(
                {'error': 'Le paramètre "department" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(department=department)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAdminUser])
    def by_role(self, request):
        """Retourne les utilisateurs d'un rôle spécifique."""
        role = request.query_params.get('role')
        if not role:
            return Response(
                {'error': 'Le paramètre "role" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        users = User.objects.filter(role=role)
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def activate(self, request, pk=None):
        """Active un utilisateur."""
        user = self.get_object()
        user.is_active = True
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def deactivate(self, request, pk=None):
        """Désactive un utilisateur."""
        user = self.get_object()
        user.is_active = False
        user.save()
        serializer = self.get_serializer(user)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def change_password(self, request, pk=None):
        """Change le mot de passe d'un utilisateur."""
        user = self.get_object()
        
        # Vérifier que l'utilisateur ne peut changer que son propre mot de passe
        if user.id != request.user.id and not request.user.is_superuser:
            return Response(
                {'error': 'Vous ne pouvez pas changer le mot de passe d\'un autre utilisateur'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        old_password = request.data.get('old_password')
        new_password = request.data.get('new_password')
        
        if not old_password or not new_password:
            return Response(
                {'error': 'Les mots de passe ancien et nouveau sont requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user.check_password(old_password):
            return Response(
                {'error': 'L\'ancien mot de passe est incorrect'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(new_password)
        user.save()
        
        return Response({'detail': 'Mot de passe changé avec succès'})


class CustomTokenObtainPairView(TokenObtainPairView):
    """
    Vue personnalisée pour obtenir des tokens JWT.
    Utilise 'matricule' au lieu de 'username'.
    """
    serializer_class = CustomTokenObtainPairSerializer

