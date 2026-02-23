#!/usr/bin/env python
"""
Script pour configurer le mapping des types de documents vers les dossiers.
Exemple:
- RH + Congé → dossier "Congés"
- COMMERCIAL + Contrat → dossier "Contrats Clients"
etc.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.routing_rules.models import DepartmentDocumentType
from apps.folders.models import Folder

# Mapping: (département, type_document) → nom_dossier
DOCUMENT_TYPE_MAPPINGS = {
    ('RH', 'CONGE'): 'Congés',
    ('RH', 'ATTESTATION'): 'Attestations',
    ('RH', 'CONTRAT'): 'Contrats et Feuilles de Paie',
    ('RH', 'EVALUATION'): 'Évaluations Annuelles',
    ('FINANCE', 'BUDGET'): 'Budgets',
    ('FINANCE', 'FACTURE'): 'Factures',
    ('FINANCE', 'DEVIS'): 'Devis',
    ('FINANCE', 'DECLARATION'): 'Déclarations Fiscales',
    ('COMMERCIAL', 'CONTRAT'): 'Contrats Clients',
    ('COMMERCIAL', 'DEVIS'): 'Devis',
    ('COMMERCIAL', 'CONGE'): 'Congés',
    ('TECH', 'DOCUMENTATION'): 'Documentation Technique',
    ('IT', 'DOCUMENTATION'): 'Documentation Technique',
}

def setup_mappings():
    """Configure le mapping des types de documents vers les dossiers."""
    
    count = 0
    for (dept, doc_type), folder_name in DOCUMENT_TYPE_MAPPINGS.items():
        try:
            # Récupérer le mapping type_document
            mapping = DepartmentDocumentType.objects.filter(
                department=dept,
                document_type=doc_type
            ).first()
            
            if not mapping:
                print(f"⚠️  {dept}/{doc_type}: Mapping non trouvé, création...")
                mapping = DepartmentDocumentType.objects.create(
                    department=dept,
                    document_type=doc_type,
                    is_available=True,
                    description=f"Type de document {doc_type} pour {dept}"
                )
            
            # Chercher le dossier
            folder = Folder.objects.filter(name__icontains=folder_name).first()
            
            if folder:
                mapping.target_folder = folder
                mapping.save()
                print(f"✅ {dept}/{doc_type} → {folder.name}")
                count += 1
            else:
                print(f"⚠️  {dept}/{doc_type}: Dossier '{folder_name}' non trouvé dans la base")
        
        except Exception as e:
            print(f"❌ Erreur {dept}/{doc_type}: {e}")
    
    print(f"\n✅ {count} mappings configurés avec succès!")

if __name__ == '__main__':
    setup_mappings()
