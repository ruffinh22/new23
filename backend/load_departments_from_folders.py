#!/usr/bin/env python
"""
Script pour créer les départements à partir des dossiers racines existants.
Les dossiers sans parent sont considérés comme des racines = départements.
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.users.models import Department
from apps.folders.models import Folder

# Récupérer les dossiers racines (parent_id IS NULL)
root_folders = Folder.objects.filter(parent__isnull=True).order_by("name")

print(f"🔍 Trouvé {root_folders.count()} dossiers racines:\n")

departments_created = 0
departments_skipped = 0

for folder in root_folders:
    # Vérifier si le département existe déjà
    existing = Department.objects.filter(name=folder.name).first()

    if existing:
        print(f"⏭️  {folder.name} (code: {existing.code}) - déjà existe")
        departments_skipped += 1
    else:
        # Créer le département
        code = folder.name[:6].upper().replace(" ", "_")[:20]
        dept = Department.objects.create(
            name=folder.name,
            code=code,
            description=folder.description or f"Dossier {folder.name}",
            folder=folder,
            is_active=True,
        )
        print(f"✅ {dept.name} (code: {dept.code}) - créé avec le dossier #{folder.id}")
        departments_created += 1

print("\n📊 Résumé:")
print(f"  ✅ Créés: {departments_created}")
print(f"  ⏭️  Existants: {departments_skipped}")
print(f"  📝 Total: {departments_created + departments_skipped}")

# Vérifier le résultat final
final_count = Department.objects.count()
print(f"\n🎯 Total de départements en base de données: {final_count}")
