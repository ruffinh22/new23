#!/usr/bin/env python
"""
Script pour configurer automatiquement les mappings des types de documents.
Mappe les dossiers existants aux types de documents.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.routing_rules.models import DepartmentDocumentType
from apps.folders.models import Folder

# Mapping intelligent: cherche les dossiers par nom
SMART_MAPPING = {
    'CONGE': ['Congés', 'Congés et Absences', 'Congé'],
    'ATTESTATION': ['Attestations', 'Attestation'],
    'CONTRAT': ['Contrats', 'Contrats Clients', 'Contrats et Feuilles de Paie', 'Contrats Généraux'],
    'NOTE_FRAIS': ['Notes de Frais', 'Notes', 'Frais'],
    'RAPPORT': ['Rapports', 'Rapports Financiers', 'Rapports de Ventes'],
    'BUDGET': ['Budgets', 'Budget'],
    'FACTURE': ['Factures', 'Facture'],
    'DEVIS': ['Devis'],
    'DECLARATION': ['Déclarations', 'Déclarations Fiscales'],
    'DOCUMENTATION': ['Documentation Technique', 'Documentation'],
    'EVALUATION': ['Évaluations', 'Évaluations Annuelles'],
    'FORMATION': ['Formation', 'Formation et Développement'],
    'DEMANDE': ['Demandes'],
}

def find_folder_for_type(doc_type):
    """Cherche un dossier correspondant au type de document."""
    folder_names = SMART_MAPPING.get(doc_type, [])
    
    for name in folder_names:
        folder = Folder.objects.filter(name__iexact=name).first()
        if folder:
            return folder
    
    return None

def setup_smart_mappings():
    """Configure les mappings de manière intelligente."""
    
    print("\n" + "="*70)
    print("🔧 Configuration des mappings types → dossiers")
    print("="*70)
    
    count = 0
    skipped = 0
    
    # Pour chaque mapping disponible
    all_mappings = DepartmentDocumentType.objects.filter(is_available=True).order_by('department')
    
    for mapping in all_mappings:
        # Si déjà configuré, skip
        if mapping.target_folder:
            skipped += 1
            continue
        
        # Chercher un dossier
        folder = find_folder_for_type(mapping.document_type)
        
        if folder:
            mapping.target_folder = folder
            mapping.save()
            print(f"✅ {mapping.department:12} + {mapping.get_document_type_display():15} → {folder.name}")
            count += 1
        else:
            print(f"⚠️  {mapping.department:12} + {mapping.get_document_type_display():15} → [Aucun dossier trouvé]")
    
    print("\n" + "="*70)
    print(f"📊 Résultats:")
    print(f"   ✅ {count} mappings configurés")
    print(f"   ⏭️  {skipped} mappings déjà configurés")
    print(f"   ⚠️  Total: {all_mappings.count()} mappings")
    print("="*70 + "\n")

if __name__ == '__main__':
    setup_smart_mappings()
