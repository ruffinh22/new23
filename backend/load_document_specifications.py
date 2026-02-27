"""
Script pour charger les spécifications de documents dans la base de données.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.documents.models import DocumentSpecification

# Configuration des spécifications
specifications = [
    # Demandes et documents RH
    {
        "document_type": "CONGE",
        "display_name": "Demande de congé",
        "description": "Demande de congés ou de jours de repos",
        "allowed_formats": "pdf,docx,doc,xlsx,xls,csv",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 10,
    },
    {
        "document_type": "MEDICAL",
        "display_name": "Certificat médical",
        "description": "Certificat ou arrêt médical",
        "allowed_formats": "pdf,docx,doc,image",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 10,
    },
    {
        "document_type": "RAPPORT",
        "display_name": "Rapport d'activité",
        "description": "Rapport d'activité ou de travail",
        "allowed_formats": "pdf,docx,doc,xlsx,xls",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 20,
    },
    {
        "document_type": "TEMPS",
        "display_name": "Fiche de temps",
        "description": "Feuille de temps ou timesheet",
        "allowed_formats": "xlsx,xls,csv,pdf",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 10,
    },
    {
        "document_type": "FORMATION",
        "display_name": "Demande de formation",
        "description": "Demande d'accès à une formation",
        "allowed_formats": "pdf,docx,doc",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 10,
    },
    {
        "document_type": "ADMINISTRATIF",
        "display_name": "Document administratif",
        "description": "Document administratif général",
        "allowed_formats": "pdf,docx,doc,xlsx,xls",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 20,
    },
    {
        "document_type": "JUSTIFICATIF",
        "display_name": "Justificatif",
        "description": "Justificatif de dépense ou d'absence",
        "allowed_formats": "pdf,docx,doc,image,xlsx,xls",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 10,
    },
    {
        "document_type": "CONTRAT",
        "display_name": "Contrat",
        "description": "Contrat de travail ou accord",
        "allowed_formats": "pdf,docx,doc",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 20,
    },
    {
        "document_type": "EVALUATION",
        "display_name": "Évaluation",
        "description": "Évaluation de performance ou compétences",
        "allowed_formats": "pdf,docx,doc,xlsx,xls",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 10,
    },
    # Données Excel
    {
        "document_type": "DONNEES_EXCEL",
        "display_name": "Données Excel",
        "description": "Fichier de données au format Excel",
        "allowed_formats": "xlsx,xls,xlsm,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
        "max_rows": 100000,
    },
    {
        "document_type": "DONNEES_AGENTS",
        "display_name": "Données des agents",
        "description": "Liste ou données des agents",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DONNEES_PROJETS",
        "display_name": "Données des projets",
        "description": "Données et planification des projets",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DONNEES_HEURES",
        "display_name": "Données des heures",
        "description": "Heures de travail et timesheets",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DONNEES_ABSENCES",
        "display_name": "Données des absences",
        "description": "Absences et congés",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    # Rapports et exports
    {
        "document_type": "EXPORT_EXCEL",
        "display_name": "Export Excel",
        "description": "Fichier d'export au format Excel",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 100,
    },
    {
        "document_type": "RAPPORT_EXCEL",
        "display_name": "Rapport Excel",
        "description": "Rapport au format Excel",
        "allowed_formats": "xlsx,xls",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 100,
    },
    {
        "document_type": "RAPPORT_MENSUEL",
        "display_name": "Rapport mensuel",
        "description": "Rapport mensuel",
        "allowed_formats": "xlsx,xls,pdf,docx",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "RAPPORT_ANNUEL",
        "display_name": "Rapport annuel",
        "description": "Rapport annuel",
        "allowed_formats": "xlsx,xls,pdf,docx",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 100,
    },
    {
        "document_type": "STATISTIQUES_EXCEL",
        "display_name": "Statistiques Excel",
        "description": "Fichier de statistiques",
        "allowed_formats": "xlsx,xls",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    # Paies et charges
    {
        "document_type": "BULLETINS_PAIE",
        "display_name": "Bulletins de paie",
        "description": "Fichier des bulletins de paie",
        "allowed_formats": "xlsx,xls,csv,pdf",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "FEUILLE_PAIE",
        "display_name": "Feuille de paie",
        "description": "Feuille de paie consolidée",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "CHARGES_SOCIALES",
        "display_name": "Charges sociales",
        "description": "Déclaration de charges sociales",
        "allowed_formats": "xlsx,xls,csv,pdf",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DECLARATIONS_URSSAF",
        "display_name": "Déclarations URSSAF",
        "description": "Fichier de déclaration URSSAF",
        "allowed_formats": "xlsx,xls,csv,txt",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    # Budgets et finances
    {
        "document_type": "BUDGET_PREVISIONNEL",
        "display_name": "Budget prévisionnel",
        "description": "Budget prévisionnel",
        "allowed_formats": "xlsx,xls,pdf",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "BUDGET_REALISE",
        "display_name": "Budget réalisé",
        "description": "Budget réalisé et dépenses",
        "allowed_formats": "xlsx,xls,pdf",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "FACTURES_EXCEL",
        "display_name": "Factures",
        "description": "Fichier des factures",
        "allowed_formats": "xlsx,xls,csv,pdf",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DEVIS_EXCEL",
        "display_name": "Devis",
        "description": "Fichier des devis",
        "allowed_formats": "xlsx,xls,pdf,docx",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "DEPENSES_EXCEL",
        "display_name": "Dépenses",
        "description": "Fichier de dépenses",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    # Planification
    {
        "document_type": "PLANNING_EXCEL",
        "display_name": "Planning",
        "description": "Planning ou calendrier",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "CALENDRIER_FORMATION",
        "display_name": "Calendrier de formation",
        "description": "Calendrier des formations",
        "allowed_formats": "xlsx,xls,pdf",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "CALENDRIER_CONGES",
        "display_name": "Calendrier des congés",
        "description": "Planning des congés et absences",
        "allowed_formats": "xlsx,xls,csv,pdf",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "CALENDRIER_PROJETS",
        "display_name": "Calendrier des projets",
        "description": "Planning des projets",
        "allowed_formats": "xlsx,xls,pdf",
        "requires_excel": True,
        "requires_validation": False,
        "max_file_size_mb": 100,
    },
    # Divers
    {
        "document_type": "INVENTAIRE_EXCEL",
        "display_name": "Inventaire",
        "description": "Fichier d'inventaire",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "NOMENCLATURE",
        "display_name": "Nomenclature",
        "description": "Fichier de nomenclature",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "REFERENTIELS",
        "display_name": "Référentiels",
        "description": "Fichier de référentiels",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 50,
    },
    {
        "document_type": "IMPORTS_DONNEES",
        "display_name": "Imports de données",
        "description": "Fichier d'import de données",
        "allowed_formats": "xlsx,xls,csv",
        "requires_excel": True,
        "requires_validation": True,
        "max_file_size_mb": 100,
    },
    {
        "document_type": "AUTRE",
        "display_name": "Autre",
        "description": "Autre type de document",
        "allowed_formats": "pdf,docx,doc,xlsx,xls,txt,image,csv",
        "requires_excel": False,
        "requires_validation": False,
        "max_file_size_mb": 50,
    },
]

# Charger les spécifications
created_count = 0
for spec_data in specifications:
    spec, created = DocumentSpecification.objects.get_or_create(
        document_type=spec_data["document_type"], defaults=spec_data
    )
    if created:
        created_count += 1
        print(f"✅ Created: {spec.display_name}")
    else:
        print(f"⏭️  Already exists: {spec.display_name}")

print(f"\n✅ Chargement terminé: {created_count} nouvelles spécifications créées!")
print(f"📊 Total de spécifications: {DocumentSpecification.objects.count()}")
