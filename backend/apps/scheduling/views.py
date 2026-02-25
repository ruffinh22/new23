from rest_framework import viewsets, status, permissions
from rest_framework.response import Response
from rest_framework.decorators import action
from django.utils import timezone
from django.db.models import Q
from django.core.mail import send_mass_mail
from .models import EmailSchedule, Event
from .serializers import (
    EmailScheduleListSerializer, EmailScheduleDetailSerializer,
    EventListSerializer, EventDetailSerializer
)
from apps.common.mixins import PermissionMixin


class IsAdminOrManager(permissions.BasePermission):
    """Permission: Admin ou Manager (Pôle/Filiale/Service)
    
    Allows:
    - GET (list/retrieve): All authenticated users
    - POST/PUT/DELETE: Only staff and managers
    """
    
    def has_permission(self, request, view):
        # All authenticated users can view (GET)
        if request.method in permissions.SAFE_METHODS:
            return request.user and request.user.is_authenticated
        
        # Only admins and managers can create/update/delete
        if request.user and request.user.is_staff:
            return True
        
        # Managers: vérifier s'ils ont un rôle de manager
        return getattr(request.user, 'role', None) in ['POLE_MANAGER', 'FILIALE_MANAGER', 'SERVICE_MANAGER']
    
    def has_object_permission(self, request, view, obj):
        # Admins can do anything
        if request.user and request.user.is_staff:
            return True
        
        # All users can view (GET)
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # For modifications: creator or admin only
        return obj.created_by == request.user


class EmailScheduleViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les programmations d'emails"""
    
    queryset = EmailSchedule.objects.all()
    permission_classes = [permissions.IsAuthenticated, IsAdminOrManager]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EmailScheduleListSerializer
        return EmailScheduleDetailSerializer
    
    def get_queryset(self):
        """Filtre les emails selon les permissions"""
        user = self.request.user
        
        # Admins voient tout
        if user.is_staff:
            return EmailSchedule.objects.all().order_by('-created_at')
        
        # All authenticated users can view (read-only) - order by most recent
        return EmailSchedule.objects.all().order_by('-created_at')
    
    def perform_create(self, serializer):
        """Assigne l'utilisateur courant comme créateur"""
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Empêche la modification si déjà envoyé"""
        obj = self.get_object()
        if obj.status in ['SENT', 'FAILED']:
            raise status.HTTP_400_BAD_REQUEST(
                detail="Impossible de modifier un email déjà envoyé"
            )
        serializer.save()
    
    @action(detail=True, methods=['post'])
    def send_now(self, request, pk=None):
        """Envoie immédiatement un email programmé"""
        email_schedule = self.get_object()
        
        if email_schedule.status == 'SENT':
            return Response(
                {'detail': 'Cet email a déjà été envoyé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            recipients = email_schedule.get_recipient_emails()
            
            if not recipients:
                email_schedule.status = 'FAILED'
                email_schedule.error_message = 'Aucun destinataire trouvé'
                email_schedule.save()
                return Response(
                    {'detail': 'Aucun destinataire pour cet email'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Préparer les emails pour envoi en masse
            messages = []
            for recipient in recipients:
                messages.append((
                    email_schedule.subject,
                    email_schedule.message,
                    'app@groupmediacontact.com',
                    [recipient]
                ))
            
            # Envoyer
            send_mass_mail(tuple(messages), fail_silently=False)
            
            # Mettre à jour le statut
            email_schedule.status = 'SENT'
            email_schedule.sent_at = timezone.now()
            email_schedule.save()
            
            return Response({
                'detail': f'Email envoyé à {len(recipients)} destinataire(s)',
                'recipients_count': len(recipients)
            })
        
        except Exception as e:
            email_schedule.status = 'FAILED'
            email_schedule.error_message = str(e)
            email_schedule.save()
            
            return Response(
                {'detail': f'Erreur lors de l\'envoi: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Annule une programmation d'email"""
        email_schedule = self.get_object()
        
        if email_schedule.status in ['SENT', 'CANCELLED']:
            return Response(
                {'detail': 'Impossible d\'annuler cet email'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        email_schedule.status = 'CANCELLED'
        email_schedule.save()
        
        return Response({'detail': 'Email programmé annulé'})


class EventViewSet(PermissionMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les événements publics"""
    
    queryset = Event.objects.filter(status='PUBLISHED')
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return EventListSerializer
        return EventDetailSerializer
    
    def get_queryset(self):
        """Filtre les événements selon le rôle de l'utilisateur"""
        user = self.request.user
        
        # ADMIN: voit tous les événements (brouillons, publiés, archivés)
        if user.is_staff:
            return Event.objects.all()
        
        # POLE_MANAGER: voit les événements de son pôle
        if user.role == 'POLE_MANAGER' and user.pole:
            return Event.objects.filter(
                Q(status='PUBLISHED', is_public=True) |  # Événements publics
                Q(status='PUBLISHED', is_public=False, visible_to_folder=user.pole)  # Événements du pôle
            ).distinct().order_by('-event_date')
        
        # FILIALE_MANAGER: voit les événements de sa filiale
        if user.role == 'FILIALE_MANAGER' and user.branch:
            return Event.objects.filter(
                Q(status='PUBLISHED', is_public=True) |  # Événements publics
                Q(status='PUBLISHED', is_public=False, visible_to_folder=user.branch)  # Événements de la filiale
            ).distinct().order_by('-event_date')
        
        # SERVICE_MANAGER: voit les événements de son service
        if user.role == 'SERVICE_MANAGER' and user.department:
            return Event.objects.filter(
                Q(status='PUBLISHED', is_public=True) |  # Événements publics
                Q(status='PUBLISHED', is_public=False, visible_to_folder=user.department)  # Événements du service
            ).distinct().order_by('-event_date')
        
        # Autres rôles (AGENT, DOCUMENT_MANAGER): voient uniquement les événements publics publiés
        return Event.objects.filter(
            status='PUBLISHED',
            is_public=True
        ).order_by('-event_date')
    
    def perform_create(self, serializer):
        """Assigne l'utilisateur courant comme créateur"""
        if not (self.request.user.is_staff or self._is_manager()):
            raise status.HTTP_403_FORBIDDEN
        
        serializer.save(created_by=self.request.user)
    
    def perform_update(self, serializer):
        """Seuls les admins et créateurs peuvent modifier"""
        obj = self.get_object()
        if not (self.request.user.is_staff or obj.created_by == self.request.user):
            raise status.HTTP_403_FORBIDDEN
        
        serializer.save()
    
    def perform_destroy(self, instance):
        """Seuls les admins et créateurs peuvent supprimer"""
        if not (self.request.user.is_staff or instance.created_by == self.request.user):
            raise status.HTTP_403_FORBIDDEN
        
        instance.delete()
    
    def _is_manager(self):
        """Vérifie si l'utilisateur est un manager"""
        return getattr(self.request.user, 'role', None) in [
            'POLE_MANAGER', 'FILIALE_MANAGER', 'SERVICE_MANAGER'
        ]
    
    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        """Retourne les événements à venir"""
        upcoming_events = self.get_queryset().filter(
            event_date__gte=timezone.now()
        )[:10]
        
        serializer = EventListSerializer(upcoming_events, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def past(self, request):
        """Retourne les événements passés"""
        past_events = self.get_queryset().filter(
            event_date__lt=timezone.now()
        ).order_by('-event_date')[:10]
        
        serializer = EventListSerializer(past_events, many=True)
        return Response(serializer.data)
