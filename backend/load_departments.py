#!/usr/bin/env python
"""
Script pour charger les départements initiaux.
Crée automatiquement les dossiers racine correspondants.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import Department


def load_departments():
    """Charge les départements initiaux."""

    departments_data = [
        {
            "name": "Ressources Humaines",
            "code": "RH",
            "description": "Gestion des ressources humaines et du personnel",
        },
        {
            "name": "Finance",
            "code": "FINANCE",
            "description": "Gestion financière et comptabilité",
        },
        {
            "name": "Commercial",
            "code": "COMMERCIAL",
            "description": "Département commercial et ventes",
        },
        {
            "name": "Technique",
            "code": "TECHNIQUE",
            "description": "Département technique et informatique",
        },
        {
            "name": "Logistique",
            "code": "LOGISTIQUE",
            "description": "Gestion logistique et approvisionnements",
        },
        {
            "name": "Direction",
            "code": "DIRECTION",
            "description": "Direction générale",
        },
    ]

    created_count = 0
    skipped_count = 0

    print("\n" + "=" * 60)
    print("CHARGEMENT DES DÉPARTEMENTS")
    print("=" * 60)

    for dept_data in departments_data:
        try:
            dept, created = Department.objects.get_or_create(
                code=dept_data["code"],
                defaults={
                    "name": dept_data["name"],
                    "description": dept_data["description"],
                },
            )

            if created:
                print(f"✓ Créé: {dept.name} ({dept.code})")
                if dept.folder:
                    print(f"  └─ Dossier créé: {dept.folder.name}")
                created_count += 1
            else:
                print(f"- Existant: {dept.name} ({dept.code})")
                if not dept.folder:
                    # Créer le dossier s'il manque
                    from apps.folders.models import Folder

                    folder = Folder.objects.create(
                        name=dept.name,
                        description=f"Dossier racine du département {dept.name}",
                        created_by=None,
                        parent=None,
                        is_active=True,
                    )
                    dept.folder = folder
                    dept.save()
                    print(f"  └─ Dossier créé: {dept.folder.name}")
                skipped_count += 1
        except Exception as e:
            print(f"✗ Erreur lors de la création de {dept_data['code']}: {str(e)}")

    print("\n" + "-" * 60)
    print(f"Résumé: {created_count} créé(s), {skipped_count} existant(s)")
    print("=" * 60 + "\n")


if __name__ == "__main__":
    try:
        load_departments()
    except Exception as e:
        print(f"\n✗ Erreur: {str(e)}", file=sys.stderr)
        sys.exit(1)
