#!/usr/bin/env python
"""
Script pour restructurer les dossiers selon l'hiérarchie multi-tenant:
- Créer des dossiers Filiale à la racine
- À l'intérieur de chaque filiale, créer un dossier "Archive" pour les documents rejetés
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.folders.models import Folder
from apps.users.models import Branch


def create_folder_structure():
    """Crée la structure hiérarchique des dossiers par filiale."""

    print("🔄 Restructuration des dossiers par filiale...\n")

    branches = Branch.objects.all()

    for branch in branches:
        print(f"📁 Création structure pour filiale: {branch.name} ({branch.code})")

        # 1. Créer/récupérer dossier racine pour la filiale
        root_folder, created = Folder.objects.get_or_create(
            name=branch.name,
            parent=None,  # À la racine
            defaults={
                "description": f"Dossier racine de la filiale {branch.name}",
                "is_active": True,
            },
        )

        status = "✅ Créé" if created else "📌 Existant"
        print(f"  {status}: {root_folder.get_full_path()}")

        # 2. Associer le dossier à la branche
        branch.folder = root_folder
        branch.save()
        print("  ✅ Filiale liée au dossier")

        # 3. Créer le dossier "Archive" pour les documents rejetés
        archive_folder, created = Folder.objects.get_or_create(
            name="Archive",
            parent=root_folder,
            defaults={
                "description": f"Dossier d'archivage des documents rejetés de {branch.name}",
                "is_active": True,
            },
        )

        status = "✅ Créé" if created else "📌 Existant"
        print(f"  {status}: {archive_folder.get_full_path()}")

        print()

    print("\n✨ Restructuration complétée!")

    # Afficher la structure
    print("\n📊 Structure finale:")
    root_folders = Folder.objects.filter(parent=None)
    for folder in root_folders:
        print(f"\n{folder.name}/")
        for child in folder.children.all():
            print(f"  └─ {child.name}/")
            for grandchild in child.children.all():
                print(f"      └─ {grandchild.name}/")


if __name__ == "__main__":
    create_folder_structure()
