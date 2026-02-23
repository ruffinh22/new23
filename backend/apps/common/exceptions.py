"""
Gestion centralisée des exceptions et erreurs de l'API.
"""

import logging
import traceback
from django.conf import settings
from django.http import JsonResponse
from rest_framework import status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class GenericAPIException(APIException):
    """Exception API générique avec logging."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Une erreur est survenue."
    default_code = "error"

    def __init__(self, detail=None, code=None, status_code=None):
        if detail is None:
            detail = self.default_detail
        if code is None:
            code = self.default_code
        if status_code is not None:
            self.status_code = status_code

        super().__init__(detail=detail, code=code)


class DocumentValidationError(GenericAPIException):
    """Erreur de validation de document."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "La validation du document a échoué."
    default_code = "document_validation_error"


class DocumentNotFoundError(GenericAPIException):
    """Document non trouvé."""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = "Document non trouvé."
    default_code = "document_not_found"


class PermissionDeniedError(GenericAPIException):
    """Accès refusé."""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = "Vous n'avez pas la permission d'accéder à cette ressource."
    default_code = "permission_denied"


class InvalidFileError(GenericAPIException):
    """Fichier invalide."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Le fichier téléchargé est invalide."
    default_code = "invalid_file"


class ExcelProcessingError(GenericAPIException):
    """Erreur lors du traitement Excel."""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Erreur lors du traitement du fichier Excel."
    default_code = "excel_processing_error"


def custom_exception_handler(exc, context):
    """
    Gestionnaire d'exceptions personnalisé pour l'API REST.
    
    Format de réponse standardisé:
    {
        "success": false,
        "error": {
            "code": "error_code",
            "message": "Message d'erreur",
            "status_code": 400,
            "details": {}  # Seulement en développement
        }
    }
    """
    
    # Récupérer le request pour le logging
    request = context.get('request')
    view = context.get('view')
    
    # Utiliser le gestionnaire par défaut de DRF
    response = exception_handler(exc, context)
    
    # Si la réponse est None, c'est une exception non gérée
    if response is None:
        # Logger l'erreur complète
        logger.error(
            f"Unhandled exception in {view.__class__.__name__}.{context.get('view', {})}\n"
            f"Request: {request.method} {request.path}\n"
            f"User: {request.user if hasattr(request, 'user') else 'Anonymous'}\n"
            f"Error: {str(exc)}",
            exc_info=True
        )
        
        # Réponse généralisée en production
        if settings.DEBUG:
            error_detail = str(exc)
            traceback_str = traceback.format_exc()
        else:
            error_detail = "Une erreur serveur est survenue. Veuillez contacter le support."
            traceback_str = None
        
        response = Response(
            {
                "success": False,
                "error": {
                    "code": "internal_server_error",
                    "message": error_detail,
                    "status_code": 500,
                    "details": traceback_str if settings.DEBUG else None
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    else:
        # Formater la réponse d'erreur existante
        if isinstance(exc, ValidationError):
            # Erreurs de validation détaillées
            detail = response.data
        else:
            detail = response.data.get('detail', str(exc)) if response.data else str(exc)
        
        # Logger l'erreur
        status_code = response.status_code
        if status_code >= 500:
            logger.error(
                f"API Error {status_code} in {view.__class__.__name__}\n"
                f"Request: {request.method} {request.path}\n"
                f"User: {getattr(request, 'user', 'Anonymous')}\n"
                f"Error: {detail}"
            )
        elif status_code >= 400:
            logger.warning(
                f"API Error {status_code}: {detail}\n"
                f"Request: {request.method} {request.path}"
            )
        
        # Reformatter la réponse
        response.data = {
            "success": False,
            "error": {
                "code": getattr(exc, 'default_code', 'error'),
                "message": detail,
                "status_code": status_code,
                "details": response.data if settings.DEBUG and hasattr(response, 'data') else None
            }
        }
    
    return response


class ErrorLoggingMiddleware:
    """
    Middleware pour logger les erreurs non capturées et les requêtes lentes.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.slow_request_threshold = getattr(settings, 'SLOW_REQUEST_THRESHOLD_SECONDS', 5)

    def __call__(self, request):
        import time
        start_time = time.time()
        
        try:
            response = self.get_response(request)
        except Exception as exc:
            logger.exception(
                f"Unhandled exception in middleware for {request.method} {request.path}",
                exc_info=exc
            )
            raise
        
        # Vérifier les requêtes lentes
        duration = time.time() - start_time
        if duration > self.slow_request_threshold:
            logger.warning(
                f"Slow request: {request.method} {request.path} took {duration:.2f}s"
            )
        
        return response
