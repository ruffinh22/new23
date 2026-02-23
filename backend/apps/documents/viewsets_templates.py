"""
ViewSets for Document Template API
"""
from django.shortcuts import get_object_or_404
from django.http import FileResponse, HttpResponse
from django.utils.text import slugify
from rest_framework import viewsets, status, permissions, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend

from apps.documents.models import (
    DocumentTemplate, TemplateVersion, TemplateDownloadLog
)
from apps.documents.serializers_templates import (
    DocumentTemplateListSerializer,
    DocumentTemplateDetailSerializer,
    DocumentTemplateCreateSerializer,
    TemplateVersionSerializer,
    TemplateDownloadLogSerializer
)
from apps.documents.permissions import IsAdmin


class IsAuthenticated(permissions.BasePermission):
    """Permission for authenticated users"""
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated


class PermissionDenied(Exception):
    """Custom permission denied exception"""
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class DocumentNotFoundError(Exception):
    """Custom document not found exception"""
    def __init__(self, message):
        self.message = message
        super().__init__(self.message)


class IsTemplateOwnerOrAdmin(permissions.BasePermission):
    """Permission to edit templates (owner or admin)"""
    
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'ADMIN':
            return True
        return obj.created_by == request.user


class DocumentTemplateViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing document templates.
    
    Admins can create, update, and delete templates.
    All authenticated users can list and download templates (based on visibility).
    """
    
    permission_classes = [IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser)
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['template_type', 'is_active', 'visibility']
    search_fields = ['name', 'description']
    ordering_fields = ['created_at', 'downloads_count', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Filter templates based on user role and visibility"""
        user = self.request.user
        
        # Admins see all templates
        if user.is_admin:
            return DocumentTemplate.objects.all()
        
        # Agents see only templates available to them
        from django.db.models import Q
        
        templates = DocumentTemplate.objects.filter(is_active=True).filter(
            Q(visibility='ALL') |  # Globally available
            Q(visibility='DEPARTMENT', departments__id=user.department_id) |  # Their department
            Q(visibility='CUSTOM', allowed_users=user) |  # Explicitly allowed
            Q(created_by=user)  # Templates they created
        ).distinct()
        
        return templates
    
    def get_serializer_class(self):
        """Choose serializer based on action"""
        if self.action == 'create':
            return DocumentTemplateCreateSerializer
        elif self.action in ['list', 'list_by_department']:
            return DocumentTemplateListSerializer
        return DocumentTemplateDetailSerializer
    
    def create(self, request, *args, **kwargs):
        """Create a new template (admin only)"""
        if not request.user.is_admin:
            from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
            raise DRFPermissionDenied(
                "Seuls les administrateurs peuvent créer des modèles"
            )
        return super().create(request, *args, **kwargs)
    
    def perform_create(self, serializer):
        """Save template with creator"""
        serializer.save(created_by=self.request.user)
    
    def update(self, request, *args, **kwargs):
        """Update template (owner or admin only)"""
        template = self.get_object()
        if (not request.user.is_admin and 
            template.created_by != request.user):
            from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
            raise DRFPermissionDenied(
                "Vous ne pouvez modifier que vos propres modèles"
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Delete template (admin only)"""
        if not request.user.is_admin:
            from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
            raise DRFPermissionDenied(
                "Seuls les administrateurs peuvent supprimer des modèles"
            )
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['get'])
    def download(self, request, pk=None):
        """
        Download a template file.
        Increments download counter and logs the download.
        """
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied, NotFound
        
        template = self.get_object()
        
        # Check if user has access
        if not template.is_available_to_user(request.user):
            raise DRFPermissionDenied(
                "Vous n'avez pas accès à ce modèle"
            )
        
        if not template.file:
            raise NotFound('Fichier non disponible')
        
        # Log the download
        TemplateDownloadLog.objects.create(
            template=template,
            user=request.user,
            ip_address=self.get_client_ip(request)
        )
        
        # Increment counter
        template.downloads_count += 1
        template.save(update_fields=['downloads_count'])
        
        # Return file
        return FileResponse(
            template.file.open('rb'),
            as_attachment=True,
            filename=f"{slugify(template.name)}.{template.file_type.lower()}"
        )
    
    @action(detail=True, methods=['get'])
    def preview(self, request, pk=None):
        """Get preview info for a template"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        
        template = self.get_object()
        
        # Check if user has access
        if not template.is_available_to_user(request.user):
            raise DRFPermissionDenied(
                "Vous n'avez pas accès à ce modèle"
            )
        
        serializer = self.get_serializer(template)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def versions(self, request, pk=None):
        """Get all versions of a template"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        
        template = self.get_object()
        
        # Only allow template owner and admins to view versions
        if (not request.user.is_admin and 
            template.created_by != request.user):
            raise DRFPermissionDenied(
                "Vous n'avez pas accès aux versions de ce modèle"
            )
        
        versions = template.versions.all()
        serializer = TemplateVersionSerializer(versions, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def restore_version(self, request, pk=None):
        """Restore a previous version of a template"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied, NotFound
        
        if not request.user.is_admin:
            raise DRFPermissionDenied(
                "Seuls les administrateurs peuvent restaurer des versions"
            )
        
        template = self.get_object()
        version_id = request.data.get('version_id')
        
        try:
            version = template.versions.get(id=version_id)
        except TemplateVersion.DoesNotExist:
            raise NotFound("Version non trouvée")
        
        # Create new version with current file
        TemplateVersion.objects.create(
            template=template,
            version_number=template.version,
            file=template.file,
            changelog=f"Restauration vers v{version.version_number}",
            created_by=request.user
        )
        
        # Restore old version
        template.file = version.file
        template.version += 1
        template.save()
        
        return Response(
            {'message': f'Version {version.version_number} restaurée'},
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['get'])
    def download_history(self, request, pk=None):
        """Get download history for a template (admin only)"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        
        if not request.user.is_admin:
            raise DRFPermissionDenied(
                "Seuls les administrateurs peuvent voir l'historique"
            )
        
        template = self.get_object()
        limit = request.query_params.get('limit', 100)
        
        downloads = template.download_logs.all()[:int(limit)]
        serializer = TemplateDownloadLogSerializer(downloads, many=True)
        
        return Response({
            'total_downloads': template.downloads_count,
            'recent_downloads': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def my_templates(self, request):
        """Get templates created by the current user"""
        user = request.user
        templates = DocumentTemplate.objects.filter(created_by=user)
        
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_department(self, request):
        """Get templates for a specific department filter"""
        department_id = request.query_params.get('department_id')
        
        if not department_id:
            return Response(
                {'error': 'department_id parameter required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        templates = self.get_queryset().filter(
            departments__id=department_id,
            visibility__in=['ALL', 'DEPARTMENT']
        )
        
        serializer = self.get_serializer(templates, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get template usage statistics (admin only)"""
        from rest_framework.exceptions import PermissionDenied as DRFPermissionDenied
        
        if not request.user.is_admin:
            raise DRFPermissionDenied(
                "Seuls les administrateurs peuvent voir les statistiques"
            )
        
        from django.db.models import Count, Sum
        
        templates = DocumentTemplate.objects.all()
        
        stats = {
            'total_templates': templates.count(),
            'active_templates': templates.filter(is_active=True).count(),
            'total_downloads': templates.aggregate(Sum('downloads_count'))['downloads_count__sum'] or 0,
            'by_type': list(
                templates.values('template_type')
                .annotate(count=Count('id'))
                .order_by('-count')
            ),
            'most_downloaded': list(
                templates.values('id', 'name')
                .annotate(downloads=Count('download_logs'))
                .order_by('-downloads')[:5]
            ),
        }
        
        return Response(stats)
    
    @staticmethod
    def get_client_ip(request):
        """Get client IP address from request"""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
