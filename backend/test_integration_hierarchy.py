#!/usr/bin/env python
"""
Test d'intégration complet de la nouvelle structure hiérarchique
Vérifie la structure des données directement en base de données
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.folders.models import Folder
from apps.users.models import User
from apps.documents.models import DocumentTemplate
from apps.routing_rules.models import RoutingRule

print("\n" + "=" * 80)
print("🎯 TEST D'INTÉGRATION: NOUVELLE HIÉRARCHIE PÔLE > FILIALE > SERVICE")
print("=" * 80)

# ==== SECTION 1: STRUCTURE HIÉRARCHIQUE ====
print("\n📊 SECTION 1: VÉRIFIER LA STRUCTURE HIÉRARCHIQUE")
print("-" * 80)

poles = Folder.objects.filter(folder_type="pole")
filiales = Folder.objects.filter(folder_type="filiale")
services = Folder.objects.filter(folder_type="service")
sous_services = Folder.objects.filter(folder_type="sub_service")

print(f"✅ Pôles: {poles.count()} (attendu: 1)")
assert poles.count() == 1, "Devrait avoir 1 pôle"

print(f"✅ Filiales: {filiales.count()} (attendu: 7)")
assert filiales.count() == 7, "Devrait avoir 7 filiales"

print(f"✅ Services: {services.count()} (attendu: 56)")
assert services.count() == 56, "Devrait avoir 56 services"

print(f"✅ Sous-services: {sous_services.count()} (attendu: 0)")

total = poles.count() + filiales.count() + services.count() + sous_services.count()
print(f"✅ Total: {total} (attendu: 64)")
assert total == 64, f"Total incorrect: {total}"

# ==== SECTION 2: HIÉRARCHIE PARENT-ENFANT ====
print("\n🏗️  SECTION 2: VÉRIFIER LES RELATIONS PARENT-ENFANT")
print("-" * 80)

pole = poles.first()
print(f"✅ Pôle racine: {pole.name}")
assert pole.parent is None, "Le pôle ne doit pas avoir de parent"

filiales_under_pole = pole.children.all()
print(f"✅ Filiales enfants du pôle: {filiales_under_pole.count()}")
assert filiales_under_pole.count() == 7, (
    f"Doit avoir 7 filiales, a {filiales_under_pole.count()}"
)

for filiale in filiales_under_pole:
    assert filiale.parent == pole, (
        f"Filiale {filiale.name} doit avoir le pôle comme parent"
    )
    services_count = filiale.children.count()
    print(f"  ├── {filiale.name}: {services_count} services")
    assert services_count == 8, (
        f"{filiale.name} doit avoir 8 services, a {services_count}"
    )

# ==== SECTION 3: PROPRIÉTÉ auto_type ====
print("\n🔄 SECTION 3: VÉRIFIER LA PROPRIÉTÉ auto_type")
print("-" * 80)

test_folders = (
    [(pole, "pole")]
    + [(f, "filiale") for f in filiales_under_pole[:2]]
    + [(s, "service") for s in services[:2]]
)

for folder, expected_type in test_folders:
    auto_type = folder.auto_type
    level = folder.get_level()
    print(
        f"✅ {folder.name:20} - Level: {level}, auto_type: {auto_type} (attendu: {expected_type})"
    )
    assert auto_type == expected_type, f"auto_type incorrect pour {folder.name}"

# ==== SECTION 4: CHEMINS COMPLETS ====
print("\n📍 SECTION 4: VÉRIFIER LES CHEMINS COMPLETS (get_full_path)")
print("-" * 80)

service = services.first()
full_path = service.get_full_path()
print(f"✅ Service complet: {full_path}")
assert "Pôle Central" in full_path, "Doit contenir le pôle"

# ==== SECTION 5: ANCESTORS ====
print("\n👨‍👩‍👧‍👦 SECTION 5: VÉRIFIER LES ANCÊTRES")
print("-" * 80)

ancestors = service.get_ancestors()
print(f"✅ Ancêtres du service '{service.name}': {[a.name for a in ancestors]}")
assert len(ancestors) >= 2, "Doit avoir au moins 2 ancêtres"

# ==== SECTION 6: DESCENDANTS ====
print("\n👶 SECTION 6: VÉRIFIER LES DESCENDANTS")
print("-" * 80)

pole_descendants = pole.get_descendants()
print(f"✅ Descendants du pôle: {len(pole_descendants)} (attendu: 63)")
assert len(pole_descendants) == 63, (
    f"Doit avoir 63 descendants, a {len(pole_descendants)}"
)

# ==== SECTION 7: LIMITE DE CHOIX DES FK ====
print("\n🔐 SECTION 7: VÉRIFIER LES CONTRAINTES limit_choices_to")
print("-" * 80)

# Vérifier le User model
user_fields = User._meta.get_fields()
branch_field = next((f for f in user_fields if f.name == "branch"), None)
dept_field = next((f for f in user_fields if f.name == "department"), None)

if branch_field:
    print(
        f"✅ User.branch limit_choices_to: {branch_field.remote_field.limit_choices_to}"
    )
    assert branch_field.remote_field.limit_choices_to == {"folder_type": "filiale"}

if dept_field:
    print(
        f"✅ User.department limit_choices_to: {dept_field.remote_field.limit_choices_to}"
    )
    assert dept_field.remote_field.limit_choices_to == {"folder_type": "service"}

# Vérifier RoutingRule model
routing_fields = RoutingRule._meta.get_fields()
rule_branch_field = next((f for f in routing_fields if f.name == "branch"), None)

if rule_branch_field:
    print(
        f"✅ RoutingRule.branch limit_choices_to: {rule_branch_field.remote_field.limit_choices_to}"
    )
    assert rule_branch_field.remote_field.limit_choices_to == {"folder_type": "filiale"}

# Vérifier DocumentTemplate model
doc_fields = DocumentTemplate._meta.get_fields()
doc_dept_field = next((f for f in doc_fields if f.name == "departments"), None)

if doc_dept_field:
    print(
        f"✅ DocumentTemplate.departments limit_choices_to: {doc_dept_field.remote_field.limit_choices_to}"
    )
    assert doc_dept_field.remote_field.limit_choices_to == {"folder_type": "service"}

# ==== SECTION 8: DONNÉES HISTORIQUES ====
print("\n📜 SECTION 8: VÉRIFIER L'ABSENCE DE TYPES HÉRITÉS")
print("-" * 80)

legacy_branches = Folder.objects.filter(folder_type="branch")
legacy_departments = Folder.objects.filter(folder_type="department")
legacy_sections = Folder.objects.filter(folder_type="section")

print(f"✅ Folders type='branch': {legacy_branches.count()} (attendu: 0)")
print(f"✅ Folders type='department': {legacy_departments.count()} (attendu: 0)")
print(f"✅ Folders type='section': {legacy_sections.count()} (attendu: 0)")

assert legacy_branches.count() == 0
assert legacy_departments.count() == 0
assert legacy_sections.count() == 0

# ==== RÉSUMÉ FINAL ====
print("\n" + "=" * 80)
print("🎉 TOUS LES TESTS D'INTÉGRATION RÉUSSIS!")
print("=" * 80)

summary = """
📊 RÉSUMÉ DE LA STRUCTURE FINALE:

🏢 Architecture:
   ├── 1 Pôle (racine)
   ├── 7 Filiales (ex-branches)
   ├── 56 Services (ex-departments, 8 par filiale)
   └── 0 Sous-services (disponible pour nesting futur)

✅ État:
   ✓ Hiérarchie parfaitement imbriquée
   ✓ Propriété auto_type fonctionnelle
   ✓ Chemins complets (get_full_path) opérationnels
   ✓ Ancestres/descendants correctement liés
   ✓ Contraintes limit_choices_to mises à jour
   ✓ Aucun type hérité ('branch', 'department', 'section') restant
   ✓ Migration complète et réussie

🔄 Types utilisés:
   • 'pole' pour le niveau racine (1 objet)
   • 'filiale' pour les branches (7 objets)
   • 'service' pour les départements (56 objets)
   • 'sub_service' disponible pour nesting supplémentaire

📌 Prochaines étapes:
   1. Mise à jour des ViewSets pour exposer la nouvelle structure
   2. Mise à jour des scripts de chargement (load_branches.py, etc.)
   3. Tests API end-to-end
   4. Mise à jour frontend si nécessaire
"""

print(summary)
