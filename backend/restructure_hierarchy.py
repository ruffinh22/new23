#!/usr/bin/env python
"""
Script de restructuration complète:
- Chaque Folder racine = une Filiale
- Chaque Folder enfant = un Département
- Hiérarchie: Filiale > Département > Sous-dossiers
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import Branch, Department
from apps.folders.models import Folder


def reset_hierarchy():
    """Réinitialise la hiérarchie complète et correctement"""

    print("🔄 RESTRUCTURATION COMPLÈTE DE LA HIÉRARCHIE")
    print("=" * 60)

    # 1️⃣ Nettoyer les références existantes
    print("\n1️⃣ Nettoyage des références...")
    for folder in Folder.objects.all():
        # Vérifier si c'est un dossier orphelin sans marque d'appartenance
        if not folder.branch and not folder.department and folder.parent is None:
            print(f"  🗑️ Suppression du dossier orphelin: {folder.name}")
            folder.delete()

    # 2️⃣ Créer/réorganiser les Filiales au niveau racine
    print("\n2️⃣ Réorganisation des Filiales (racine)...")
    for branch in Branch.objects.all():
        if not branch.folder:
            # Créer un dossier racine pour la filiale
            folder = Folder.objects.create(
                name=branch.name,
                description=f"Filiale {branch.name}",
                parent=None,  # Racine
                is_active=True,
                created_by=None,
            )
            branch.folder = folder
            branch.save()
            print(f"  ✅ {branch.name} (crée au niveau racine)")
        else:
            # Vérifier que le dossier est bien à la racine
            if branch.folder.parent is not None:
                branch.folder.parent = None
                branch.folder.save()
                print(f"  ✅ {branch.name} (replacé au niveau racine)")
            else:
                print(f"  ✓ {branch.name} (déjà à la racine)")

    # 3️⃣ Créer/réorganiser les Départements sous les Filiales
    print("\n3️⃣ Réorganisation des Départements...")
    for dept in Department.objects.all():
        if not dept.folder:
            # Créer un dossier pour le département
            folder = Folder.objects.create(
                name=dept.name,
                description=f"Département {dept.name}",
                parent=dept.branch.folder if dept.branch else None,
                is_active=True,
                created_by=None,
            )
            dept.folder = folder
            dept.save()
            if dept.branch:
                print(f"  ✅ {dept.name} (créé sous {dept.branch.name})")
            else:
                print(f"  ⚠️ {dept.name} (créé - pas de filiale assignée)")
        else:
            # Vérifier que le parent est correct
            expected_parent = dept.branch.folder if dept.branch else None
            if dept.folder.parent != expected_parent:
                dept.folder.parent = expected_parent
                dept.folder.save()
                if dept.branch:
                    print(f"  ✅ {dept.name} (replacé sous {dept.branch.name})")
            else:
                if dept.branch:
                    print(f"  ✓ {dept.name} (déjà sous {dept.branch.name})")

    # 4️⃣ Afficher la structure finale
    print("\n" + "=" * 60)
    print("📊 STRUCTURE FINALE")
    print("=" * 60)

    root_folders = Folder.objects.filter(parent=None)
    for root in root_folders:
        branch = root.branch if hasattr(root, "branch") else None
        print(f"\n📁 {root.name}" + (f" [{root.branch.code}]" if branch else ""))

        # Afficher les sous-dossiers (départements)
        for subfolder in root.children.all():
            dept = subfolder.department if hasattr(subfolder, "department") else None
            print(
                f"   └── {subfolder.name}"
                + (f" [{subfolder.department.code}]" if dept else "")
            )

            # Afficher les sous-sous-dossiers
            for subsubfolder in subfolder.children.all():
                print(f"       └── {subsubfolder.name}")


if __name__ == "__main__":
    try:
        reset_hierarchy()
        print("\n✅ Restructuration terminée avec succès!")
    except Exception as e:
        print(f"\n❌ Erreur: {str(e)}")
        import traceback

        traceback.print_exc()
