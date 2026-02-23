"""
Configuration d'administration Django pour les documents.
"""

from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from .models import Document, DocumentSpecification, DocumentValidationResult


@admin.register(DocumentSpecification)
class DocumentSpecificationAdmin(admin.ModelAdmin):
    """Administrateur pour les spécifications de documents avec interface complète."""
    
    list_display = [
        'display_name',
        'document_type',
        'allowed_formats_display',
        'max_file_size_mb',
        'max_rows',
        'requires_validation_status',
        'is_active_status',
    ]
    list_filter = ['is_active', 'requires_validation', 'document_type']
    search_fields = ['document_type', 'display_name', 'description']
    
    fieldsets = (
        ('📋 Informations générales', {
            'fields': ('document_type', 'display_name', 'description', 'is_active', 'requires_validation'),
            'description': 'Configurez le type de document et ses paramètres généraux'
        }),
        ('📁 Formats et fichiers autorisés', {
            'fields': ('allowed_formats',),
            'description': 'Spécifiez les formats autorisés (pdf, xlsx, docx, csv, etc.) séparés par des virgules'
        }),
        ('📊 Validation Excel', {
            'fields': ('requires_excel', 'excel_sheet_name', 'required_columns', 'max_rows'),
            'classes': ('collapse',),
            'description': 'Configurez la validation des fichiers Excel si applicable'
        }),
        ('📏 Limites de taille', {
            'fields': ('max_file_size_mb',),
            'description': 'Taille maximale en mégabytes'
        }),
        ('🕐 Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    readonly_fields = ['created_at', 'updated_at']
    
    def allowed_formats_display(self, obj):
        """Affiche les formats autorisés de manière lisible."""
        formats = obj.get_allowed_formats_list()
        return ', '.join(formats) if formats else 'Aucun'
    allowed_formats_display.short_description = 'Formats'
    
    def requires_validation_status(self, obj):
        """Affiche le statut de validation requise."""
        if obj.requires_validation:
            return format_html(
                '<span style="color: green;">✓ Oui</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Non</span>'
        )
    requires_validation_status.short_description = 'Validation requise'
    
    def is_active_status(self, obj):
        """Affiche le statut d'activité."""
        if obj.is_active:
            return format_html(
                '<span style="color: green;">✓ Actif</span>'
            )
        return format_html(
            '<span style="color: red;">✗ Inactif</span>'
        )
    is_active_status.short_description = 'Statut'
    
    def get_readonly_fields(self, request, obj=None):
        """Toujours en lecture seule pour le type de document (après création)."""
        readonly = list(super().get_readonly_fields(request, obj))
        if obj:  # Editing existing object
            readonly.append('document_type')
        return readonly
    
    def formfield_for_dbfield(self, db_field, request, **kwargs):
        """Améliore les champs du formulaire avec des descriptions."""
        formfield = super().formfield_for_dbfield(db_field, request, **kwargs)
        
        if db_field.name == 'allowed_formats':
            formfield.help_text = mark_safe(
                '<strong>Exemple:</strong> pdf,xlsx,docx,csv<br>'
                '<strong>Formats disponibles:</strong> pdf, doc, docx, xls, xlsx, xlsm, csv, txt, image, zip'
            )
        elif db_field.name == 'required_columns':
            formfield.help_text = mark_safe(
                '<strong>Format JSON:</strong> ["Colonne1", "Colonne2", "Colonne3"]<br>'
                '<strong>Exemple:</strong> ["Nom", "Email", "Département"]'
            )
        elif db_field.name == 'excel_sheet_name':
            formfield.help_text = 'Nom exact de la feuille Excel (laissez vide pour première feuille)'
        elif db_field.name == 'max_rows':
            formfield.help_text = 'Nombre maximum de lignes pour les fichiers Excel (laissez vide pour illimité)'
        
        return formfield


@admin.register(DocumentValidationResult)
class DocumentValidationResultAdmin(admin.ModelAdmin):
    """Administrateur pour les résultats de validation."""
    
    list_display = [
        'get_document_title',
        'status_display',
        'get_error_count',
        'get_warning_count',
        'validated_at',
    ]
    list_filter = ['status', 'validated_at']
    search_fields = ['document__title', 'document__agent__username']
    readonly_fields = ['document', 'validated_at', 'errors', 'warnings', 'validation_details']
    
    fieldsets = (
        ('Document', {
            'fields': ('document', 'validated_at')
        }),
        ('Résultat de validation', {
            'fields': ('status',)
        }),
        ('Erreurs', {
            'fields': ('errors',),
            'classes': ('collapse',),
        }),
        ('Avertissements', {
            'fields': ('warnings',),
            'classes': ('collapse',),
        }),
        ('Détails de validation', {
            'fields': ('validation_details',),
            'classes': ('collapse',),
        }),
    )
    
    def status_display(self, obj):
        """Affiche le statut avec couleur."""
        colors = {
            'PASSED': 'green',
            'WARNING': 'orange',
            'FAILED': 'red',
        }
        color = colors.get(obj.status, 'gray')
        return format_html(
            '<span style="color: {}; font-weight: bold;">{}</span>',
            color,
            obj.get_status_display()
        )
    status_display.short_description = 'Statut'
    
    def get_document_title(self, obj):
        """Retourne le titre du document."""
        return obj.document.title if obj.document else 'N/A'
    get_document_title.short_description = 'Document'
    
    def get_error_count(self, obj):
        """Compte les erreurs."""
        count = len(obj.errors) if obj.errors else 0
        if count > 0:
            return format_html(
                '<span style="color: red; font-weight: bold;">{}</span>',
                count
            )
        return '0'
    get_error_count.short_description = 'Erreurs'
    
    def get_warning_count(self, obj):
        """Compte les avertissements."""
        count = len(obj.warnings) if obj.warnings else 0
        if count > 0:
            return format_html(
                '<span style="color: orange; font-weight: bold;">{}</span>',
                count
            )
        return '0'
    get_warning_count.short_description = 'Avertissements'
    
    def has_add_permission(self, request):
        """Empêche l'ajout manuel de résultats de validation."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Empêche la suppression de résultats de validation."""
        return False


@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    """Administrateur professionnel pour les documents avec interface avancée."""
    
    list_display = [
        'document_thumbnail',
        'title_truncated',
        'agent_with_dept',
        'document_type_badge',
        'status_badge',
        'file_info',
        'created_at_short',
    ]
    list_filter = [
        'status',
        'document_type',
        'created_at',
        'agent__department',
        ('routed_automatically', admin.RelatedFieldListFilter),
    ]
    search_fields = ['title', 'agent__username', 'agent__email', 'agent__first_name', 'agent__last_name']
    readonly_fields = [
        'file_size',
        'mime_type',
        'file_format',
        'created_at',
        'updated_at',
        'opened_at',
        'accepted_at',
        'rejected_at',
        'archived_at',
        'validation_result_display',
        'file_preview',
        'document_path_display',
    ]
    
    # Tri par défaut
    ordering = ['-created_at']
    
    # Affichage par page
    list_per_page = 50
    
    fieldsets = (
        ('📄 Informations principales', {
            'fields': ('file_preview', 'title', 'description', 'document_type', 'file', 'document_path_display'),
            'description': 'Détails du document et aperçu du fichier'
        }),
        ('👤 Agent et localisation', {
            'fields': ('agent', 'folder'),
            'description': 'Agent qui a téléversé le document et dossier de destination'
        }),
        ('✅ Spécification', {
            'fields': ('specification',),
            'description': 'Spécification de validation appliquée'
        }),
        ('🔄 Statut et workflow', {
            'fields': ('status', 'opened_at', 'accepted_at', 'rejected_at', 'archived_at', 'rejection_reason'),
            'description': 'Progression du document dans le workflow'
        }),
        ('📊 Résultat de validation', {
            'fields': ('validation_result_display',),
            'classes': ('collapse',),
            'description': 'Détails de la validation du fichier'
        }),
        ('📋 Métadonnées du fichier', {
            'fields': ('file_format', 'file_size', 'mime_type', 'excel_sheet_name', 'excel_row_count', 'excel_column_count'),
            'classes': ('collapse',),
            'description': 'Informations techniques du fichier'
        }),
        ('🎯 Routage automatique', {
            'fields': ('routed_automatically', 'routing_rule_applied'),
            'classes': ('collapse',),
            'description': 'Détails du routage basé sur le type de document'
        }),
        ('⏰ Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',),
        }),
    )
    
    # ========== MÉTHODES DE RENDU POUR LA LISTE ==========
    
    def document_thumbnail(self, obj):
        """Affiche une miniature du document avec icône."""
        icons = {
            'pdf': '📄',
            'xlsx': '📊',
            'docx': '📝',
            'csv': '📋',
            'txt': '📃',
            'jpg': '🖼️',
            'png': '🖼️',
        }
        icon = icons.get(obj.file_format or 'unknown', '📎')
        return format_html(
            '<span style="font-size: 1.2em;">{}</span>',
            icon
        )
    document_thumbnail.short_description = '📎'
    
    def title_truncated(self, obj):
        """Affiche le titre tronqué avec style."""
        title = obj.title if len(obj.title) <= 40 else f"{obj.title[:37]}..."
        return format_html(
            '<strong>{}</strong>',
            title
        )
    title_truncated.short_description = 'Document'
    
    def agent_with_dept(self, obj):
        """Affiche l'agent avec son département."""
        if obj.agent:
            return format_html(
                '<div><strong>{}</strong><br><span style="color: #666; font-size: 0.85em;">{}</span></div>',
                obj.agent.get_full_name() or obj.agent.username,
                f"Dept: {obj.agent.department}" if obj.agent.department else "Dept: N/A"
            )
        return '—'
    agent_with_dept.short_description = 'Agent & Dept'
    
    def document_type_badge(self, obj):
        """Affiche le type de document avec badge coloré."""
        colors = {
            'CONGE': '#FFC107',
            'ATTESTATION': '#17A2B8',
            'CONTRAT': '#6F42C1',
            'BUDGET': '#28A745',
            'FACTURE': '#FD7E14',
            'RAPPORT': '#007BFF',
            'DEMANDE': '#E83E8C',
            'JUSTIFICATIF': '#6C757D',
            'NOTE_FRAIS': '#20C997',
        }
        color = colors.get(obj.document_type, '#6C757D')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 3px 8px; border-radius: 3px; font-weight: bold; font-size: 0.9em;">{}</span>',
            color,
            obj.document_type
        )
    document_type_badge.short_description = 'Type'
    
    def status_badge(self, obj):
        """Affiche le statut avec badge coloré."""
        status_colors = {
            'NOUVEAU': '#6C757D',
            'EN_COURS': '#007BFF',
            'VALIDE': '#28A745',
            'REJETE': '#DC3545',
            'ARCHIVE': '#495057',
        }
        status_icons = {
            'NOUVEAU': '🆕',
            'EN_COURS': '⏳',
            'VALIDE': '✅',
            'REJETE': '❌',
            'ARCHIVE': '📦',
        }
        color = status_colors.get(obj.status, '#6C757D')
        icon = status_icons.get(obj.status, '•')
        return format_html(
            '<span style="background-color: {}; color: white; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 0.9em;">{} {}</span>',
            color,
            icon,
            obj.get_status_display()
        )
    status_badge.short_description = 'Statut'
    
    def file_info(self, obj):
        """Affiche les informations du fichier."""
        size_str = f"{obj.file_size/1024:.1f}KB" if obj.file_size else "—"
        return format_html(
            '<div><span style="font-size: 0.85em; color: #666;">{} · {}</span></div>',
            obj.file_format.upper() if obj.file_format else "?",
            size_str
        )
    file_info.short_description = 'Fichier'
    
    def created_at_short(self, obj):
        """Affiche la date de création formatée."""
        if obj.created_at:
            return format_html(
                '<div style="font-size: 0.85em;">{}</div>',
                obj.created_at.strftime('%d/%m/%Y %H:%M')
            )
        return '—'
    created_at_short.short_description = 'Créé le'
    
    # ========== MÉTHODES DE RENDU POUR LES DÉTAILS ==========
    
    def file_preview(self, obj):
        """Affiche un aperçu du fichier s'il existe."""
        if not obj.file:
            return format_html('<em>Pas de fichier</em>')
        
        file_url = obj.file.url
        ext = obj.file_format or 'unknown'
        
        html = f'<div style="margin-bottom: 10px;">'
        
        # Pour les images
        if ext.lower() in ['jpg', 'jpeg', 'png', 'gif']:
            html += f'<img src="{file_url}" style="max-width: 300px; max-height: 300px; border: 1px solid #ddd; border-radius: 4px;">'
        else:
            html += f'<a href="{file_url}" class="button" target="_blank">📥 Télécharger le fichier</a>'
        
        html += '</div>'
        return format_html(html)
    file_preview.short_description = 'Aperçu'
    
    def document_path_display(self, obj):
        """Affiche le chemin complet du document."""
        if obj.file:
            path = str(obj.file)
            return format_html(
                '<div style="background-color: #f5f5f5; padding: 10px; border-radius: 4px; font-family: monospace; word-break: break-all;"><strong>Chemin:</strong><br>{}</div>',
                path
            )
        return '—'
    document_path_display.short_description = 'Localisation'
    
    def validation_result_display(self, obj):
        """Affiche le résultat de validation si disponible."""
        try:
            result = obj.validation_result
            if not result:
                return 'Pas de résultat de validation'
            
            html = f'<b>Statut:</b> {result.status}<br>'
            
            if result.errors:
                html += '<b style="color: red;">Erreurs:</b><ul>'
                for error in result.errors:
                    html += f'<li>{error}</li>'
                html += '</ul>'
            
            if result.warnings:
                html += '<b style="color: orange;">Avertissements:</b><ul>'
                for warning in result.warnings:
                    html += f'<li>{warning}</li>'
                html += '</ul>'
            
            return format_html(html)
        except:
            return 'Erreur lors de la lecture du résultat'
    validation_result_display.short_description = 'Résultat de validation'
    
    # ========== ACTIONS EN MASSE ==========
    
    def mark_as_validated(self, request, queryset):
        """Action pour marquer les documents comme validés."""
        updated = queryset.update(status='VALIDE')
        self.message_user(request, f'✅ {updated} document(s) marqué(s) comme validé(s).')
    mark_as_validated.short_description = '✅ Marquer comme validé'
    
    def mark_as_rejected(self, request, queryset):
        """Action pour marquer les documents comme rejetés."""
        updated = queryset.update(status='REJETE')
        self.message_user(request, f'❌ {updated} document(s) marqué(s) comme rejeté(s).')
    mark_as_rejected.short_description = '❌ Marquer comme rejeté'
    
    def mark_as_archived(self, request, queryset):
        """Action pour archiver les documents."""
        from django.utils import timezone
        updated = queryset.update(status='ARCHIVE', archived_at=timezone.now())
        self.message_user(request, f'📦 {updated} document(s) archivé(s).')
    mark_as_archived.short_description = '📦 Archiver'
    
    def export_as_csv(self, request, queryset):
        """Action pour exporter les documents en CSV."""
        import csv
        from django.http import HttpResponse
        
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="documents_export.csv"'
        
        writer = csv.writer(response)
        writer.writerow(['Titre', 'Agent', 'Département', 'Type', 'Statut', 'Créé le', 'Format', 'Taille'])
        
        for doc in queryset:
            writer.writerow([
                doc.title,
                doc.agent.get_full_name() if doc.agent else 'N/A',
                doc.agent.department if doc.agent else 'N/A',
                doc.document_type,
                doc.get_status_display(),
                doc.created_at.strftime('%d/%m/%Y %H:%M'),
                doc.file_format,
                f"{doc.file_size/1024:.1f}KB" if doc.file_size else 'N/A'
            ])
        
        self.message_user(request, f'📊 {queryset.count()} document(s) exporté(s) en CSV.')
        return response
    export_as_csv.short_description = '📊 Exporter en CSV'
    
    actions = [mark_as_validated, mark_as_rejected, mark_as_archived, export_as_csv]
    
    # ========== PERMISSIONS ==========
    
    def has_add_permission(self, request):
        """Empêche l'ajout manuel de documents."""
        return False
    
    def has_delete_permission(self, request, obj=None):
        """Empêche la suppression de documents."""
        return False
    
    # ========== CUSTOMISATIONS AVANCÉES ==========
    
    def get_queryset(self, request):
        """Optimise la requête avec select_related et prefetch_related."""
        qs = super().get_queryset(request)
        return qs.select_related('agent', 'folder', 'specification', 'validation_result').prefetch_related()
    
    def changelist_view(self, request, extra_context=None):
        """Ajoute des statistiques en contexte."""
        from django.db.models import Count, Q
        from django.utils import timezone
        
        extra_context = extra_context or {}
        queryset = self.get_queryset(request)
        
        # Statistiques rapides
        total = queryset.count()
        today_count = queryset.filter(created_at__date=timezone.now().date()).count()
        pending = queryset.filter(status__in=['NOUVEAU', 'EN_COURS']).count()
        
        # Par statut
        by_status = queryset.values('status').annotate(count=Count('id'))
        
        extra_context.update({
            'total_documents': total,
            'today_count': today_count,
            'pending_count': pending,
            'by_status': list(by_status),
        })
        
        return super().changelist_view(request, extra_context)
    
    def get_readonly_fields(self, request, obj=None):
        """Rend tous les champs readonly sauf certains pour les admins."""
        if request.user.is_superuser and obj:
            # Superuser peut éditer statut et raison de rejet
            return [f for f in self.readonly_fields if f not in ['status', 'rejection_reason']]
        return self.readonly_fields
    
    class Media:
        """Ajoute du CSS personnalisé pour l'admin."""
        css = {
            'all': ('admin/documents_admin.css',)
        }


# Enregistrer DocumentAdmin avec vérification
if not admin.site.is_registered(Document):
    admin.site.register(Document, DocumentAdmin)


