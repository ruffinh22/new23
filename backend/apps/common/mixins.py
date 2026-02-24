"""
Mixins réutilisables pour les ViewSets.
Centralisent la logique métier commune.
"""

from rest_framework import permissions as drf_permissions
from rest_framework.exceptions import PermissionDenied


class PermissionMixin:
    """✅ MIXIN: Centralise la logique de permissions (is_admin, etc).
    
    Élimine la duplication de vérifications is_staff / is_superuser / role dans tous les ViewSets.
    """
    
    def is_admin(self, user) -> bool:
        """Vérifie si l'utilisateur est admin (single source of truth).
        
        Combine:
        - is_staff (Django built-in)
        - is_superuser (Django built-in)
        - role == 'ADMIN' (custom field pour SGDRA)
        
        Returns:
            bool: True si admin, False sinon
        """
        if not user or not user.is_authenticated:
            return False
        
        return (
            user.is_staff or 
            user.is_superuser or 
            (hasattr(user, 'role') and user.role == 'ADMIN')
        )
    
    def is_manager(self, user, folder) -> bool:
        """Vérifie si l'utilisateur est manager du dossier/département.
        
        Critères:
        - Admin = manager de tout
        - Manager FILIALE = manager de ses services
        - Manager SERVICE = manager de ses documents
        
        Args:
            user: User object
            folder: Folder object (département/filiale/etc)
            
        Returns:
            bool: True si manager (sinon False)
        """
        if self.is_admin(user):
            return True
        
        if not hasattr(user, 'department') or not user.department:
            return False
        
        # Vérifier si on est le manager de ce département
        return user.department_id == folder.id
    
    def require_admin(self, user):
        """Lève PermissionDenied si pas admin."""
        if not self.is_admin(user):
            raise PermissionDenied("Admin access required")
    
    def get_action_permissions(self, action: str) -> list:
        """Retourne les permissions requises pour une action.
        
        Pattern standard:
        - list/retrieve/choices → Authenticated seulement
        - create/update/destroy → Admin seulement
        
        Args:
            action: nom de l'action (list, create, etc)
        
        Returns:
            list: Liste des permission_classes
        """
        if action in ['list', 'retrieve', 'choices', 'decisions']:
            # Lecture publique (authentifiés seulement)
            return [drf_permissions.IsAuthenticated()]
        
        # Par défaut: admin seulement
        return [drf_permissions.IsAdminUser()]


class FilterMixin:
    """✅ MIXIN: Ajoute des méthodes de filtrage réutilisables.
    
    Élimine la duplication du code de filtrage entre les ViewSets.
    """
    
    def filter_by_status(self, queryset, status: str):
        """Filtre par statut."""
        if status:
            return queryset.filter(status=status)
        return queryset
    
    def filter_by_date_range(self, queryset, created_after=None, created_before=None):
        """Filtre par plage de dates (created_at)."""
        if created_after:
            queryset = queryset.filter(created_at__gte=created_after)
        if created_before:
            queryset = queryset.filter(created_at__lte=created_before)
        return queryset
    
    def filter_by_department(self, queryset, department_id: int):
        """Filtre par département (agent.department)."""
        if department_id:
            return queryset.filter(agent__department_id=department_id)
        return queryset
    
    def filter_by_folder(self, queryset, folder_id: int):
        """Filtre par dossier/folder."""
        if folder_id:
            return queryset.filter(folder_id=folder_id)
        return queryset


class PaginationMixin:
    """✅ MIXIN: Ajoute des méthodes de pagination réutilisables."""
    
    DEFAULT_PAGE_SIZE = 25
    MAX_PAGE_SIZE = 100
    
    def get_page_size(self, request):
        """Extrait et valide la taille de page depuis les query params."""
        try:
            page_size = int(request.query_params.get('page_size', self.DEFAULT_PAGE_SIZE))
            # Limiter à MAX_PAGE_SIZE
            return min(page_size, self.MAX_PAGE_SIZE)
        except (ValueError, TypeError):
            return self.DEFAULT_PAGE_SIZE
