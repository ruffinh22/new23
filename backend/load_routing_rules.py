#!/usr/bin/env python
"""
🚀 CHARGE DES RÈGLES DE ROUTAGE D'INITIALISATION
=================================================

Crée des règles de routage d'exemple pour la nouvelle hiérarchie (8×7×56).

Utilisation:
    python manage.py shell < load_routing_rules.py

    Ou via management command:
    python manage.py load_routing_rules [--clear] [--examples]
"""

import os
import sys
import django
from colorama import Fore, Style, init

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.routing_rules.models import RoutingRule
from apps.folders.models import Folder
from apps.users.models import User
import logging

init(autoreset=True)
logger = logging.getLogger(__name__)

print("\n" + Fore.CYAN + "=" * 80)
print("🚀 INITIALISATION DES RÈGLES DE ROUTAGE")
print("=" * 80 + Style.RESET_ALL + "\n")

# ============================================================================
# 1. VÉRIFIER LA HIÉRARCHIE
# ============================================================================
print(Fore.BLUE + "📁 Vérification de la hiérarchie..." + Style.RESET_ALL)

poles = list(
    Folder.objects.filter(parent__isnull=True, folder_type="pole").order_by("name")
)
print(f"   ✅ Trouvé {len(poles)} Pôles\n")

if len(poles) != 8:
    print(Fore.RED + f"   ❌ ERREUR: Attendu 8 Pôles, trouvé {len(poles)}")
    print("   Exécutez d'abord: python manage.py load_poles" + Style.RESET_ALL)
    sys.exit(1)

# Afficher les Pôles
for pole in poles:
    print(f"   • {pole.name} (ID: {pole.id})")

# ============================================================================
# 2. CRÉER DES RÈGLES D'EXEMPLE
# ============================================================================
print(f"\n{Fore.BLUE}📋 Création des règles d'initialisation...{Style.RESET_ALL}\n")

example_rules = [
    {
        "name": "Congés → HR",
        "description": "Routage automatique des demandes de congé vers le département RH",
        "conditions": {"document_type": {"value": "CONGE", "operator": "equals"}},
        "priority": 100,
        "destination_type": "service",  # On cherche le Service "RH" de la Filiale
        "destination_pattern": "RH",  # Pattern pour trouver le dossier
    },
    {
        "name": "Notes de frais → Finance",
        "description": "Routage automatique des notes de frais vers Finance",
        "conditions": {"document_type": {"value": "NOTE_FRAIS", "operator": "equals"}},
        "priority": 100,
        "destination_type": "service",
        "destination_pattern": "Finance",
    },
    {
        "name": "Budgets → Finance",
        "description": "Routage des budgets vers Finance",
        "conditions": {"document_type": {"value": "BUDGET", "operator": "equals"}},
        "priority": 100,
        "destination_type": "service",
        "destination_pattern": "Finance",
    },
    {
        "name": "Contrats → Juridique",
        "description": "Routage des contrats vers le département Juridique",
        "conditions": {"document_type": {"value": "CONTRAT", "operator": "equals"}},
        "priority": 100,
        "destination_type": "service",
        "destination_pattern": "Juridique",
    },
    {
        "name": "Rapports → Direction",
        "description": "Routage des rapports vers la Direction",
        "conditions": {"document_type": {"value": "RAPPORT", "operator": "equals"}},
        "priority": 90,
        "destination_type": "service",
        "destination_pattern": "Direction",
    },
]

# Trouver admin user
try:
    admin_user = User.objects.filter(is_superuser=True).first()
    if not admin_user:
        print(
            Fore.YELLOW
            + "⚠️  Aucun superuser trouvé, les règles seront sans créateur"
            + Style.RESET_ALL
        )
        admin_user = None
except Exception as e:
    print(
        Fore.YELLOW
        + f"⚠️  Erreur lors de la recherche du superuser: {e}"
        + Style.RESET_ALL
    )
    admin_user = None

# Créer les règles globales (une par Pôle), avec destination dans le Pôle RH pour simplicité
print(Fore.GREEN + "✅ Création des règles globales:" + Style.RESET_ALL)

created_count = 0
skipped_count = 0

for idx, rule_template in enumerate(example_rules, 1):
    name = rule_template["name"]
    conditions = rule_template["conditions"]
    priority = rule_template["priority"]
    destination_pattern = rule_template["destination_pattern"]

    # Vérifier si la règle existe déjà
    if RoutingRule.objects.filter(name=name).exists():
        print(f"   ⏭️  {idx}. {name} (DÉJÀ EXISTANTE - SKIPPED)")
        skipped_count += 1
        continue

    try:
        # Chercher un dossier destination approprié
        # Pour les règles globales, on prend le premier Service qui match du Pôle RH
        rh_pole = Folder.objects.filter(
            parent__isnull=True, name__icontains="RH"
        ).first()

        if not rh_pole:
            # Fallback: prendre n'importe quel Service
            destination = Folder.objects.filter(folder_type="service").first()
        else:
            # Chercher Service sous une Filiale du Pôle RH
            rh_filiale = rh_pole.children.first()
            if rh_filiale:
                destination = rh_filiale.children.first()  # Le Service
            else:
                destination = Folder.objects.filter(folder_type="service").first()

        if not destination:
            print(f"   ❌ {idx}. {name} - Pas de destination valide trouvée")
            continue

        # Créer la règle
        rule = RoutingRule.objects.create(
            name=name,
            description=rule_template["description"],
            conditions=conditions,
            priority=priority,
            branch=None,  # Globale
            destination_folder=destination,
            is_active=True,
            created_by=admin_user,
        )

        print(f"   ✅ {idx}. {name}")
        print(f"      • Destination: {destination.get_full_path()}")
        print(f"      • Priorité: {priority}")
        print(f"      • Conditions: {conditions}")

        created_count += 1

    except Exception as e:
        print(f"   ❌ {idx}. {name} - ERREUR: {str(e)}")

# ============================================================================
# 3. AFFICHER LE SUMMARY
# ============================================================================
print(f"\n{Fore.CYAN}📊 SUMMARY{Style.RESET_ALL}")
print(f"   • Créées: {Fore.GREEN}{created_count}{Style.RESET_ALL}")
print(f"   • Skippées: {Fore.YELLOW}{skipped_count}{Style.RESET_ALL}")
print(f"   • Total en base: {Fore.CYAN}{RoutingRule.objects.count()}{Style.RESET_ALL}")

# ============================================================================
# 4. LISTER LES RÈGLES EXISTANTES
# ============================================================================
all_rules = RoutingRule.objects.all().order_by("-priority", "-created_at")

if all_rules.exists():
    print(f"\n{Fore.BLUE}📋 Règles Actuelles:{Style.RESET_ALL}\n")

    for idx, rule in enumerate(all_rules, 1):
        branch_info = f"Filiale: {rule.branch.name}" if rule.branch else "Globale ✨"
        status_icon = "✅" if rule.is_active else "❌"

        print(f"{idx}. {status_icon} {rule.name}")
        print(f"   • ID: {rule.id}")
        print(f"   • {branch_info}")
        print(f"   • Destination: {rule.destination_folder.get_full_path()}")
        print(f"   • Priorité: {rule.priority}")
        print(f"   • Utilisée: {rule.times_applied} fois")
        print()
else:
    print(f"\n{Fore.YELLOW}⚠️  Aucune règle n'existe actuellement{Style.RESET_ALL}\n")

print(Fore.CYAN + "=" * 80)
print("✅ INITIALISATION DES RÈGLES TERMINÉE")
print("=" * 80 + Style.RESET_ALL + "\n")

# ============================================================================
# 5. PROCHAINES ÉTAPES
# ============================================================================
print(Fore.BLUE + "💡 Prochaines étapes:" + Style.RESET_ALL)
print("""
1. Tester le routage automatique:
   python manage.py shell << EOF
   from apps.documents.models import Document
   # Uploader un document de test
   EOF

2. Vérifier les stats de routage:
   python manage.py shell << EOF
   from apps.routing_rules.models import RoutingRule
   for rule in RoutingRule.objects.all():
       print(f"{rule.name}: {rule.times_applied} utilisations")
   EOF

3. Créer des règles supplémentaires via admin:
   http://localhost:8003/admin/routing_rules/routingrule/

4. Auditer les règles:
   python manage.py shell < audit_routing_rules.py
""")
