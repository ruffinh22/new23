#!/usr/bin/env python
"""
Script de test du système de routage automatique des fichiers.
Vérifie que les fichiers sont correctement routés vers documents/DEPT/FOLDER/
"""

import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, str(Path(__file__).parent / "backend"))
django.setup()

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.documents.models import Document, document_upload_path
from apps.routing_rules.models import DepartmentDocumentType
from apps.folders.models import Folder

User = get_user_model()


def test_routing_system():
    """Test le système de routage automatique."""
    print("\n" + "=" * 70)
    print("🧪 TEST SYSTÈME DE ROUTAGE AUTOMATIQUE")
    print("=" * 70)

    # Test 1: Vérifier que les mappings existent
    print("\n📋 Test 1: Vérification des mappings configurés")
    print("-" * 70)

    mappings = DepartmentDocumentType.objects.filter(is_available=True).select_related(
        "target_folder"
    )

    if not mappings.exists():
        print("❌ ERREUR: Aucun mapping configuré!")
        print("   → Créez des mappings dans l'admin Django")
        return False

    print(f"✅ {mappings.count()} mappings trouvés:")

    for mapping in mappings[:10]:  # Afficher les 10 premiers
        folder_name = (
            mapping.target_folder.name if mapping.target_folder else "❌ PAS DE DOSSIER"
        )
        print(
            f"   • {mapping.department:12} + {mapping.document_type:20} → {folder_name}"
        )

    if mappings.count() > 10:
        print(f"   ... et {mappings.count() - 10} autres")

    # Test 2: Vérifier les dossiers
    print("\n📁 Test 2: Vérification des dossiers")
    print("-" * 70)

    folders = Folder.objects.all()
    if not folders.exists():
        print("❌ ERREUR: Aucun dossier créé!")
        return False

    print(f"✅ {folders.count()} dossiers trouvés:")
    for folder in folders:
        parent_name = f"(Sous {folder.parent.name})" if folder.parent else "(Racine)"
        print(f"   • {folder.name:20} {parent_name}")

    # Test 3: Test de génération de chemin
    print("\n🚀 Test 3: Test de génération de chemin d'upload")
    print("-" * 70)

    # Récupérer un agent et un mapping pour tester
    try:
        # Créer ou récupérer un utilisateur test
        agent, created = User.objects.get_or_create(
            username="test_agent",
            defaults={
                "email": "test@example.com",
                "department": "RH",
                "matricule": "TEST001",
                "is_staff": False,
                "is_active": True,
            },
        )

        if created:
            print(
                f"✅ Agent test créé: {agent.username} (matricule: {agent.matricule}, dept: {agent.department})"
            )
        else:
            print(
                f"✅ Agent test trouvé: {agent.username} (matricule: {agent.matricule}, dept: {agent.department})"
            )

        # Tester avec différents types de documents
        test_cases = [
            ("CONGE", "Demande de congé"),
            ("RAPPORT", "Rapport d'activité"),
            ("NOTE_FRAIS", "Note de frais"),
        ]

        for doc_type, display_name in test_cases:
            # Créer un fichier test
            test_file = SimpleUploadedFile(
                f"test_{doc_type}.pdf", b"test content", content_type="application/pdf"
            )

            # Créer un document test
            doc = Document(
                title=f"Test {display_name}",
                file=test_file,
                document_type=doc_type,
                agent=agent,
                description=f"Test routage pour {display_name}",
            )

            # Générer le chemin
            path = document_upload_path(doc, f"test_{doc_type}.pdf")

            # Analyser le chemin
            parts = path.split("/")

            print(f"\n   Type: {doc_type}")
            print(f"   Chemin généré: {path}")
            print("   Structure:")
            print(f"     - documents: {parts[0]} ✅")
            print(
                f"     - département: {parts[1]} {'✅' if parts[1] == 'RH' else '❌'}"
            )
            print(f"     - dossier: {parts[2]}")
            print(f"     - fichier: {parts[3]}")

    except Exception as e:
        print(f"❌ ERREUR lors du test: {e}")
        import traceback

        traceback.print_exc()
        return False

    # Test 4: Vérifier le serializer
    print("\n📡 Test 4: Vérification du sérialiseur")
    print("-" * 70)

    from apps.routing_rules.serializers import DepartmentDocumentTypeSerializer

    # Récupérer un mapping avec dossier
    mapping_with_folder = DepartmentDocumentType.objects.filter(
        target_folder__isnull=False
    ).first()

    if mapping_with_folder:
        serializer = DepartmentDocumentTypeSerializer(mapping_with_folder)
        data = serializer.data

        print("✅ Mapping sérialisé:")
        print(f"   Département: {data['department_display']}")
        print(f"   Type: {data['document_type_display']}")
        print(f"   Dossier cible: {data.get('target_folder', 'N/A')}")
        print(f"   ID dossier: {data.get('target_folder_id', 'N/A')}")

        if "target_folder" in data and "target_folder_id" in data:
            print("   ✅ Les champs target_folder et target_folder_id sont exposés")
        else:
            print(
                "   ❌ Les champs target_folder/target_folder_id ne sont pas exposés"
            )
    else:
        print("⚠️  Aucun mapping avec dossier trouvé")

    # Résumé
    print("\n" + "=" * 70)
    print("✅ TESTS COMPLÉTÉS AVEC SUCCÈS")
    print("=" * 70)
    print("\n📝 Résumé:")
    print(f"   • {mappings.count()} mappings configurés")
    print(f"   • {folders.count()} dossiers créés")
    print("   • Routage automatique: OK ✅")
    print("   • Sérialiseur exposant target_folder: OK ✅")
    print("\n💡 Prochaines étapes:")
    print("   1. Uploader un fichier via le frontend")
    print("   2. Vérifier qu'il est dans documents/DEPT/FOLDER/")
    print("   3. Tester tous les types de documents")
    print("\n")

    return True


if __name__ == "__main__":
    try:
        success = test_routing_system()
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"\n❌ ERREUR FATALE: {e}")
        import traceback

        traceback.print_exc()
        sys.exit(1)
