from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.shortcuts import get_object_or_404
from django.db.models import Q, Prefetch
from django.db import transaction
from django.utils import timezone
from django.http import FileResponse, HttpResponse, StreamingHttpResponse
import os
from django.conf import settings

from .models import Document, DocumentSpecification, DocumentValidationResult, DocumentType
from .serializers import (
    DocumentListSerializer,
    DocumentDetailSerializer,
    DocumentCreateSerializer,
    DocumentSpecificationSerializer,
    DocumentValidationResultSerializer,
    DocumentTransferSerializer,
    DocumentTypeSerializer,
)
from .services import DocumentService, DocumentFilterService
from .permissions import IsAdmin, IsOwnerOrAdmin
from apps.common.mixins import PermissionMixin, FilterMixin


class DocumentTypeViewSet(viewsets.ModelViewSet):
    """ViewSet pour les types de documents."""
    
    serializer_class = DocumentTypeSerializer
    filterset_fields = ['is_active']
    search_fields = ['name', 'display_name']
    ordering_fields = ['display_name', 'created_at']
    ordering = ['display_name']
    
    def get_queryset(self):
        """Return all types for admins, only active types for regular users."""
        if self.request.user and self.request.user.is_staff:
            return DocumentType.objects.all().order_by('display_name')
        return DocumentType.objects.filter(is_active=True).order_by('display_name')
    
    def get_permissions(self):
        """Allow all authenticated users to view, but only admins can create/update/delete."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]


class DocumentSpecificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour les spécifications de documents (lecture et écriture pour les admins)."""
    
    queryset = DocumentSpecification.objects.all()
    serializer_class = DocumentSpecificationSerializer
    
    def get_permissions(self):
        """Permissions basées sur l'action."""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def get_queryset(self):
        """Retourne tous les specs pour les admins, seulement actifs pour les autres."""
        if self.request.user and self.request.user.is_staff:
            return DocumentSpecification.objects.all()
        return DocumentSpecification.objects.filter(is_active=True)
    
    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Récupère une spécification par son type."""
        doc_type = request.query_params.get('type')
        if not doc_type:
            return Response(
                {'error': 'Le paramètre "type" est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        spec = get_object_or_404(DocumentSpecification, document_type=doc_type, is_active=True)
        serializer = self.get_serializer(spec)
        return Response(serializer.data)


class DocumentViewSet(PermissionMixin, FilterMixin, viewsets.ModelViewSet):
    """ViewSet pour les documents avec validation.
    
    ✅ UTILISE:
    - PermissionMixin: Pour is_admin() centralisé
    - FilterMixin: Pour filtres réutilisables
    - DocumentFilterService: Pour logique de filtrage métier
    """
    
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = (MultiPartParser, FormParser, JSONParser)
    
    def get_queryset(self):
        """Retourne les documents selon les permissions + optimisations."""
        filter_service = DocumentFilterService(self.request.user)
        return filter_service.get_accessible_documents()
    
    def get_serializer_class(self):
        """Retourne le sérialiseur approprié selon l'action."""
        if self.action == 'create':
            return DocumentCreateSerializer
        elif self.action == 'list':
            return DocumentListSerializer
        else:
            return DocumentDetailSerializer
    
    def list(self, request, *args, **kwargs):
        """Retourne la liste des documents avec filtres appliqués au backend.
        
        ✅ UTILISE DocumentFilterService au lieu de logique inline.
        """
        # Créer le service de filtrage
        filter_service = DocumentFilterService(request.user)
        
        # Construire le dict de filtres depuis query_params
        filters = {
            'agent': request.query_params.get('agent'),
            'status': request.query_params.get('status'),
            'document_type': request.query_params.get('document_type'),
            'department_id': request.query_params.get('department_id'),
            'folder_id': request.query_params.get('folder_id'),
            'created_after': request.query_params.get('created_after'),
            'created_before': request.query_params.get('created_before'),
            'search': request.query_params.get('search'),
        }
        
        # Appliquer les filtres via le service
        queryset = filter_service.get_filtered_documents(filters)
        
        # Trier les résultats
        queryset = queryset.order_by('-created_at')
        
        # Paginer et sérialiser
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Retourne les statistiques des documents pour les admins."""
        queryset = self.get_queryset()
        
        total_documents = queryset.count()
        approved_documents = queryset.filter(status='VALIDE').count()
        pending_documents = queryset.filter(status__in=['EN_ATTENTE', 'EN_COURS']).count()
        total_users = queryset.values('agent').distinct().count()
        
        return Response({
            'totalDocuments': total_documents,
            'approvedDocuments': approved_documents,
            'pendingDocuments': pending_documents,
            'totalUsers': total_users,
        })
    
    @transaction.atomic
    def create(self, request, *args, **kwargs):
        """Crée un nouveau document avec validation automatique (atomique)."""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document = serializer.save()
        
        # Utiliser le service de notifications
        from apps.notifications.services import NotificationService
        NotificationService.notify_on_document_uploaded(document, request.user)
        
        # Retourner les détails du document créé
        output_serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response(
            output_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=False, methods=['get'])
    def my_documents(self, request):
        """Retourne les documents de l'utilisateur connecté."""
        queryset = Document.objects.filter(agent=request.user)
        
        # Filtres optionnels
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        doc_type = request.query_params.get('document_type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        is_validated = request.query_params.get('is_validated')
        if is_validated is not None:
            queryset = queryset.filter(is_validated=is_validated.lower() == 'true')
        
        serializer = DocumentListSerializer(
            queryset.order_by('-created_at'),
            many=True,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def received_documents(self, request):
        """Retourne les documents reçus par l'utilisateur (dans le dossier Received)."""
        from apps.folders.models import Folder
        
        # Trouver le dossier "Received" de l'utilisateur
        received_folders = Folder.objects.filter(
            owner=request.user,
            folder_type='received_user'
        )
        
        if not received_folders.exists():
            return Response([])
        
        # Récupérer les documents dans les dossiers Received de l'utilisateur
        queryset = Document.objects.filter(folder__in=received_folders)
        
        # Filtres optionnels
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        doc_type = request.query_params.get('document_type')
        if doc_type:
            queryset = queryset.filter(document_type=doc_type)
        
        serializer = DocumentListSerializer(
            queryset.order_by('-created_at'),
            many=True,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['post'])
    def pre_validate(self, request):
        """
        Prévalide un document avant sa création (sans le créer).
        Utile pour vérifier les fichiers avant upload définitif.
        """
        if 'file' not in request.FILES:
            return Response(
                {'error': 'Aucun fichier fourni'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_type = request.data.get('document_type')
        if not document_type:
            return Response(
                {'error': 'Le type de document est requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document_file = request.FILES['file']
        
        # Récupérer la spécification
        try:
            specification = DocumentSpecification.objects.get(
                document_type=document_type,
                is_active=True
            )
        except DocumentSpecification.DoesNotExist:
            specification = None
        
        # Valider le fichier
        is_valid, validation_result = DocumentService.pre_validate_file(
            document_file, 
            specification
        )
        
        return Response({
            'is_valid': is_valid,
            'status': validation_result['status'],
            'errors': validation_result.get('errors', []),
            'warnings': validation_result.get('warnings', []),
            'details': validation_result.get('details', {}),
            'message': 'Fichier valide et prêt pour l\'upload' if is_valid else 'Le fichier contient des erreurs'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def validate(self, request, pk=None):
        """Valide un document existant."""
        document = self.get_object()
        
        # Vérifier les permissions
        if document.agent != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Vous n\'avez pas la permission de valider ce document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        is_valid, validation_result = DocumentService.validate_existing_document(document)
        
        # Rafraîchir le document
        document.refresh_from_db()
        
        output_serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response({
            'is_valid': is_valid,
            'document': output_serializer.data,
            'validation_result': DocumentValidationResultSerializer(validation_result).data if validation_result else None
        })
    
    @action(detail=True, methods=['get'])
    def check_before_send(self, request, pk=None):
        """
        Vérifie si un document peut être envoyé.
        Effectue une check complète avant envoi.
        """
        document = self.get_object()
        
        # Vérifier les permissions
        if document.agent != request.user and not request.user.is_staff:
            return Response(
                {'error': 'Vous n\'avez pas la permission de vérifier ce document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from .checkers import DocumentValidationChecker
        can_send, check_results = DocumentValidationChecker.full_check_before_send(document)
        
        return Response({
            'can_send': can_send,
            'document_id': document.id,
            'document_title': document.title,
            'document_status': document.status,
            'is_validated': document.is_validated,
            'checks': check_results['checks'],
            'errors': check_results['errors'],
            'warnings': check_results['warnings'],
            'message': 'Le document est prêt à être envoyé' if can_send else 'Le document ne peut pas être envoyé'
        })
    
    @action(detail=True, methods=['post'])
    def mark_as_opened(self, request, pk=None):
        """Marque un document comme ouvert (admin only)."""
        document = self.get_object()
        
        # Vérifier les permissions
        if not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent marquer un document comme ouvert'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if document.status == 'ARCHIVE':
            return Response(
                {'error': 'Impossible d\'ouvrir un document archivé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document.status = 'EN_COURS'
        document.opened_at = timezone.now()
        document.save(update_fields=['status', 'opened_at'])
        
        # Utiliser le service de notifications
        from apps.notifications.services import NotificationService
        NotificationService.notify_on_document_opened(document, request.user)
        
        serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    def partial_update(self, request, *args, **kwargs):
        """Override de partial_update pour permettre aux admins de modifier le status."""
        # Vérifier les permissions
        if not (request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role == 'ADMIN')):
            return Response(
                {'error': 'Seuls les administrateurs peuvent modifier les documents'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        document = self.get_object()
        from apps.notifications.services import NotificationService
        
        # Si le status est fourni et c'est VALIDE
        if request.data.get('status') == 'VALIDE':
            document.status = 'VALIDE'
            document.accepted_at = timezone.now()
            document.save(update_fields=['status', 'accepted_at'])
            
            # Utiliser le service de notifications
            NotificationService.notify_on_document_approved(document, request.user)
        
        # Si le status est fourni et c'est REJETE
        elif request.data.get('status') == 'REJETE':
            reason = request.data.get('reason')
            document.status = 'REJETE'
            document.rejection_reason = reason or 'Rejeté par l\'administrateur'
            document.rejected_at = timezone.now()
            document.save(update_fields=['status', 'rejection_reason', 'rejected_at'])
            
            # Utiliser le service de notifications
            NotificationService.notify_on_document_rejected(document, request.user, reason)
        
        document.refresh_from_db()
        serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdmin])
    @transaction.atomic
    def approve(self, request, pk=None):
        """Approuve un document validé (admin only)."""
        document = self.get_object()
        
        # Vérifier si le document a un résultat de validation avec statut PASSED
        if not document.validation_result or document.validation_result.status != 'PASSED':
            return Response(
                {'error': 'Le document doit être validé avant d\'être approuvé'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document.status = 'VALIDE'
        document.accepted_at = timezone.now()
        document.save(update_fields=['status', 'accepted_at'])
        
        # Utiliser le service de notifications
        from apps.notifications.services import NotificationService
        NotificationService.notify_on_document_approved(document, request.user)
        
        document.refresh_from_db()
        
        serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated, IsAdmin])
    @transaction.atomic
    def reject(self, request, pk=None):
        """Rejette un document."""
        document = self.get_object()
        
        reason = request.data.get('reason')
        if not reason:
            return Response(
                {'error': 'La raison du rejet est requise'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        document.status = 'REJETE'
        document.rejection_reason = reason
        document.rejected_at = timezone.now()
        document.save(update_fields=['status', 'rejection_reason', 'rejected_at'])
        
        # Utiliser le service de notifications
        from apps.notifications.services import NotificationService
        NotificationService.notify_on_document_rejected(document, request.user, reason)
        
        document.refresh_from_db()
        
        serializer = DocumentDetailSerializer(
            document,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pending_validation(self, request):
        """Retourne les documents en attente de validation (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent voir les documents en attente de validation'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        queryset = Document.objects.filter(
            status='VALIDATION_EN_COURS'
        ).select_related('agent', 'specification', 'validation_result')
        
        serializer = DocumentListSerializer(
            queryset.order_by('created_at'),
            many=True,
            context=self.get_serializer_context()
        )
        
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def validation_stats(self, request):
        """Retourne les statistiques de validation (admin only)."""
        if not request.user.is_staff:
            return Response(
                {'error': 'Seuls les administrateurs peuvent voir les statistiques'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        total_documents = Document.objects.count()
        validated_documents = Document.objects.filter(status='VALIDE').count()
        rejected_documents = Document.objects.filter(status='REJETE').count()
        pending_validation = Document.objects.filter(status='EN_COURS').count()
        
        # Statistiques par type
        by_type = Document.objects.values('document_type').count()
        
        # Statistiques de validation
        validation_results = DocumentValidationResult.objects.values('status').count()
        passed = DocumentValidationResult.objects.filter(status='PASSED').count()
        failed = DocumentValidationResult.objects.filter(status='FAILED').count()
        warnings = DocumentValidationResult.objects.filter(status='WARNING').count()
        
        return Response({
            'total_documents': total_documents,
            'validated_documents': validated_documents,
            'rejected_documents': rejected_documents,
            'pending_validation': pending_validation,
            'validation_stats': {
                'passed': passed,
                'failed': failed,
                'warnings': warnings,
            }
        })

    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Retourne les statistiques complètes des documents."""
        from django.contrib.auth import get_user_model
        from django.db.models import Count, Q, Sum
        from datetime import timedelta
        
        User = get_user_model()
        
        # ✅ CORRECTION: Récupérer agent_filter EN PREMIER
        agent_filter = request.query_params.get('agent')
        
        # Obtenir les autres filtres optionnels
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        document_type = request.query_params.get('document_type')
        status_filter = request.query_params.get('status')
        
        # ✅ CORRECTION: Construire la queryset selon le filtre agent
        if agent_filter == 'me':
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Not authenticated'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            # Forcer le filtre à l'agent courant (même si l'utilisateur est admin)
            print(f"[STATISTICS] Filtering by agent: {request.user.matricule}")
            queryset = Document.objects.filter(agent=request.user)
        else:
            # Utiliser get_queryset() pour respecter les permissions par défaut
            print(f"[STATISTICS] Using default queryset for user: {request.user.matricule}")
            queryset = self.get_queryset()
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        
        # Statistiques générales
        total_documents = queryset.count()
        total_size = queryset.aggregate(Sum('file_size'))['file_size__sum'] or 0
        
        # Statistiques par statut
        status_stats = {
            'NOUVEAU': queryset.filter(status='NOUVEAU').count(),
            'EN_ATTENTE': queryset.filter(status='EN_ATTENTE').count(),
            'EN_COURS': queryset.filter(status='EN_COURS').count(),
            'VALIDE': queryset.filter(status='VALIDE').count(),
            'REJETE': queryset.filter(status='REJETE').count(),
            'ARCHIVE': queryset.filter(status='ARCHIVE').count(),
        }
        
        # Statistiques par type
        type_stats = list(
            queryset.values('document_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Statistiques de validation
        validation_stats = {
            'PASSED': DocumentValidationResult.objects.filter(status='PASSED').count(),
            'FAILED': DocumentValidationResult.objects.filter(status='FAILED').count(),
            'WARNING': DocumentValidationResult.objects.filter(status='WARNING').count(),
        }
        
        # Statistiques par format
        format_stats = list(
            queryset.values('file_format')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Taux de complétude
        if total_documents > 0:
            completion_rate = int((status_stats['VALIDE'] / total_documents) * 100)
        else:
            completion_rate = 0
        
        # Documents par utilisateur
        users_stats = list(
            queryset.values('agent__matricule', 'agent__id')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Documents créés par jour (derniers 30 jours)
        thirty_days_ago = timezone.now() - timedelta(days=30)
        daily_stats = list(
            queryset.filter(created_at__gte=thirty_days_ago)
            .extra(select={'date': 'DATE(created_at)'})
            .values('date')
            .annotate(count=Count('id'))
            .order_by('date')
        )
        
        print(f"[STATISTICS] Returning stats - Total docs: {total_documents}, Agent filter: {agent_filter}")
        
        return Response({
            'total_documents': total_documents,
            'total_size_mb': round(total_size / (1024 * 1024), 2),
            'status_stats': status_stats,
            'type_stats': type_stats,
            'format_stats': format_stats,
            'validation_stats': validation_stats,
            'completion_rate': completion_rate,
            'users_stats': users_stats,
            'daily_stats': daily_stats,
        })

    @action(detail=False, methods=['get'])
    def export(self, request):
        """Exporte les documents en format CSV ou JSON."""
        import csv
        from django.http import HttpResponse, StreamingHttpResponse
        from datetime import timedelta
        
        # Obtenir les filtres optionnels
        date_from = request.query_params.get('date_from')
        date_to = request.query_params.get('date_to')
        document_type = request.query_params.get('document_type')
        status_filter = request.query_params.get('status')
        format_type = request.query_params.get('export_format', 'json')  # json, csv
        
        # Construire la queryset
        queryset = self.get_queryset()
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        if document_type:
            queryset = queryset.filter(specification__document_type=document_type)
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Récupérer les données
        documents = DocumentListSerializer(
            queryset.order_by('-created_at'),
            many=True,
            context=self.get_serializer_context()
        ).data
        
        if format_type == 'csv':
            # Créer une réponse CSV
            response = HttpResponse(content_type='text/csv; charset=utf-8')
            response['Content-Disposition'] = 'attachment; filename="documents_export.csv"'
            
            # Ajouter BOM pour Excel
            response.write('\ufeff')
            
            writer = csv.writer(response, delimiter=',', quoting=csv.QUOTE_ALL)
            
            # En-tête
            writer.writerow([
                'ID', 'Titre', 'Type', 'Statut', 'Format', 'Taille (MB)',
                'Agent', 'Créé le', 'Validé', 'Raison rejet'
            ])
            
            # Lignes de données
            for doc in documents:
                try:
                    writer.writerow([
                        doc.get('id', ''),
                        doc.get('title', ''),
                        doc.get('document_type', ''),
                        doc.get('status', ''),
                        doc.get('file_format', ''),
                        round(doc.get('file_size', 0) / (1024 * 1024), 2) if doc.get('file_size') else 0,
                        doc.get('agent', {}).get('matricule', '') if doc.get('agent') else '',
                        doc.get('created_at', ''),
                        'Oui' if doc.get('is_validated') else 'Non',
                        doc.get('rejection_reason', ''),
                    ])
                except Exception as e:
                    print(f"Error writing row: {e}")
                    continue
            
            return response
        
        # Format JSON par défaut
        return Response({
            'total': len(documents),
            'documents': documents,
            'export_date': timezone.now().isoformat(),
        })
    
    @action(detail=False, methods=['get'])
    def list_all(self, request):
        """Liste tous les documents avec pagination."""
        queryset = self.get_queryset()
        
        # Filtres optionnels
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        document_type = request.query_params.get('document_type')
        if document_type:
            queryset = queryset.filter(document_type=document_type)
        
        file_format = request.query_params.get('file_format')
        if file_format:
            queryset = queryset.filter(file_format=file_format)
        
        # Tri
        ordering = request.query_params.get('ordering', '-created_at')
        queryset = queryset.order_by(ordering)
        
        # Pagination
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = DocumentListSerializer(
                page,
                many=True,
                context=self.get_serializer_context()
            )
            return self.get_paginated_response(serializer.data)
        
        serializer = DocumentListSerializer(
            queryset,
            many=True,
            context=self.get_serializer_context()
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def folder_structure(self, request):
        """Retourne la structure hiérarchique des dossiers et documents depuis la base de données.
        
        Pour les agents: affiche uniquement les documents de leur département.
        Pour les admins: affiche tous les dossiers et documents.
        """
        from apps.folders.models import Folder
        
        user = request.user
        is_admin = user.role == 'ADMIN' if hasattr(user, 'role') else user.is_staff
        user_department = user.department if hasattr(user, 'department') else None
        
        def build_folder_tree(folder, is_admin, user_department):
            """Construit un arbre JSON à partir d'un dossier, ses enfants et ses documents."""
            children_folders = folder.children.all().order_by('name')
            
            # Filtrer les documents selon le rôle
            if is_admin:
                documents = folder.documents.all().order_by('-created_at')
            else:
                # Pour les agents, afficher seulement leurs propres documents
                documents = folder.documents.filter(agent__department=user_department).order_by('-created_at')
            
            children = []
            
            # Ajouter les dossiers enfants
            for child_folder in children_folders:
                child_tree = build_folder_tree(child_folder, is_admin, user_department)
                # Pour les admins: afficher TOUS les dossiers (même vides)
                # Pour les agents: afficher seulement les dossiers qui ont des documents
                if is_admin or child_tree['children']:
                    children.append(child_tree)
            
            # Ajouter les documents comme des fichiers
            for doc in documents:
                # Construire le nom du fichier avec l'extension réelle
                file_name = doc.title
                
                # D'abord essayer d'utiliser file_format du modèle
                if doc.file_format:
                    file_name = f"{doc.title}.{doc.file_format}"
                # Sinon, extraire l'extension du chemin du fichier
                elif doc.file and str(doc.file):
                    file_path = str(doc.file)
                    ext = file_path.split('.')[-1].lower() if '.' in file_path else ''
                    if ext:
                        file_name = f"{doc.title}.{ext}"
                
                # Construire le chemin relatif (sans le préfixe 'documents/')
                file_path = str(doc.file) if doc.file else ''
                # Supprimer le préfixe 'documents/' si présent
                if file_path.startswith('documents/'):
                    file_path = file_path[10:]  # Enlever 'documents/'
                
                children.append({
                    'name': file_name,  # Nom complet avec extension
                    'type': 'file',
                    'path': file_path,  # Chemin sans le préfixe 'documents/'
                    'size': doc.file_size if doc.file else 0,
                    'description': doc.description or '',
                    'status': doc.status,
                    'created_at': doc.created_at.isoformat() if doc.created_at else '',
                    'agent_username': doc.agent.matricule if doc.agent else 'Système',
                })
            
            return {
                'name': folder.name,
                'type': 'folder',
                'path': folder.get_full_path(),
                'children': children
            }
        
        # Récupérer tous les dossiers racine (sans parent)
        root_folders = Folder.objects.filter(parent__isnull=True).order_by('name')
        
        # Construire l'arbre avec tous les dossiers racine
        root_children = []
        for folder in root_folders:
            folder_tree = build_folder_tree(folder, is_admin, user_department)
            # Ajouter le dossier seulement s'il contient des éléments (pour agents)
            if is_admin or folder_tree['children']:
                root_children.append(folder_tree)
        
        root_tree = {
            'name': 'Racine',
            'type': 'root',
            'path': '',
            'children': root_children
        }
        
        return Response(root_tree)

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def view(self, request):
        """Visualise un fichier du système de fichiers (sans téléchargement)."""
        file_path = request.query_params.get('path')
        
        if not file_path:
            return Response(
                {'error': 'Le paramètre "path" est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Construire le chemin complet du fichier
            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
            
            # Vérifier que le fichier existe
            if not os.path.isfile(full_path):
                return Response(
                    {'error': 'Fichier non trouvé'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Déterminer le type MIME
            import mimetypes
            content_type, _ = mimetypes.guess_type(full_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            # Retourner le fichier pour visualisation (inline, pas attachment)
            response = FileResponse(open(full_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = 'inline'  # Affiche inline au lieu de télécharger
            return response
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erreur lors de la visualisation: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def download(self, request, pk=None):
        """Télécharge le fichier d'un document spécifique par ID."""
        document = self.get_object()
        
        if not document.file:
            return Response(
                {'error': 'Aucun fichier associé à ce document'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Construire le chemin complet du fichier
            file_path = str(document.file)  # Convertir en string car c'est un FileField
            full_path = os.path.join(settings.MEDIA_ROOT, file_path)
            
            # Vérifier que le fichier existe
            if not os.path.isfile(full_path):
                return Response(
                    {'error': 'Fichier non trouvé sur le serveur'},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Créer une notification si c'est un admin qui télécharge
            if request.user.is_staff or request.user.is_superuser or (hasattr(request.user, 'role') and request.user.role == 'ADMIN'):
                from apps.notifications.services import NotificationService
                NotificationService.notify_on_document_downloaded(document, request.user)
            
            # Retourner le fichier
            file_name = document.title or os.path.basename(full_path)
            # Déterminer le type MIME
            import mimetypes
            content_type, _ = mimetypes.guess_type(full_path)
            if not content_type:
                content_type = 'application/octet-stream'
            
            response = FileResponse(open(full_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'attachment; filename="{file_name}"'
            response['Access-Control-Expose-Headers'] = 'Content-Disposition'
            return response
        except Exception as e:
            import traceback
            traceback.print_exc()
            return Response(
                {'error': f'Erreur lors du téléchargement: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def stats(self, request):
        """Retourne les statistiques des documents pour les admins."""
        from django.contrib.auth import get_user_model
        User = get_user_model()
        
        user = request.user
        
        # Les admins voient toutes les stats, les agents ne voient que les leurs
        if user.is_staff or user.is_superuser or getattr(user, 'role', None) == 'ADMIN':
            queryset = Document.objects.all()
            total_users = User.objects.filter(role='AGENT').count() if hasattr(User, 'role') else User.objects.filter(is_staff=False).count()
        else:
            queryset = Document.objects.filter(agent=user)
            total_users = 1
        
        total_documents = queryset.count()
        approved_documents = queryset.filter(status__in=['APPROUVE', 'VALIDE']).count()
        pending_documents = queryset.filter(status__in=['EN_ATTENTE', 'EN_COURS']).count()
        rejected_documents = queryset.filter(status='REJETE').count()
        
        # Calculer le taux d'approbation
        approval_rate = 0
        if total_documents > 0:
            approval_rate = round((approved_documents / total_documents) * 100, 1)
        
        return Response({
            'totalDocuments': total_documents,
            'approvedDocuments': approved_documents,
            'pendingDocuments': pending_documents,
            'rejectedDocuments': rejected_documents,
            'totalUsers': total_users,
            'approvalRate': approval_rate,
        })

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def view(self, request):
        """Affiche/prévisualise un fichier du système de fichiers."""
        file_path = request.query_params.get('path')
        
        if not file_path:
            return Response(
                {'error': 'Le paramètre "path" est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Sécurité : vérifier que le chemin commence par documents
        media_root = settings.MEDIA_ROOT
        documents_path = os.path.join(media_root, 'documents')
        full_path = os.path.join(documents_path, file_path)
        
        # Vérifier que le fichier existe et qu'il ne sort pas du répertoire documents
        if not os.path.isfile(full_path) or not os.path.abspath(full_path).startswith(os.path.abspath(documents_path)):
            return Response(
                {'error': 'Fichier non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        try:
            # Déterminer le type MIME et envoyer le fichier
            file_name = os.path.basename(full_path)
            file_ext = os.path.splitext(file_name)[1].lower()
            
            # Type MIME par extension
            mime_types = {
                '.pdf': 'application/pdf',
                '.txt': 'text/plain',
                '.csv': 'text/csv',
                '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                '.xls': 'application/vnd.ms-excel',
                '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                '.doc': 'application/msword',
                '.jpg': 'image/jpeg',
                '.jpeg': 'image/jpeg',
                '.png': 'image/png',
                '.gif': 'image/gif',
            }
            
            content_type = mime_types.get(file_ext, 'application/octet-stream')
            
            response = FileResponse(open(full_path, 'rb'), content_type=content_type)
            response['Content-Disposition'] = f'inline; filename="{file_name}"'
            return response
        except Exception as e:
            return Response(
                {'error': f'Erreur lors de l\'affichage: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    @transaction.atomic
    def reroute(self, request, pk=None):
        """Re-router un document vers un autre dossier."""
        from .permissions import CanRerouteDocument
        from .models import DocumentTransfer
        from .serializers import DocumentTransferSerializer
        
        document = self.get_object()
        
        # Vérifier les permissions
        permission = CanRerouteDocument()
        if not permission.has_object_permission(request, self, document):
            return Response(
                {'error': 'Vous n\'avez pas la permission de re-router ce document'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Récupérer la destination
        to_folder_id = request.data.get('to_folder_id')
        transfer_type = request.data.get('transfer_type', 'MANUAL_TRANSFER')
        reason = request.data.get('reason', '')
        
        if not to_folder_id:
            return Response(
                {'error': 'to_folder_id est obligatoire'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from apps.folders.models import Folder
        try:
            to_folder = Folder.objects.get(id=to_folder_id)
        except Folder.DoesNotExist:
            return Response(
                {'error': 'Dossier de destination non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Créer le transfer
        transfer = DocumentTransfer.objects.create(
            document=document,
            from_folder=document.destination_folder,
            to_folder=to_folder,
            transferred_by=request.user,
            transfer_type=transfer_type,
            reason=reason
        )
        
        # Mettre à jour le document
        document.destination_folder = to_folder
        document.save()
        
        # Enregistrer l'audit
        from apps.common.audit import AuditLog
        AuditLog.objects.create(
            action='DOCUMENT_TRANSFER',
            actor=request.user,
            description=f'Document {document.name} transféré de {transfer.from_folder.name} to {to_folder.name}',
            severity='MEDIUM',
            success=True
        )
        
        serializer = DocumentTransferSerializer(transfer)
        return Response(serializer.data, status=status.HTTP_200_OK)

class DocumentValidationResultViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet pour les résultats de validation (lecture seule)."""
    
    serializer_class = DocumentValidationResultSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les résultats de validation selon les permissions."""
        user = self.request.user
        
        queryset = DocumentValidationResult.objects.select_related('document')
        
        # Les utilisateurs ne voient que leurs propres résultats
        if not user.is_staff:
            queryset = queryset.filter(document__agent=user)
        
        return queryset


from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.apps import apps


class DocumentShareViewSet(viewsets.ModelViewSet):
    """
    ViewSet pour gérer les partages de documents entre utilisateurs.
    N'importe quel utilisateur peut partager un document avec n'importe quel autre utilisateur.
    """
    
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les partages de l'utilisateur courant."""
        from apps.users.serializers import DocumentShareSerializer
        DocumentShare = apps.get_model('documents', 'DocumentShare')
        
        user = self.request.user
        # Voir les docs partagés avec moi ET les docs que j'ai partagés
        return DocumentShare.objects.filter(
            models.Q(shared_with=user) | models.Q(shared_by=user)
        ).order_by('-shared_at')
    
    def get_serializer_class(self):
        """Utiliser les bons sérialiseurs."""
        if self.action == 'create':
            from apps.users.serializers import DocumentShareCreateSerializer
            return DocumentShareCreateSerializer
        from apps.users.serializers import DocumentShareSerializer
        return DocumentShareSerializer
    
    def perform_create(self, serializer):
        """Le partageur est toujours l'utilisateur courant."""
        serializer.save(shared_by=self.request.user)
    
    @action(detail=False, methods=['get'])
    def shared_with_me(self, request):
        """Obtenir les documents partagés avec moi (user ou folder)."""
        DocumentShare = apps.get_model('documents', 'DocumentShare')
        from apps.users.serializers import DocumentShareSerializer
        
        user = request.user
        
        # 1. Documents partagés directement avec l'utilisateur
        user_shares = DocumentShare.objects.filter(
            shared_with=user,
            expires_at__isnull=True
        ) | DocumentShare.objects.filter(
            shared_with=user,
            expires_at__gt=timezone.now()
        )
        
        # 2. Documents partagés avec les dossiers auxquels l'utilisateur appartient
        # Récupérer les dossiers de l'utilisateur
        from apps.folders.models import Folder
        user_folders = set()
        
        # Ajouter la branche (filiale)
        if user.branch:
            user_folders.add(user.branch.id)
            # Ajouter aussi le parent (pôle) si c'est une filiale
            if user.branch.parent:
                user_folders.add(user.branch.parent.id)
        
        # Ajouter le département (service)
        if user.department:
            user_folders.add(user.department.id)
            # Ajouter aussi le parent (filiale) si c'est un service
            if user.department.parent:
                user_folders.add(user.department.parent.id)
                # Ajouter le pôle (grand-parent)
                if user.department.parent.parent:
                    user_folders.add(user.department.parent.parent.id)
        
        # Ajouter le pôle si spécifié
        if user.pole:
            user_folders.add(user.pole.id)
        
        folder_shares = DocumentShare.objects.filter(
            shared_with_folder_id__in=user_folders,
            expires_at__isnull=True
        ) | DocumentShare.objects.filter(
            shared_with_folder_id__in=user_folders,
            expires_at__gt=timezone.now()
        )
        
        # Combiner et dédupliquer
        all_shares = user_shares | folder_shares
        all_shares = all_shares.distinct().order_by('-shared_at')
        
        serializer = DocumentShareSerializer(all_shares, many=True)
        return Response({
            'count': all_shares.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def shared_by_me(self, request):
        """Obtenir les documents que j'ai partagés."""
        DocumentShare = apps.get_model('documents', 'DocumentShare')
        from apps.users.serializers import DocumentShareSerializer
        
        shares = DocumentShare.objects.filter(
            shared_by=request.user
        ).order_by('-shared_at')
        
        serializer = DocumentShareSerializer(shares, many=True)
        return Response({
            'count': shares.count(),
            'results': serializer.data
        })
    
    @action(detail=False, methods=['get'])
    def available_recipients(self, request):
        """Obtenir les utilisateurs et dossiers disponibles pour partage."""
        from apps.users.models import User
        from apps.folders.models import Folder
        from apps.users.serializers import UserListSerializer
        from apps.folders.serializers import FolderSerializer
        
        # Tous les utilisateurs
        users = User.objects.filter(is_active=True).exclude(id=request.user.id)
        user_serializer = UserListSerializer(users, many=True)
        
        # Tous les dossiers (Pôles, Filiales, Services)
        folders = Folder.objects.filter(folder_type__in=['pole', 'filiale', 'service'])
        folder_serializer = FolderSerializer(folders, many=True)
        
        return Response({
            'users': user_serializer.data,
            'users_count': users.count(),
            'folders': folder_serializer.data,
            'folders_count': folders.count(),
        })
    
    @action(detail=True, methods=['post'])
    def mark_accessed(self, request, pk=None):
        """Marquer un document comme accédé."""
        from django.utils import timezone
        from apps.folders.models import Folder
        
        share = self.get_object()
        user = request.user
        
        # Vérifier que c'est le destinataire (user ou folder)
        is_recipient = False
        
        # Cas 1: partage direct avec l'utilisateur
        if share.shared_with == user:
            is_recipient = True
        
        # Cas 2: partage avec dossier auquel l'utilisateur appartient
        if share.shared_with_folder:
            if (user.branch and user.branch.id == share.shared_with_folder.id) or \
               (user.department and user.department.id == share.shared_with_folder.id) or \
               (user.pole and user.pole.id == share.shared_with_folder.id) or \
               (user.branch and user.branch.parent and user.branch.parent.id == share.shared_with_folder.id) or \
               (user.department and user.department.parent and user.department.parent.id == share.shared_with_folder.id) or \
               (user.department and user.department.parent and user.department.parent.parent and user.department.parent.parent.id == share.shared_with_folder.id):
                is_recipient = True
        
        if not is_recipient:
            return Response(
                {'detail': 'You can only mark your own shares as accessed'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        share.accessed_at = timezone.now()
        share.save()
        
        from apps.users.serializers import DocumentShareSerializer
        serializer = DocumentShareSerializer(share)
        return Response(serializer.data)
    
    @action(detail=True, methods=['delete'])
    def revoke(self, request, pk=None):
        """Révoquer un partage (seul le partageur peut faire ça)."""
        share = self.get_object()
        
        # Vérifier que c'est le partageur
        if share.shared_by != request.user:
            return Response(
                {'detail': 'Only the person who shared can revoke'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        share.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
