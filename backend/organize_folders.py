#!/usr/bin/env python
"""
Script pour organiser les départements DANS les filiales
Structure: Filiale > Département
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import Branch, Department
from apps.folders.models import Folder


def organize_departments():
    """Organise les départements sous chaque filiale"""

    # Récupérer toutes les branches
    branches = Branch.objects.all()
    departments = Department.objects.all()

    print("🏗️ Réorganisation de la hiérarchie des dossiers...")
    print(f"   Filiales: {branches.count()}")
    print(f"   Départements: {departments.count()}\n")

    for branch in branches:
        print(f"📂 {branch.name} ({branch.code})")

        # Récupérer le dossier racine de la filiale
        branch_folder = branch.folder
        if not branch_folder:
            print(f"   ⚠️  Pas de dossier racine pour {branch.name}")
            continue

        # Créer un dossier pour chaque département SOUS la filiale
        for dept in departments:
            dept_folder_name = f"{dept.name}"

            # Vérifier si le dossier existe déjà sous cette filiale
            existing = Folder.objects.filter(
                name=dept_folder_name, parent=branch_folder
            ).first()

            if existing:
                print(f"   ✓ {dept.name} (existe déjà)")
            else:
                # Créer le dossier sous la filiale
                dept_folder = Folder.objects.create(
                    name=dept_folder_name,
                    description=f"Département {dept.name} - {branch.name}",
                    created_by=None,
                    parent=branch_folder,  # Parent = dossier racine de la filiale
                    is_active=True,
                )
                print(f"   ✅ {dept.name} (créé sous {branch.name})")

    print("\n✅ Réorganisation terminée!")
    print("\nStructure finale:")
    for branch in branches:
        print(f"\n📁 {branch.name}")
        if branch.folder:
            subfolders = Folder.objects.filter(parent=branch.folder)
            for subfolder in subfolders:
                print(f"   └── {subfolder.name}")


if __name__ == "__main__":
    organize_departments()
