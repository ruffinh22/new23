"""
ViewSets pour les notifications en temps réel - OPTIMISÉ PHASE 5.
Endpoints pour opérations bulk, préférences, et WebSocket.
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from apps.common.logger import log_info, log_error, notifications_logger

from .models import Notification, NotificationPreference
from .service_refactored import NotificationService


class IsRecipientOrAdmin(permissions.BasePermission):
    """Permission pour le destinataire ou l'administrateur."""
    
    def has_object_permission(self, request, view, obj):
        return obj.recipient == request.user or request.user.is_staff


class NotificationViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les notifications en temps réel.
    Endpoints: list, retrieve, create, destroy, bulk operations.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les notifications de l'utilisateur (non archivées par défaut)."""
        user = self.request.user
        
        # Les admins voient tout, les autres ne voient que leurs notifs
        if user.is_staff or user.is_superuser:
            return Notification.objects.all().order_by('-created_at')
        
        # Filtrer par destinataire ET non archivées
        return Notification.objects.filter(
            recipient=user,
            is_archived=False
        ).order_by('-created_at')
    
    def list(self, request, *args, **kwargs):
        """
        Liste les notifications avec pagination et limite optionnelle.
        Query params: limit (int), priority (str), is_read (bool)
        """
        limit = request.query_params.get('limit', None)
        priority = request.query_params.get('priority', None)
        is_read = request.query_params.get('is_read', None)
        
        queryset = self.filter_queryset(self.get_queryset())
        
        # Filtrer par priorité si fourni (URGENT, HIGH, NORMAL, LOW)
        if priority:
            queryset = queryset.filter(priority=priority)
        
        # Filtrer par status de lecture si fourni
        if is_read is not None:
            is_read_bool = is_read.lower() == 'true'
            queryset = queryset.filter(is_read=is_read_bool)
        
        # Appliquer la limite
        if limit:
            try:
                limit = int(limit)
                queryset = queryset[:limit]
            except (ValueError, TypeError):
                pass
        
        log_info(
            f'API /notifications/ request',
            notifications_logger,
            user_matricule=request.user.matricule,
            total_count=queryset.count()
        )
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        from .serializers import (
            NotificationSerializer,
            NotificationDetailSerializer,
            NotificationCreateSerializer,
            NotificationPreferenceSerializer,
        )
        
        if self.action == 'create':
            return NotificationCreateSerializer
        elif self.action == 'retrieve':
            return NotificationDetailSerializer
        elif self.action in ['preferences_read', 'preferences_write']:
            return NotificationPreferenceSerializer
        return NotificationSerializer
    
    # ===== ENDPOINTS BULK OPTIMISÉS =====
    
    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """
        Retourne le nombre de notifications non lues.
        Usage: GET /api/notifications/unread_count/
        Response: {"count": 5}
        """
        user = request.user
        count = Notification.objects.filter(
            recipient=user,
            is_read=False,
            is_archived=False
        ).count()
        
        log_info(
            f'Unread count check',
            notifications_logger,
            user_id=user.id,
            unread_count=count
        )
        
        return Response({
            'count': count,
            'timestamp': timezone.now().isoformat()
        })
    
    @action(detail=False, methods=['post'])
    def bulk_mark_read(self, request):
        """
        Marque TOUTES les notifications comme lues EN UNE SEULE QUERY.
        Utilise NotificationService pour optimisation bulk.
        Usage: POST /api/notifications/bulk_mark_read/
        Response: {"detail": "25 notifications marquées comme lues"}
        """
        try:
            # Utiliser le service pour bulk update (1 query au lieu de N)
            count = NotificationService.mark_all_as_read(request.user)
            
            log_info(
                f'Bulk mark read success',
                notifications_logger,
                user_id=request.user.id,
                count=count
            )
            
            return Response({
                'detail': f'{count} notifications marquées comme lues',
                'count': count,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            log_error(
                f'Bulk mark read failed',
                exception=e,
                logger_instance=notifications_logger
            )
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """
        Marque UNE notification comme lue.
        Usage: POST /api/notifications/{id}/mark_as_read/
        """
        notification = self.get_object()
        
        # Vérifier les permissions (destinataire ou admin)
        if notification.recipient != request.user and not request.user.is_staff:
            log_error(
                f'Permission denied for mark_as_read',
                logger_instance=notifications_logger,
                user_id=request.user.id,
                notification_id=pk
            )
            return Response(
                {'error': 'Vous ne pouvez pas modifier cette notification'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            notification.mark_as_read()
            
            log_info(
                f'Notification marked read',
                notifications_logger,
                notification_id=pk,
                user_id=request.user.id
            )
            
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
            
        except Exception as e:
            log_error(f'Mark as read failed', exception=e, logger_instance=notifications_logger)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def mark_as_unread(self, request, pk=None):
        """
        Marque UNE notification comme non lue.
        Usage: POST /api/notifications/{id}/mark_as_unread/
        """
        notification = self.get_object()
        
        # Vérifier les permissions
        if notification.recipient != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Vous ne pouvez pas modifier cette notification'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            notification.is_read = False
            notification.read_at = None
            notification.save()
            
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def bulk_archive(self, request):
        """
        Archive TOUTES les notifications EN UNE SEULE QUERY.
        Usage: POST /api/notifications/bulk_archive/
        Response: {"detail": "30 notifications archivées"}
        """
        try:
            user = request.user
            count = Notification.objects.filter(
                recipient=user,
                is_archived=False
            ).update(
                is_archived=True,
                archived_at=timezone.now()
            )
            
            log_info(
                f'Bulk archive success',
                notifications_logger,
                user_id=user.id,
                count=count
            )
            
            return Response({
                'detail': f'{count} notifications archivées',
                'count': count,
                'timestamp': timezone.now().isoformat()
            })
            
        except Exception as e:
            log_error(f'Bulk archive failed', exception=e, logger_instance=notifications_logger)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post', 'delete'])
    def archive(self, request, pk=None):
        """
        Archive UNE notification (soft-delete via is_archived flag).
        Usage: POST/DELETE /api/notifications/{id}/archive/
        """
        notification = self.get_object()
        
        if notification.recipient != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Vous ne pouvez pas archiver cette notification'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            notification.archive()  # Utilise method du model
            
            serializer = self.get_serializer(notification)
            return Response(serializer.data)
            
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get', 'post', 'patch'])
    def preferences(self, request):
        """
        Gère les préférences de notifications de l'utilisateur.
        GET: Retourne les préférences actuelles
        POST/PATCH: Mets à jour les préférences
        Usage: GET/POST /api/notifications/preferences/
        """
        try:
            user = request.user
            pref, created = NotificationPreference.objects.get_or_create(user=user)
            
            if request.method == 'GET':
                serializer = self.get_serializer(pref)
                return Response(serializer.data)
            
            elif request.method in ['POST', 'PATCH']:
                serializer = self.get_serializer(pref, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    
                    log_info(
                        f'Preferences updated',
                        notifications_logger,
                        user_id=user.id,
                        channel=serializer.data.get('channel'),
                        frequency=serializer.data.get('frequency')
                    )
                    
                    return Response(
                        {
                            'detail': 'Préférences mises à jour',
                            'data': serializer.data
                        },
                        status=status.HTTP_200_OK
                    )
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            log_error(f'Preferences error', exception=e, logger_instance=notifications_logger)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    # ===== ENDPOINTS DE STATISTIQUES =====
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Retourne les statistiques des notifications de l'utilisateur.
        Usage: GET /api/notifications/statistics/
        Response: {
            "total": 50,
            "unread": 5,
            "archived": 10,
            "by_priority": {...},
            "by_type": {...}
        }
        """
        try:
            user = request.user
            queryset = self.get_queryset()
            
            # Inclure aussi les archivées dans les stats
            all_notifs = Notification.objects.filter(recipient=user)
            
            stats = {
                'total': all_notifs.count(),
                'unread': queryset.filter(is_read=False).count(),
                'archived': all_notifs.filter(is_archived=True).count(),
                'by_priority': {},
                'by_type': {},
            }
            
            # Grouper par priorité
            for priority_choice in ['URGENT', 'HIGH', 'NORMAL', 'LOW']:
                count = queryset.filter(priority=priority_choice).count()
                if count > 0:
                    stats['by_priority'][priority_choice] = count
            
            # Grouper par type de notification
            for notif_type, display in Notification.TYPE_CHOICES:
                count = queryset.filter(notification_type=notif_type).count()
                if count > 0:
                    stats['by_type'][notif_type] = count
            
            return Response(stats)
            
        except Exception as e:
            log_error(f'Statistics error', exception=e, logger_instance=notifications_logger)
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['get'])
    def by_priority(self, request):
        """
        Retourne les notifications filtrées par priorité.
        Usage: GET /api/notifications/by_priority/?priority=URGENT
        """
        priority = request.query_params.get('priority')
        if not priority:
            return Response(
                {'error': 'Le paramètre "priority" est requis (URGENT, HIGH, NORMAL, LOW)'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        notifications = self.get_queryset().filter(priority=priority)
        serializer = self.get_serializer(notifications, many=True)
        return Response(serializer.data)
