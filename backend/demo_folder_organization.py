"""
Script de démonstration du système d'organisation automatique par Année/Mois
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.documents.services import DocumentService
from apps.folders.models import Folder

print("=" * 60)
print("DÉMONSTRATION: Système d'organisation Année/Mois")
print("=" * 60)

# Organiser plusieurs dossiers pour simuler des uploads
print("\n🔄 Création de structures Année/Mois pour les dossiers...")

dossiers_a_organiser = [
    ("Ressources Humaines", "Congés et Absences"),
    ("Ressources Humaines", "Contrats et Feuilles de Paie"),
    ("Finance", "Factures"),
    ("Finance", "Rapports Financiers"),
    ("Informatique", "Tickets Support"),
    ("Ventes", "Contrats Clients"),
]

for parent_name, child_name in dossiers_a_organiser:
    child_folder = Folder.objects.get(name=child_name)
    month_folder = DocumentService.organize_document_folder(child_folder)
    print(f"✅ {parent_name} → {child_name} → 2026 → Janvier")

# Afficher l'arborescence complète
print("\n" + "=" * 60)
print("📁 ARBORESCENCE FINALE:")
print("=" * 60)


def print_tree(folder, prefix="", max_depth=4, current_depth=0):
    """Affiche récursivement la structure des dossiers."""
    if current_depth >= max_depth:
        return

    children = folder.children.all().order_by("name")
    for i, child in enumerate(children):
        is_last = i == len(list(children)) - 1
        current_prefix = "└── " if is_last else "├── "
        print(f"{prefix}{current_prefix}{child.name}")
        next_prefix = prefix + ("    " if is_last else "│   ")
        print_tree(child, next_prefix, max_depth, current_depth + 1)


root_folders = Folder.objects.filter(parent__isnull=True).order_by("name")
for root in root_folders:
    if root.name not in ["IT", "RH", "log"]:  # Ignorer les anciens dossiers
        print(f"\n{root.name}/")
        print_tree(root)

print("\n" + "=" * 60)
print("✅ DÉMONSTRATION COMPLÈTE!")
print("=" * 60)
print("""
Les documents sont maintenant organisés automatiquement comme:
  
  Dossier Principal/
  └── Année (2026)/
      └── Mois (Janvier, Février, etc.)/
          └── Fichier.pdf

Tous les dossiers racine ET les sous-dossiers reçoivent cette structure!
""")
