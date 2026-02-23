"""
Fixtures pour initialiser les spécifications de documents.
Utilisez: python manage.py loaddata documents/fixtures/document_specifications.json
"""

import json
from django.core.management.base import BaseCommand
from apps.documents.models import DocumentSpecification


class Command(BaseCommand):
    help = 'Initialise les spécifications de documents'
    
    def handle(self, *args, **options):
        specifications = [
            {
                'document_type': 'CONGE',
                'display_name': 'Demande de congé',
                'description': 'Demande de congé de l\'agent',
                'allowed_formats': 'pdf,docx,xlsx',
                'requires_excel': False,
                'required_columns': [],
                'max_file_size_mb': 10,
                'max_rows': None,
                'requires_validation': True,
            },
            {
                'document_type': 'RAPPORT_EXCEL',
                'display_name': 'Rapport Excel',
                'description': 'Rapport d\'activité au format Excel',
                'allowed_formats': 'xlsx,xls',
                'requires_excel': True,
                'excel_sheet_name': 'Rapport',
                'required_columns': ['Date', 'Agent', 'Activité', 'Heures'],
                'max_file_size_mb': 50,
                'max_rows': 10000,
                'requires_validation': True,
            },
            {
                'document_type': 'DONNEES_EXCEL',
                'display_name': 'Données Excel',
                'description': 'Données structurées au format Excel',
                'allowed_formats': 'xlsx,xls,csv',
                'requires_excel': True,
                'excel_sheet_name': '',
                'required_columns': [],
                'max_file_size_mb': 100,
                'max_rows': 50000,
                'requires_validation': True,
            },
            {
                'document_type': 'EXPORT_EXCEL',
                'display_name': 'Export Excel',
                'description': 'Export de données au format Excel',
                'allowed_formats': 'xlsx,xls',
                'requires_excel': True,
                'excel_sheet_name': '',
                'required_columns': [],
                'max_file_size_mb': 50,
                'max_rows': 100000,
                'requires_validation': True,
            },
            {
                'document_type': 'MEDICAL',
                'display_name': 'Certificat médical',
                'description': 'Certificat médical de l\'agent',
                'allowed_formats': 'pdf,docx',
                'requires_excel': False,
                'required_columns': [],
                'max_file_size_mb': 10,
                'max_rows': None,
                'requires_validation': False,
            },
            {
                'document_type': 'ADMINISTRATIF',
                'display_name': 'Document administratif',
                'description': 'Tout document administratif',
                'allowed_formats': 'pdf,docx,xlsx,doc,xls',
                'requires_excel': False,
                'required_columns': [],
                'max_file_size_mb': 50,
                'max_rows': None,
                'requires_validation': True,
            },
            {
                'document_type': 'AUTRE',
                'display_name': 'Autre document',
                'description': 'Autres types de documents',
                'allowed_formats': 'pdf,docx,xlsx,doc,xls,txt,csv',
                'requires_excel': False,
                'required_columns': [],
                'max_file_size_mb': 50,
                'max_rows': None,
                'requires_validation': False,
            },
        ]
        
        for spec_data in specifications:
            spec, created = DocumentSpecification.objects.get_or_create(
                document_type=spec_data['document_type'],
                defaults=spec_data
            )
            
            action = 'créée' if created else 'mise à jour'
            self.stdout.write(
                self.style.SUCCESS(
                    f'Spécification "{spec.display_name}" {action} avec succès'
                )
            )
