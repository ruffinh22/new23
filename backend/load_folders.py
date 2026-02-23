"""
Script pour charger les dossiers de test dans la base de données.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.folders.models import Folder

# Configuration des dossiers
folders_data = [
    # Dossiers Racine
    {'name': 'Ressources Humaines', 'parent': None},
    {'name': 'Finance', 'parent': None},
    {'name': 'Informatique', 'parent': None},
    {'name': 'Ventes', 'parent': None},
    {'name': 'Opérations', 'parent': None},
    {'name': 'Juridique', 'parent': None},
]

# Créer les dossiers racine
print("Création des dossiers racine...")
folders_map = {}
for folder_data in folders_data:
    folder, created = Folder.objects.get_or_create(
        name=folder_data['name'],
        parent=folder_data['parent'],
        defaults={'description': f"Dossier {folder_data['name']}"}
    )
    folders_map[folder_data['name']] = folder
    if created:
        print(f"✅ Créé: {folder.name}")
    else:
        print(f"⏭️  Existe déjà: {folder.name}")

# Dossiers sous-catégories
subcategories = [
    ('Ressources Humaines', [
        'Congés et Absences',
        'Contrats et Feuilles de Paie',
        'Recrutement',
        'Formation et Développement',
        'Évaluations Annuelles',
    ]),
    ('Finance', [
        'Factures',
        'Notes de Frais',
        'Budgets',
        'Rapports Financiers',
        'Déclarations Fiscales',
    ]),
    ('Informatique', [
        'Tickets Support',
        'Documentation Technique',
        'Mises à Jour Système',
        'Projets Informatiques',
    ]),
    ('Ventes', [
        'Contrats Clients',
        'Devis',
        'Propositions',
        'Rapports de Ventes',
        'CRM',
    ]),
    ('Opérations', [
        'Procédures',
        'Checklists',
        'Incidents',
        'Améliorations Continues',
    ]),
    ('Juridique', [
        'Contrats Généraux',
        'Clauses de Confidentialité',
        'Politiques',
        'Litiges',
    ]),
]

print("\nCréation des sous-dossiers...")
for parent_name, subcategories_list in subcategories:
    parent_folder = folders_map[parent_name]
    for subcategory_name in subcategories_list:
        subfolder, created = Folder.objects.get_or_create(
            name=subcategory_name,
            parent=parent_folder,
            defaults={'description': f"Sous-dossier de {parent_name}"}
        )
        if created:
            print(f"✅ Créé: {parent_name} → {subcategory_name}")

print("\n✅ Chargement terminé!")
print(f"📊 Total de dossiers: {Folder.objects.count()}")

# Afficher l'arborescence
print("\n📁 Arborescence des dossiers:")
root_folders = Folder.objects.filter(parent__isnull=True)
for root in root_folders:
    print(f"\n{root.name}/")
    for child in root.children.all():
        print(f"  └── {child.name}")
