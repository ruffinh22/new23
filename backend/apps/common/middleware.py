"""
Middleware personnalisé pour le logging de sécurité et d'audit.
"""

import logging
from django.utils.deprecation import MiddlewareMixin

logger = logging.getLogger("apps.users")
audit_logger = logging.getLogger("apps")


class AuditMiddleware(MiddlewareMixin):
    """
    Middleware pour logger les événements de sécurité:
    - Accès refusés (403)
    - Logouts
    - Erreurs d'authentification
    """

    def process_response(self, request, response):
        """Log les réponses avec statut spécifiques."""

        user = request.user if hasattr(request, "user") else None
        path = request.path
        method = request.method

        # Log les accès refusés (403 Forbidden)
        if response.status_code == 403:
            user_info = (
                f"{user.matricule} ({user.first_name} {user.last_name})"
                if user and user.is_authenticated
                else "Anonymous"
            )
            logger.warning(
                f"SECURITY_PERMISSION_DENIED | Utilisateur: {user_info} | "
                f"Endpoint: {method} {path} | Statut: ACCESS_DENIED"
            )

        # Log les déconnexions
        if "logout" in path.lower() or "blacklist" in path.lower():
            if response.status_code == 200 or response.status_code == 204:
                if user and user.is_authenticated:
                    logger.info(
                        f"USER_LOGOUT | Utilisateur: {user.matricule} ({user.first_name} {user.last_name}) | "
                        f"Rôle: {user.role} | Département: {user.department.name if user.department else 'N/A'} | "
                        f"Statut: LOGOUT_SUCCESS"
                    )

        # Log les erreurs d'authentification (401 Unauthorized)
        if response.status_code == 401 and "token" in path.lower():
            logger.warning(
                f"SECURITY_FAILED_LOGIN | Endpoint: {method} {path} | "
                f"Statut: AUTH_FAILED | Message: Invalid or expired token"
            )

        return response

    def process_exception(self, request, exception):
        """Log les exceptions."""
        user = request.user if hasattr(request, "user") else None
        user_info = (
            f"{user.matricule}" if user and hasattr(user, "matricule") else "Unknown"
        )

        logger.error(
            f"SYSTEM_ERROR | Utilisateur: {user_info} | "
            f"URL: {request.path} | Exception: {str(exception)}"
        )
        return None
