"""
Classe de permissions personnalisées pour les documents.
"""

from rest_framework import permissions


class IsOwnerOrAdmin(permissions.BasePermission):
    """
    Permission: L'utilisateur est le propriétaire du document ou un admin.
    """

    def has_object_permission(self, request, view, obj):
        # Read access pour owner ou admin
        if request.method in permissions.SAFE_METHODS:
            return obj.agent == request.user or request.user.is_admin

        # Write access seulement pour l'owner
        return obj.agent == request.user


class IsAdmin(permissions.BasePermission):
    """
    Permission: L'utilisateur est authentifié et admin.
    """

    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.is_admin


class IsAdminOrReadOnly(permissions.BasePermission):
    """
    Permission: Admin peut tout faire, autres en lecture seule.
    """

    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True
        return request.user and request.user.is_admin


class IsOwner(permissions.BasePermission):
    """
    Permission: L'utilisateur est le propriétaire de l'objet.
    """

    def has_object_permission(self, request, view, obj):
        return obj.agent == request.user


class CanRerouteDocument(permissions.BasePermission):
    """Permission pour re-router un document."""

    def has_permission(self, request, view):
        """Vérifie si l'utilisateur peut re-router des documents."""
        user = request.user

        # Seuls ces rôles peuvent re-router
        allowed_roles = [
            "ADMIN",
            "DOCUMENT_MANAGER",
            "POLE_MANAGER",
            "FILIALE_MANAGER",
            "SERVICE_MANAGER",
        ]

        return user.role in allowed_roles

    def has_object_permission(self, request, view, obj):
        """Vérifie le re-routage spécifique."""
        user = request.user

        # Admin: tout peut
        if user.role == "ADMIN" or user.is_staff:
            return True

        # DOCUMENT_MANAGER: peut re-router partout
        if user.role == "DOCUMENT_MANAGER":
            return True

        # Autres: vérifier accès au document ET accès à la destination
        return user.has_access_to_folder(obj.destination_folder)


class IsDocumentManager(permissions.BasePermission):
    """Permission pour les gestionnaires de documents."""

    def has_permission(self, request, view):
        user = request.user
        return user.role in ["ADMIN", "DOCUMENT_MANAGER"]


class HasFolderAccess(permissions.BasePermission):
    """Permission pour accéder à un dossier selon la hiérarchie."""

    def has_object_permission(self, request, view, obj):
        """Vérifie si l'utilisateur a accès au dossier."""
        user = request.user

        # Admin: accès total
        if user.role == "ADMIN" or user.is_staff:
            return True

        # Vérifie l'accès selon le rôle
        return user.has_access_to_folder(obj)
