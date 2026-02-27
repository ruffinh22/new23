"""
Service pour l'enregistrement automatique des logs d'audit.
"""

from django.http import HttpRequest
from apps.common.audit import AuditLog
import logging

logger = logging.getLogger(__name__)


def get_client_ip(request: HttpRequest) -> str:
    """Récupère l'adresse IP du client."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        ip = x_forwarded_for.split(",")[0]
    else:
        ip = request.META.get("REMOTE_ADDR")
    return ip


def get_user_agent(request: HttpRequest) -> str:
    """Récupère le User Agent."""
    return request.META.get("HTTP_USER_AGENT", "")


class AuditLoggingMiddleware:
    """Middleware pour enregistrer automatiquement les actions sensibles."""

    MONITORED_ACTIONS = [
        "document-list",
        "document-detail",
        "document-create",
        "document-approve",
        "document-reject",
        "document-delete",
        "user-list",
        "user-create",
        "user-update",
        "user-delete",
        "department-create",
        "department-update",
        "department-delete",
        "routing-rule-create",
        "routing-rule-update",
        "routing-rule-delete",
    ]

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request: HttpRequest):
        # Envoyer la requête
        response = self.get_response(request)

        # Enregistrer les actions sensibles
        try:
            self._log_if_monitored(request, response)
        except Exception as e:
            # Ne pas crasher le middleware pour une erreur de logging
            print(f"Erreur lors de l'enregistrement du log d'audit: {e}")

        return response

    def _log_if_monitored(self, request: HttpRequest, response):
        """Enregistre l'action si elle est en salle de surveillance."""
        # Déterminer si c'est une action sensible
        method = request.method
        user = request.user
        ip_address = get_client_ip(request)
        user_agent = get_user_agent(request)

        # Enregistrer les actions sensibles (POST, PUT, DELETE, PATCH)
        if method in ["POST", "PUT", "DELETE", "PATCH"]:
            action = self._get_action_type(request, method)
            if action:
                describe = self._get_action_description(request, method)
                severity = "ERROR" if response.status_code >= 400 else "INFO"
                success = 200 <= response.status_code < 300

                AuditLog.log_action(
                    actor=user if user.is_authenticated else None,
                    action=action,
                    description=describe,
                    severity=severity,
                    ip_address=ip_address,
                    user_agent=user_agent,
                    success=success,
                )

    def _get_action_type(self, request: HttpRequest, method: str) -> str | None:
        """Détermine le type d'action en fonction du path et de la méthode."""
        path = request.path

        # Mapping des chemins API vers les types d'actions
        actions_map = {
            "/api/documents/": (
                "DOCUMENT_UPLOAD",
                "DOCUMENT_UPDATE",
                "DOCUMENT_DELETE",
            ),
            "/api/documents": ("DOCUMENT_UPLOAD", "DOCUMENT_UPDATE", "DOCUMENT_DELETE"),
            "/api/folders/": (
                "ADMIN_FOLDER_CREATE",
                "ADMIN_FOLDER_UPDATE",
                "ADMIN_FOLDER_DELETE",
            ),
            "/api/routing-rules/": (
                "ADMIN_ROUTING_RULE_CREATE",
                "ADMIN_ROUTING_RULE_UPDATE",
                "ADMIN_ROUTING_RULE_DELETE",
            ),
            "/api/users/": ("USER_CREATE", "USER_UPDATE", "USER_DELETE"),
        }

        for api_path, actions in actions_map.items():
            if api_path in path:
                if method == "POST":
                    return actions[0]
                elif method in ["PUT", "PATCH"]:
                    return actions[1]
                elif method == "DELETE":
                    return actions[2]

        return None

    def _get_action_description(self, request: HttpRequest, method: str) -> str:
        """Génère une description de l'action."""
        path = request.path
        method_names = {
            "POST": "créé",
            "PUT": "modifié",
            "PATCH": "modifié",
            "DELETE": "supprimé",
        }

        method_name = method_names.get(method, "traité")
        return f"Ressource {method_name}: {path} | Méthode: {method}"
