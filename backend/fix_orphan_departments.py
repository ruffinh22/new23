#!/usr/bin/env python
"""
Script pour assigner des dossiers aux départements orphelins.
Certains départements créés avant le fix n'avaient pas de dossier associé.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, "/home/lidruf/sgdra-project/backend")
django.setup()

from apps.users.models import Department
from apps.folders.models import Folder


def fix_orphan_departments():
    """Assigne des dossiers à tous les départements orphelins."""

    # Trouver les départements sans dossier
    orphan_depts = Department.objects.filter(folder__isnull=True)

    if not orphan_depts.exists():
        print("✅ Aucun département orphelin trouvé!")
        return

    print(f"\n🔍 Trouvé {orphan_depts.count()} département(s) orphelin(s):")
    print("-" * 70)

    created_count = 0
    failed_departments = []

    for dept in orphan_depts:
        print(f"\n📋 Département: {dept.name} (code: {dept.code})")
        print(f"   Filiale: {dept.branch.name if dept.branch else 'N/A'}")

        if not dept.branch:
            print("   ❌ ERREUR: Pas de filiale associée!")
            failed_departments.append(dept)
            continue

        if not dept.branch.folder:
            print("   ❌ ERREUR: La filiale n'a pas de dossier!")
            failed_departments.append(dept)
            continue

        try:
            # Créer le dossier pour ce département
            folder, was_created = Folder.objects.get_or_create(
                name=dept.name,
                parent=dept.branch.folder,
                defaults={"description": f"Dossier pour le département {dept.name}"},
            )

            if was_created:
                print(f"   ✅ Nouveau dossier créé (ID: {folder.id})")
            else:
                print(f"   ℹ️  Dossier existant trouvé (ID: {folder.id})")

            # Associer le dossier au département
            dept.folder = folder
            dept.save()
            print("   ✅ Département associé au dossier")
            created_count += 1

        except Exception as e:
            print(f"   ❌ ERREUR: {str(e)}")
            failed_departments.append(dept)

    # Résumé
    print("\n" + "=" * 70)
    print(f"✅ RÉSUMÉ: {created_count} département(s) traité(s) avec succès")
    if failed_departments:
        print(f"❌ {len(failed_departments)} département(s) avec erreur(s)")
        for dept in failed_departments:
            print(f"   - {dept.name}")
    else:
        print("✅ Tous les départements ont été traités!")
    print("=" * 70)


if __name__ == "__main__":
    fix_orphan_departments()
