#!/usr/bin/env python
"""
Script pour créer les 7 filiales (pays) et réorganiser la structure des dossiers.
Structure attendue:
  Filiale (Bénin, Congo, etc.)
  ├── Département (RH, IT, etc.)
  │    └── Types de documents
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.users.models import Branch, Department
from apps.folders.models import Folder

# Définir les 7 filiales
BRANCHES_DATA = [
    {"name": "Bénin", "code": "BEN", "country_code": "BJ", "description": "Filiale du Bénin"},
    {"name": "Congo", "code": "CON", "country_code": "CG", "description": "Filiale du Congo"},
    {"name": "Côte d'Ivoire", "code": "CIV", "country_code": "CI", "description": "Filiale de Côte d'Ivoire"},
    {"name": "Cameroun", "code": "CAM", "country_code": "CM", "description": "Filiale du Cameroun"},
    {"name": "Guinée Équatoriale", "code": "GEQ", "country_code": "GQ", "description": "Filiale de Guinée Équatoriale"},
    {"name": "Guinée", "code": "GUI", "country_code": "GN", "description": "Filiale de Guinée (Conakry)"},
    {"name": "Guinée-Bissau", "code": "GBS", "country_code": "GW", "description": "Filiale de Guinée-Bissau"},
]

print("🌍 Création des 7 filiales...\n")

branches_created = 0
branches_by_id = {}

for branch_data in BRANCHES_DATA:
    existing = Branch.objects.filter(code=branch_data['code']).first()
    
    if existing:
        print(f"⏭️  {branch_data['name']} ({branch_data['code']}) - déjà existe")
        branches_by_id[branch_data['name']] = existing
    else:
        # Créer la branche sans dossier pour le moment
        branch = Branch.objects.create(
            name=branch_data['name'],
            code=branch_data['code'],
            country_code=branch_data['country_code'],
            description=branch_data['description'],
            is_active=True
        )
        print(f"✅ {branch.name} ({branch.code}) - créée (ID: {branch.id})")
        branches_by_id[branch.name] = branch
        branches_created += 1

print(f"\n✅ Filiales créées: {branches_created}")
print(f"📝 Total de filiales: {Branch.objects.count()}")

# Maintenant, associer les départements existants à une branche par défaut
print(f"\n🏢 Association des départements à la première filiale (Bénin)...")

default_branch = Branch.objects.filter(code='BEN').first()
if not default_branch:
    print("❌ Erreur: Branche 'Bénin' introuvable!")
    sys.exit(1)

departments_updated = 0
departments = Department.objects.filter(branch__isnull=True)
for dept in departments:
    dept.branch = default_branch
    dept.save()
    print(f"  ✅ {dept.name} → {default_branch.name}")
    departments_updated += 1

print(f"\n📊 Résumé final:")
print(f"  ✅ Filiales créées: {branches_created}")
print(f"  ✅ Départements associés à {default_branch.name}: {departments_updated}")
print(f"  📝 Total de branches en base: {Branch.objects.count()}")
print(f"  📝 Total de départements: {Department.objects.count()}")

print(f"\n✨ Structure hiérarchique créée:")
for branch in Branch.objects.all().prefetch_related('departments'):
    print(f"  🗂️  {branch.name} ({branch.code})")
    for dept in branch.departments.all():
        print(f"      └── {dept.name} ({dept.code})")
