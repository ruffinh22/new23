#!/usr/bin/env python
"""
Script pour nettoyer les dossiers orphelins et en double.
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
sys.path.insert(0, "/home/lidruf/sgdra-project/backend")
django.setup()

from apps.folders.models import Folder


def cleanup_duplicate_folders():
    """Supprime les dossiers en double à la racine qui ne sont associés à aucun département."""

    print("\n" + "=" * 70)
    print("🧹 NETTOYAGE DES DOSSIERS EN DOUBLE")
    print("=" * 70)

    deleted_count = 0

    # CASE SPÉCIFIQUE: FINANCE (ID 122)
    try:
        bad_finance = Folder.objects.get(id=122)  # FINANCE à la racine (parent_id=NULL)
        print("\n🗑️  Suppression du FINANCE orphelin:")
        print(f"   ID: {bad_finance.id}")
        print(f"   Nom: {bad_finance.name}")
        print(
            f"   Parent: {bad_finance.parent.name if bad_finance.parent else 'RACINE (NULL)'}"
        )

        # Vérifier qu'aucun département n'est associé
        from apps.users.models import Department

        depts = Department.objects.filter(folder_id=bad_finance.id)
        if depts.exists():
            print(f"   ⚠️  ERREUR: {depts.count()} département(s) associé(s)!")
            for dept in depts:
                print(f"       - {dept.name}")
        else:
            print("   ✅ Aucun département associé")
            bad_finance.delete()
            print("   ✅ Supprimé avec succès!")
            deleted_count += 1

    except Folder.DoesNotExist:
        print("\nℹ️  Le dossier ID 122 n'existe pas (déjà supprimé)")
    except Exception as e:
        print(f"\n❌ ERREUR lors de la suppression du dossier 122: {str(e)}")

    # Chercher d'autres dossiers orphelins (dossiers à la racine sans documents ni enfants)
    print("\n🔍 Recherche d'autres dossiers orphelins...")
    orphans = Folder.objects.filter(
        parent__isnull=True  # À la racine
    ).exclude(
        id__in=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10]  # Exclure les branches principales
    )

    if orphans.exists():
        print(f"\n⚠️  {orphans.count()} dossier(s) orphelin(s) trouvé(s):")
        for folder in orphans:
            from apps.users.models import Department

            depts = Department.objects.filter(folder_id=folder.id)
            children = folder.children.count()
            documents = folder.documents.count()

            is_orphan = not depts.exists() and children == 0 and documents == 0

            status = (
                "🗑️  PEUT ÊTRE SUPPRIMÉ" if is_orphan else "✅ EN COURS D'UTILISATION"
            )
            print(f"   - {folder.name} (ID: {folder.id}) - {status}")
            if depts.exists():
                print(f"     Département: {depts.first().name}")
    else:
        print("   ✅ Aucun doublon trouvé!")

    # Résumé
    print("\n" + "=" * 70)
    print(f"✅ RÉSUMÉ: {deleted_count} dossier(s) supprimé(s)")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    cleanup_duplicate_folders()
