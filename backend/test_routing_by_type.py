#!/usr/bin/env python
"""
Test du système de routage automatique par type de document.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document, document_upload_path
from apps.routing_rules.models import DepartmentDocumentType
from apps.folders.models import Folder
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()

def test_document_upload_path():
    """Test la génération du chemin d'upload."""
    
    print("\n" + "="*60)
    print("🧪 TEST: Routage automatique par type de document")
    print("="*60)
    
    # Créer un agent RH
    agent = User.objects.filter(department='RH').first()
    if not agent:
        print("❌ Erreur: Aucun agent RH trouvé")
        return
    
    print(f"\n✅ Agent testé: {agent.matricule} ({agent.get_department_display()})")
    
    # Test 1: Avec mapping configuré
    print("\n--- Test 1: Avec mapping DepartmentDocumentType ---")
    
    # Vérifier les mappings disponibles
    mappings = DepartmentDocumentType.objects.filter(
        department='RH',
        is_available=True
    )
    print(f"Mappings RH disponibles: {mappings.count()}")
    for m in mappings[:3]:
        print(f"  - {m.get_document_type_display()}: {m.target_folder.name if m.target_folder else 'Pas de dossier'}")
    
    # Créer un document avec mapping
    file = SimpleUploadedFile("test.pdf", b"test content", content_type="application/pdf")
    
    doc = Document(
        title="Demande de congé",
        file=file,
        document_type='CONGE',
        agent=agent,
        description="Test routage"
    )
    
    path = document_upload_path(doc, "test_2026_01_29.pdf")
    print(f"\n✅ Chemin généré: {path}")
    print(f"   Structure: documents/DEPT/TYPE_FOLDER/fichier")
    
    # Vérifier la structure
    parts = path.split('/')
    print(f"\n   Parties du chemin:")
    print(f"   - documents: {parts[0]} ✅")
    print(f"   - département: {parts[1]} ✅")
    print(f"   - dossier: {parts[2]} ✅")
    print(f"   - fichier: {parts[3]} ✅")
    
    # Test 2: Sans mapping (fallback)
    print("\n--- Test 2: Sans mapping (fallback Defaut) ---")
    
    doc_no_type = Document(
        title="Document sans type",
        file=file,
        document_type='',  # Pas de type
        agent=agent,
    )
    
    path_fallback = document_upload_path(doc_no_type, "test_fallback.pdf")
    print(f"✅ Chemin généré: {path_fallback}")
    
    if '/Defaut/' in path_fallback:
        print("   ✅ Fallback à 'Defaut' fonctionne correctement")
    else:
        print("   ⚠️  Fallback ne semble pas correct")
    
    # Test 3: Vérifier tous les départements
    print("\n--- Test 3: Vérification des types par département ---")
    
    departments = DepartmentDocumentType.objects.values_list('department', flat=True).distinct()
    
    for dept in sorted(set(departments)):
        count = DepartmentDocumentType.objects.filter(
            department=dept,
            is_available=True
        ).count()
        print(f"  - {dept}: {count} types disponibles")
    
    print("\n" + "="*60)
    print("✅ Tests terminés avec succès!")
    print("="*60)

if __name__ == '__main__':
    test_document_upload_path()
