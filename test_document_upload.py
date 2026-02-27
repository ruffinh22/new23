#!/usr/bin/env python
"""
Script de test pour vérifier le upload de documents dans le bon dossier.
"""

import os
import sys
import django
import requests
from pathlib import Path

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, str(Path(__file__).parent / "backend"))
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import RefreshToken
from apps.documents.models import Document

User = get_user_model()
BASE_URL = "http://localhost:8000"

# ═══════════════════════════════════════════════════════════════════════


def print_section(title):
    """Affiche un titre de section."""
    print(f"\n{'=' * 60}")
    print(f"  {title}")
    print(f"{'=' * 60}")


def get_tokens_for_user(user):
    """Obtient les tokens JWT pour un utilisateur."""
    refresh = RefreshToken.for_user(user)
    return {
        "access": str(refresh.access_token),
        "refresh": str(refresh),
    }


# ═══════════════════════════════════════════════════════════════════════

print_section("1️⃣  VÉRIFICATION DE LA CONFIG UTILISATEUR")

try:
    agent = User.objects.get(matricule="TEST_AGENT")
    print(
        f"✅ Utilisateur trouvé: {agent.matricule} ({agent.first_name} {agent.last_name})"
    )
    print(f"   Rôle: {agent.role}")
    print(
        f"   Pôle: {agent.pole.name if agent.pole else '❌ NON ASSIGNÉ'} (ID: {agent.pole.id if agent.pole else 'N/A'})"
    )
    print(
        f"   Filiale (Branch): {agent.branch.name if agent.branch else '❌ NON ASSIGNÉ'} (ID: {agent.branch.id if agent.branch else 'N/A'})"
    )
    print(
        f"   Service (Department): {agent.department.name if agent.department else 'Optionnel'} (ID: {agent.department.id if agent.department else 'N/A'})"
    )

    if not agent.pole or not agent.branch:
        print("\n⚠️  ERREUR: L'utilisateur n'a pas pole/branch assignés!")
        print("   → Va dans Admin > Users et assigne-lui un Pôle et une Filiale")
        sys.exit(1)

except User.DoesNotExist:
    print("❌ Utilisateur TEST_AGENT non trouvé!")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════

print_section("2️⃣  OBTENTION DES TOKENS VIA L'ENDPOINT D'AUTHENTIFICATION")

# Utiliser l'endpoint réel pour obtenir les tokens avec CustomTokenObtainPairSerializer

auth_response = requests.post(
    f"{BASE_URL}/api/auth/token/",
    json={
        "matricule": "TEST_AGENT",
        "password": "password123",  # Modifier si le mot de passe est différent
    },
)

if auth_response.status_code not in [200, 201]:
    print(f"❌ Erreur authentification: {auth_response.status_code}")
    print(f"   Réponse: {auth_response.json()}")
    sys.exit(1)

tokens = auth_response.json()
print("✅ Tokens obtenu via l'endpoint")
print(f"   Access token: {tokens['access'][:50]}...")

# Decode et vérification

print("✅ JWT décodé - Analyse du payload:")
try:
    # Décoder l'access token (qui devrait contenir les infos)
    import jwt

    access_payload = jwt.decode(tokens["access"], options={"verify_signature": False})

    print(
        f"   - pole_id: {access_payload.get('pole_id')} ✅"
        if access_payload.get("pole_id")
        else "   - pole_id: ❌ MANQUANT"
    )
    print(
        f"   - branch_id: {access_payload.get('branch_id')} ✅"
        if access_payload.get("branch_id")
        else "   - branch_id: ❌ MANQUANT"
    )
    print(f"   - service_id: {access_payload.get('service_id')}")
    print(f"   - role: {access_payload.get('role')}")
    print(f"   - matricule: {access_payload.get('matricule')}")
except Exception as e:
    print(f"⚠️ Impossible de décoder: {e}")

# ═══════════════════════════════════════════════════════════════════════

print_section("3️⃣  CRÉATION D'UN FICHIER DE TEST")

# Créer un fichier PDF > 10 KB
test_file_path = "/tmp/test_document.pdf"
# PDF minimal valide, agrandis avec du contenu
pdf_content = b"""%PDF-1.4
1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj
2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj
3 0 obj<</Type/Page/Parent 2 0 R/Resources<<>>>>endobj
xref
0 4
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
trailer<</Size 4/Root 1 0 R>>
startxref
190
%%EOF""" + (b"\n% Test content line\n" * 500)  # Ajouter du contenu pour dépasser 10 KB

with open(test_file_path, "wb") as f:
    f.write(pdf_content)

print(f"✅ Fichier créé: {test_file_path}")
print(f"   Taille: {len(pdf_content) / 1024:.1f} KB ✅")
print("   Type: PDF (autorisé)")

# ═══════════════════════════════════════════════════════════════════════

print_section("4️⃣  UPLOAD DU DOCUMENT")

client = APIClient()
client.credentials(HTTP_AUTHORIZATION=f"Bearer {tokens['access']}")

with open(test_file_path, "rb") as f:
    response = client.post(
        "/api/documents/",
        {
            "title": "Test Upload Document",
            "file": f,
            "document_type": "FACTURE",
            "description": "Test document for folder routing verification",
            "folder_id": str(agent.branch.id),  # Envoyer le folder_id
            "agent_id": str(agent.id),
        },
        format="multipart",
    )

print(f"Status Code: {response.status_code}")

if response.status_code in [200, 201]:
    print("✅ Upload réussi!")
    doc_data = response.json()
    doc_id = doc_data.get("id")
    print(f"   Document ID: {doc_id}")
    print(f"   Title: {doc_data.get('title')}")
    print(f"   Type: {doc_data.get('document_type')}")
else:
    print(f"❌ Erreur upload: {response.status_code}")
    print(f"   Réponse: {response.json()}")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════

print_section("5️⃣  VÉRIFICATION DU PLACEMENT DU DOCUMENT")

try:
    document = Document.objects.get(id=doc_id)
    print("✅ Document trouvé dans la base de données")
    print(f"   ID: {document.id}")
    print(f"   Title: {document.title}")
    print(f"   Agent: {document.agent.matricule}")
    print(f"   Type: {document.document_type}")
    print(f"   Status: {document.status}")
    print("\n📁 Chemin du dossier:")
    print(
        f"   Dossier assigné: {document.folder.name if document.folder else '❌ PAS DE DOSSIER'}"
    )

    if document.folder:
        folder_path = []
        current = document.folder
        while current:
            folder_path.insert(
                0, f"{current.name} (ID: {current.id}, Type: {current.folder_type})"
            )
            current = current.parent

        for i, path in enumerate(folder_path):
            print(f"   {'→ ' if i > 0 else ''}  {path}")

        # VÉRIFICATION CRITIQUE
        print("\n🔍 VÉRIFICATION CRITIQUE:")

        # Cherche la filiale attendue
        expected_branch = agent.branch
        current = document.folder
        found_branch = False

        while current:
            if current.id == expected_branch.id:
                found_branch = True
                print(
                    f"   ✅ Le document EST dans la bonne filiale: {expected_branch.name}"
                )
                break
            current = current.parent

        if not found_branch:
            print(
                f"   ❌ ERREUR: Le document n'est PAS dans la filiale {expected_branch.name}"
            )
            print(f"      → Document actuellement dans: {document.folder.name}")

        # Vérifie la structure Année/Mois
        parent = document.folder.parent
        if parent and parent.folder_type not in ["filiale", "pole"]:
            print("   ✅ Structure Année/Mois correcte")

    else:
        print("   ❌ ERREUR: Document sans dossier!")

except Document.DoesNotExist:
    print(f"❌ Document ID {doc_id} non trouvé!")
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════

print_section("✅ TEST TERMINÉ")
print(f"Le document '{document.title}' a été créé avec succès.")
print("Vérifiez que le dossier contient le document dans l'admin Django.")
