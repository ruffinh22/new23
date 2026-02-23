# FILE: backend/apps/documents/file_config_views.py
"""
Views pour la gestion des configurations de types de fichiers
"""

from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from .file_config_models import FileTypeConfiguration
from .file_config_serializers import (
    FileTypeConfigurationSerializer,
    FileTypeConfigurationListSerializer
)


class IsAdminUser(permissions.BasePermission):
    """Permission pour les administrateurs uniquement"""
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class FileTypeConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les configurations de types de fichiers"""
    
    queryset = FileTypeConfiguration.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = 'file_type'

    def get_serializer_class(self):
        if self.action == 'list':
            return FileTypeConfigurationListSerializer
        return FileTypeConfigurationSerializer

    def get_permissions(self):
        """Permissions spécifiques par action"""
        if self.action == 'list' or self.action == 'retrieve':
            # Tous les utilisateurs authentifiés peuvent consulter
            self.permission_classes = [permissions.IsAuthenticated]
        else:
            # Seuls les admins peuvent créer/modifier/supprimer
            self.permission_classes = [IsAdminUser]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        """Créer une nouvelle configuration"""
        data = dict(request.data)
        data['created_by'] = request.user.id
        serializer = self.get_serializer(data=data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def update(self, request, *args, **kwargs):
        """Mettre à jour une configuration"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        data = dict(request.data)
        data['created_by'] = request.user.id
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def enabled_only(self, request):
        """Retourner uniquement les types de fichiers activés"""
        configs = self.queryset.filter(is_enabled=True)
        serializer = FileTypeConfigurationListSerializer(configs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_enabled(self, request, file_type=None):
        """Activer/désactiver un type de fichier"""
        config = self.get_object()
        config.is_enabled = not config.is_enabled
        config.save()
        serializer = self.get_serializer(config)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Statistiques sur les configurations"""
        total_types = FileTypeConfiguration.objects.count()
        enabled_types = FileTypeConfiguration.objects.filter(is_enabled=True).count()
        auto_validated_types = FileTypeConfiguration.objects.filter(
            is_auto_validated=True
        ).count()

        return Response({
            'total_types': total_types,
            'enabled_types': enabled_types,
            'disabled_types': total_types - enabled_types,
            'auto_validated_types': auto_validated_types,
        })

    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """Mise à jour en masse de plusieurs configurations"""
        updates = request.data.get('updates', [])
        results = []

        for update in updates:
            file_type = update.get('file_type')
            try:
                config = FileTypeConfiguration.objects.get(file_type=file_type)
                serializer = FileTypeConfigurationSerializer(
                    config,
                    data=update,
                    partial=True
                )
                if serializer.is_valid():
                    serializer.save()
                    results.append({
                        'file_type': file_type,
                        'status': 'success',
                        'data': serializer.data
                    })
                else:
                    results.append({
                        'file_type': file_type,
                        'status': 'error',
                        'errors': serializer.errors
                    })
            except FileTypeConfiguration.DoesNotExist:
                results.append({
                    'file_type': file_type,
                    'status': 'not_found',
                    'error': 'Configuration not found'
                })

        return Response(results)

    @action(detail=False, methods=['post'])
    def reset_defaults(self, request):
        """Réinitialiser les configurations par défaut"""
        # Importer la fonction d'initialisation
        from .file_config_defaults import initialize_default_configurations
        
        initialize_default_configurations()
        
        configs = FileTypeConfiguration.objects.all()
        serializer = FileTypeConfigurationListSerializer(configs, many=True)
        return Response({
            'message': 'Configurations réinitialisées avec succès',
            'configurations': serializer.data
        })
