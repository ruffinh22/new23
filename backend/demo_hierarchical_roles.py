#!/usr/bin/env python
"""
🎯 DÉMO: Système de Rôles Hiérarchiques avec Re-routing de Documents
========================================================================

Démontre le nouveau système avec 6 rôles:
1. ADMIN - Accès complet
2. POLE_MANAGER - Gère un Pôle entier
3. FILIALE_MANAGER - Gère une Filiale spécifique
4. SERVICE_MANAGER - Gère un Service spécifique
5. DOCUMENT_MANAGER - Re-route les documents globalement
6. AGENT - Crée des documents dans son Service

Exécution: python manage.py shell < demo_hierarchical_roles.py
"""

import django

django.setup()

from apps.folders.models import Folder
from apps.users.models import User

print("\n" + "=" * 100)
print("🎯 DÉMO: SYSTÈME DE RÔLES HIÉRARCHIQUES AVEC RE-ROUTING")
print("=" * 100 + "\n")

# Récupérer les pôles
poles = Folder.objects.filter(folder_type="pole")
print(f"📊 Récupération des {poles.count()} Pôles:\n")
for pole in poles:
    print(f"  ✓ {pole.name}")

print("\n" + "-" * 100)
print("📋 CRÉATION DES UTILISATEURS TEST")
print("-" * 100 + "\n")

# Pôle Commercial
pole_com = Folder.objects.get(name="Pôle Commercial", folder_type="pole")
filiale_benin = Folder.objects.get(name="Bénin", folder_type="filiale", parent=pole_com)
filiale_cameroun = Folder.objects.get(
    name="Cameroun", folder_type="filiale", parent=pole_com
)
service_benin = filiale_benin.children.filter(folder_type="service").first()
service_cameroun = filiale_cameroun.children.filter(folder_type="service").first()

# Pôle Finance
pole_fin = Folder.objects.get(name="Pôle Finance", folder_type="pole")
filiale_congo = Folder.objects.get(name="Congo", folder_type="filiale", parent=pole_fin)
service_congo = filiale_congo.children.filter(folder_type="service").first()

# 1. ADMIN
admin_user = User.objects.filter(role="ADMIN").first()
if admin_user:
    print(f"✓ ADMIN existe: {admin_user.matricule}")
else:
    admin_user = User.objects.create_user(
        matricule="ADM001",
        email="admin@company.com",
        password="admin123",
        first_name="Admin",
        last_name="System",
        role="ADMIN",
        is_staff=True,
    )
    print(f"✓ ADMIN créé: {admin_user.matricule}")

# 2. POLE_MANAGER (Pôle Commercial)
pole_manager = User.objects.filter(role="POLE_MANAGER", pole=pole_com).first()
if not pole_manager:
    pole_manager = User.objects.create_user(
        matricule="POL001",
        email="pole.commercial@company.com",
        password="pole123",
        first_name="Pierre",
        last_name="Pôle",
        role="POLE_MANAGER",
        pole=pole_com,
        branch=filiale_benin,
        department=service_benin,
    )
    print(f"✓ POLE_MANAGER créé: {pole_manager.matricule} → {pole_com.name}")
else:
    print(f"✓ POLE_MANAGER existe: {pole_manager.matricule}")

# 3. FILIALE_MANAGER (Bénin du Pôle Commercial)
filiale_manager = User.objects.filter(
    role="FILIALE_MANAGER", branch=filiale_benin
).first()
if not filiale_manager:
    filiale_manager = User.objects.create_user(
        matricule="FIL001",
        email="filiale.benin@company.com",
        password="fil123",
        first_name="Fabrice",
        last_name="Filiale",
        role="FILIALE_MANAGER",
        branch=filiale_benin,
        department=service_benin,
    )
    print(f"✓ FILIALE_MANAGER créé: {filiale_manager.matricule} → {filiale_benin.name}")
else:
    print(f"✓ FILIALE_MANAGER existe: {filiale_manager.matricule}")

# 4. SERVICE_MANAGER (Service Commercial Bénin)
service_manager = User.objects.filter(
    role="SERVICE_MANAGER", department=service_benin
).first()
if not service_manager:
    service_manager = User.objects.create_user(
        matricule="SER001",
        email="service.benin@company.com",
        password="ser123",
        first_name="Serge",
        last_name="Service",
        role="SERVICE_MANAGER",
        branch=filiale_benin,
        department=service_benin,
    )
    print(f"✓ SERVICE_MANAGER créé: {service_manager.matricule} → {service_benin.name}")
else:
    print(f"✓ SERVICE_MANAGER existe: {service_manager.matricule}")

# 5. DOCUMENT_MANAGER (Re-routing global)
doc_manager = User.objects.filter(role="DOCUMENT_MANAGER").first()
if not doc_manager:
    doc_manager = User.objects.create_user(
        matricule="DOC001",
        email="doc.manager@company.com",
        password="doc123",
        first_name="Dominique",
        last_name="Document",
        role="DOCUMENT_MANAGER",
        pole=pole_com,
        branch=filiale_benin,
        department=service_benin,
    )
    print(f"✓ DOCUMENT_MANAGER créé: {doc_manager.matricule} (re-routing global)")
else:
    print(f"✓ DOCUMENT_MANAGER existe: {doc_manager.matricule}")

# 6. AGENT (Crée des documents)
agent = User.objects.filter(role="AGENT").first()
if not agent:
    agent = User.objects.create_user(
        matricule="AGT001",
        email="agent@company.com",
        password="agent123",
        first_name="Alice",
        last_name="Agent",
        role="AGENT",
        branch=filiale_benin,
        department=service_benin,
    )
    print(f"✓ AGENT créé: {agent.matricule} → {service_benin.name}")
else:
    print(f"✓ AGENT existe: {agent.matricule}")

print("\n" + "-" * 100)
print("🔐 TABLEAU D'ACCÈS HIÉRARCHIQUE")
print("-" * 100 + "\n")

users = [admin_user, pole_manager, filiale_manager, service_manager, doc_manager, agent]
access_table = []

for user in users:
    print(f"\n👤 {user.matricule:10} ({user.get_role_display():25})")
    print(f"   - Pôle:     {user.pole.name if user.pole else 'Aucun':30}")
    print(f"   - Filiale:  {user.branch.name if user.branch else 'Aucun':30}")
    print(f"   - Service:  {user.department.name if user.department else 'Aucun':30}")

    # Tester l'accès
    has_access_pole_com_all = user.has_access_to_folder(pole_com)
    has_access_fil_benin = user.has_access_to_folder(filiale_benin)
    has_access_fil_cameroun = user.has_access_to_folder(filiale_cameroun)
    has_access_ser_benin = user.has_access_to_folder(service_benin)

    print("\n   🔑 Accès:")
    print(
        f"      - Pôle Commercial:            {'✓' if has_access_pole_com_all else '✗'}"
    )
    print(f"      - Filiale Bénin:              {'✓' if has_access_fil_benin else '✗'}")
    print(
        f"      - Filiale Cameroun:           {'✓' if has_access_fil_cameroun else '✗'}"
    )
    print(f"      - Service Commercial Bénin:   {'✓' if has_access_ser_benin else '✗'}")

print("\n\n" + "-" * 100)
print("📊 RÉSUMÉ DU SYSTÈME")
print("-" * 100 + "\n")

summary = """
✅ RÔLES HIÉRARCHIQUES IMPLÉMENTÉS:

1️⃣  ADMIN (Accès complet à tout)
    - Peut voir/modifier TOUS les documents
    - Peut re-router partout

2️⃣  POLE_MANAGER (Gère un Pôle)
    - Accès: Pôle + toutes ses Filiales + tous leurs Services
    - Peut re-router dans le Pôle
    
3️⃣  FILIALE_MANAGER (Gère une Filiale)
    - Accès: Filiale spécifique + tous ses Services
    - Peut re-router dans la Filiale

4️⃣  SERVICE_MANAGER (Gère un Service)
    - Accès: Service spécifique seulement
    - Peut re-router dans le Service

5️⃣  DOCUMENT_MANAGER (Re-routing global)
    - Peut re-router un document n'importe où
    - Pas limité à un pôle/filiale/service

6️⃣  AGENT (Crée/gère des documents)
    - Accès: Service d'affectation seulement
    - Peut créer des documents

✅ FONCTIONNALITÉS DE RE-ROUTING:

📄 API Endpoint: POST /api/documents/{id}/reroute/
   Payload:
   {
     "to_folder_id": 123,
     "transfer_type": "CROSS_FILIALE",
     "reason": "Raison du transfert"
   }

📊 Types de Transfer:
   - AUTO_ROUTING: Routage automatique
   - MANUAL_TRANSFER: Transfer manuel
   - CROSS_POLE: Transfer entre Pôles
   - CROSS_FILIALE: Transfer entre Filiales
   - CROSS_SERVICE: Transfer entre Services
   - COMPLIANCE_MOVE: Mouvement pour conformité
   - OTHER: Autre raison

📝 Audit:
   - Chaque transfer est enregistré dans DocumentTransfer
   - Trace complète: qui, vers où, quand, pourquoi
   - AuditLog enregistre tous les mouvements

✅ PERMISSIONS:
   - CanRerouteDocument: Vérifie le droit de re-router
   - HasFolderAccess: Vérifie l'accès au dossier
   - has_access_to_folder(): Méthode de vérification
"""

print(summary)

print("\n" + "=" * 100)
print("✅ DÉMO TERMINÉE")
print("=" * 100 + "\n")
