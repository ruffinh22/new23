"""
Common views for SGDRA application.
Includes health checks and status endpoints.
"""

import logging
from django.db import connection
from django.core.cache import cache
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status

logger = logging.getLogger(__name__)


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring and load balancers.
    
    Checks:
    - Database connectivity
    - Cache/Redis connectivity
    - API availability
    
    Returns:
    - 200 OK with status 'healthy' if all checks pass
    - 503 Service Unavailable with details if any check fails
    """
    health = {
        'status': 'healthy',
        'services': {
            'database': 'ok',
            'cache': 'ok',
            'api': 'ok',
        },
    }
    
    http_status = status.HTTP_200_OK
    
    # Check database connectivity
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        health['services']['database'] = 'ok'
    except Exception as e:
        health['services']['database'] = f'error: {str(e)}'
        health['status'] = 'unhealthy'
        http_status = status.HTTP_503_SERVICE_UNAVAILABLE
        logger.error(f"Database health check failed: {str(e)}")
    
    # Check cache/Redis connectivity
    try:
        cache.set('health_check', 'ok', 1)
        cache_value = cache.get('health_check')
        if cache_value == 'ok':
            health['services']['cache'] = 'ok'
        else:
            health['services']['cache'] = 'error: cache not working'
            health['status'] = 'unhealthy'
            http_status = status.HTTP_503_SERVICE_UNAVAILABLE
    except Exception as e:
        # Cache failures are not critical - API can continue
        health['services']['cache'] = f'warning: {str(e)}'
        logger.warning(f"Cache health check failed: {str(e)}")
    
    return Response(health, status=http_status)


@api_view(['GET'])
@permission_classes([AllowAny])
def readiness_check(request):
    """
    Readiness check endpoint.
    Similar to health check but only checks critical services.
    Used by Kubernetes/Docker to determine if instance is ready for traffic.
    """
    try:
        with connection.cursor() as cursor:
            cursor.execute('SELECT 1')
        return Response({'ready': True}, status=status.HTTP_200_OK)
    except Exception as e:
        logger.error(f"Readiness check failed: {str(e)}")
        return Response(
            {'ready': False, 'error': str(e)},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )


@api_view(['GET'])
@permission_classes([AllowAny])
def liveness_check(request):
    """
    Liveness check endpoint.
    Simple check that API process is alive.
    Used by Kubernetes/Docker to determine if instance needs restart.
    """
    return Response({'alive': True}, status=status.HTTP_200_OK)
