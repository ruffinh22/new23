"""
URLs pour les audit logs.
"""

from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from rest_framework.response import Response
from rest_framework.decorators import api_view, permission_classes
from rest_framework import permissions
from apps.common.views_audit import AuditLogViewSet
from apps.common.audit import AuditLog
from apps.users.models import User

# Debug endpoint
@api_view(['GET'])
@permission_classes([permissions.AllowAny])
def api_debug(request):
    """Debug endpoint to verify API is working"""
    return Response({
        'status': 'ok',
        'message': 'API is working',
        'path': request.path
    })

# Create test logs endpoint
@api_view(['POST'])
@permission_classes([permissions.IsAuthenticated])
def create_test_logs(request):
    """Create test audit logs for demo purposes"""
    admin = User.objects.filter(role='ADMIN').first()
    if not admin:
        return Response({'error': 'Admin user not found'}, status=404)
    
    actions = [
        ('DOCUMENT_UPLOAD', 'INFO', True, 'Document test.pdf uploadé'),
        ('DOCUMENT_VALIDATE', 'INFO', True, 'Document validé avec succès'),
        ('DOCUMENT_APPROVE', 'INFO', True, 'Document approuvé par admin'),
        ('USER_LOGIN', 'INFO', True, 'Connexion utilisateur ADMIN001'),
        ('CONFIGURATION_CHANGE', 'WARNING', True, 'Configuration système modifiée'),
        ('DOCUMENT_REJECT', 'WARNING', False, 'Document rejeté - format invalide'),
        ('ACCESS_DENIED', 'ERROR', False, 'Accès refusé à ressource sensible'),
        ('SYSTEM_ERROR', 'CRITICAL', False, 'Erreur système détecté'),
    ]
    
    created = []
    errors = []
    for action, severity, success, description in actions:
        try:
            log = AuditLog.objects.create(
                actor=admin,
                action=action,
                severity=severity,
                description=description,
                success=success,
                ip_address=request.META.get('REMOTE_ADDR', '127.0.0.1')
            )
            created.append(action)
        except Exception as e:
            errors.append(f'{action}: {str(e)}')
    
    total = AuditLog.objects.count()
    return Response({
        'created': len(created),
        'total_logs': total,
        'actions': created,
        'errors': errors if errors else None
    })

router = SafeDefaultRouter()
router.register(r'audit-logs', AuditLogViewSet, basename='audit-log')

urlpatterns = [
    path('debug/', api_debug, name='debug'),
    path('create-test-logs/', create_test_logs, name='create-test-logs'),
    path('', include(router.urls)),
]
