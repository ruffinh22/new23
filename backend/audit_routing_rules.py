#!/usr/bin/env python
"""
🔍 AUDIT DES RÈGLES DE ROUTAGE EXISTANTES
=========================================
Vérifie la compatibilité des RoutingRules avec la nouvelle hiérarchie (8×7×56)

Exécution: python manage.py shell < audit_routing_rules.py
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.routing_rules.models import RoutingRule
from apps.folders.models import Folder
from django.db.models import Count
import json

print("\n" + "=" * 80)
print("🔍 AUDIT DES RÈGLES DE ROUTAGE EXISTANTES")
print("=" * 80 + "\n")

# ============================================================================
# 1. STATS GÉNÉRALES
# ============================================================================
print("📊 STATISTIQUES GÉNÉRALES")
print("-" * 80)

routing_rules = RoutingRule.objects.all()
total_rules = routing_rules.count()
active_rules = routing_rules.filter(is_active=True).count()
inactive_rules = routing_rules.filter(is_active=False).count()

print(f"✅ Total de règles: {total_rules}")
print(f"   ├─ Actives: {active_rules}")
print(f"   └─ Inactives: {inactive_rules}")

if total_rules == 0:
    print("\n⚠️  ATTENTION: AUCUNE RÈGLE DE ROUTAGE EXISTANTE!")
    print("   Les documents seront routés vers les dossiers par type uniquement.\n")
    sys.exit(0)

# ============================================================================
# 2. INVENTAIRE DÉTAILLÉ DES RÈGLES
# ============================================================================
print("\n\n📋 INVENTAIRE DÉTAILLÉ DES RÈGLES")
print("-" * 80)

for idx, rule in enumerate(routing_rules, 1):
    print(f"\n{idx}. {rule.name}")
    print(f"   ID: {rule.id}")
    print(f"   Status: {'✅ Actif' if rule.is_active else '❌ Inactif'}")
    print(f"   Priorité: {rule.priority}")
    print(f"   Description: {rule.description}")
    print(f"   Utilisations: {rule.times_applied} (dernière: {rule.last_applied})")

    # Branche
    if rule.branch:
        branch_info = f"Filiale '{rule.branch.name}'"
        # Vérifier le type de dossier
        if rule.branch.folder_type != "filiale":
            branch_info += f" ⚠️ [TYPE: {rule.branch.folder_type}]"
        print(f"   Branche: {branch_info}")
    else:
        print("   Branche: ✅ GLOBALE (toutes les filiales)")

    # Dossier destination
    dest = rule.destination_folder
    dest_type = f"[{dest.folder_type}]" if dest.folder_type else "[type_inconnu]"
    dest_path = dest.get_full_path() if hasattr(dest, "get_full_path") else dest.name
    print(f"   Destination: {dest_path} {dest_type}")

    # Conditions
    print(f"   Conditions ({len(rule.conditions)} critères):")
    for field, condition in rule.conditions.items():
        op = condition.get("operator", "?")
        val = condition.get("value", "?")
        print(f"      • {field} [{op}] = {val}")

# ============================================================================
# 3. ANALYSE DE COMPATIBILITÉ
# ============================================================================
print("\n\n🔧 ANALYSE DE COMPATIBILITÉ AVEC NOUVELLE HIÉRARCHIE (8×7×56)")
print("-" * 80)

compatibility_issues = []
warnings = []

for rule in routing_rules:
    rule_issues = []

    # Vérifier la branche
    if rule.branch:
        if rule.branch.folder_type != "filiale":
            rule_issues.append(
                f"❌ Branche '{rule.branch.name}' a type={rule.branch.folder_type} (attendu: filiale)"
            )

        # Vérifier si filiale existe en base
        if rule.branch.parent is None or rule.branch.parent.folder_type != "pole":
            rule_issues.append(f"⚠️ Branche '{rule.branch.name}' n'a pas de Pôle parent")

    # Vérifier destination
    dest = rule.destination_folder
    if dest.folder_type not in ["service", "sub_service", "filiale", None]:
        warnings.append(
            f"⚠️ [{rule.name}] Destination '{dest.name}' a type inhabituellement: {dest.folder_type}"
        )

    # Vérifier conditions
    for field, condition in rule.conditions.items():
        if field not in ["branch", "department", "document_type", "matricule_prefix"]:
            warnings.append(f"⚠️ [{rule.name}] Condition inconnue: {field}")

    if rule_issues:
        compatibility_issues.append(
            {"rule_id": rule.id, "rule_name": rule.name, "issues": rule_issues}
        )

if compatibility_issues:
    print(f"\n❌ {len(compatibility_issues)} RÈGLES AVEC PROBLÈMES:")
    for issue_group in compatibility_issues:
        print(f"\n   [{issue_group['rule_id']}] {issue_group['rule_name']}")
        for issue in issue_group["issues"]:
            print(f"      {issue}")
else:
    print("\n✅ AUCUN PROBLÈME MAJEUR DÉTECTÉ")

if warnings:
    print(f"\n⚠️ {len(warnings)} AVERTISSEMENTS:")
    for warning in warnings:
        print(f"   {warning}")

# ============================================================================
# 4. STATISTIQUES DE HIÉRARCHIE
# ============================================================================
print("\n\n📁 STATISTIQUES DE HIÉRARCHIE")
print("-" * 80)

poles = Folder.objects.filter(parent__isnull=True, folder_type="pole").count()
filiales = Folder.objects.filter(folder_type="filiale").count()
services = Folder.objects.filter(folder_type="service").count()
sub_services = Folder.objects.filter(folder_type="sub_service").count()

print("\nNouvelle Hiérarchie (8×7×56):")
print(f"   ├─ Pôles (root): {poles}/8 {'✅' if poles == 8 else '❌'}")
print(f"   ├─ Filiales (level 1): {filiales}/56 {'✅' if filiales == 56 else '❌'}")
print(f"   ├─ Services (level 2): {services}/56 {'✅' if services == 56 else '❌'}")
print(f"   └─ Sub-services (level 3+): {sub_services}")

# Vérifier les destinations des règles
print("\nDestinations des Règles:")
dest_types = {}
for rule in routing_rules:
    dtype = rule.destination_folder.folder_type
    if dtype not in dest_types:
        dest_types[dtype] = []
    dest_types[dtype].append(rule.name)

for dtype, names in sorted(dest_types.items()):
    print(f"   • Type '{dtype}': {len(names)} règles")
    for name in names[:3]:  # Montrer max 3
        print(f"      - {name}")
    if len(names) > 3:
        print(f"      ... et {len(names) - 3} autres")

# ============================================================================
# 5. ANALYSE DES BRANCHES UTILISÉES
# ============================================================================
print("\n\n🏢 BRANCHES UTILISÉES DANS LES RÈGLES")
print("-" * 80)

branch_usage = (
    RoutingRule.objects.values("branch__name", "branch__id", "branch__folder_type")
    .annotate(count=Count("id"))
    .order_by("-count")
)

print("\nRègles par Branche:")
if not list(branch_usage):
    print("   ✅ Toutes les règles sont GLOBALES (s'appliquent à toutes branches)")
else:
    for usage in branch_usage:
        branch_name = usage["branch__name"] or "GLOBALE"
        branch_id = usage["branch__id"] or "---"
        branch_type = usage["branch__folder_type"] or "---"
        count = usage["count"]
        print(
            f"   • {branch_name} (ID:{branch_id}, type:{branch_type}): {count} règles"
        )

# ============================================================================
# 6. RECOMMANDATIONS
# ============================================================================
print("\n\n💡 RECOMMANDATIONS")
print("-" * 80)

recommendations = []

if total_rules == 0:
    recommendations.append(
        "➕ Créer des règles de routage pour automatiser le flux de documents"
    )
elif compatibility_issues:
    recommendations.append(
        "🔧 Corriger les règles avec problèmes de compatibilité identifiés ci-dessus"
    )
    recommendations.append(
        "   Utiliser: python manage.py update_routing_rules_for_hierarchy"
    )

# Vérifier hiérarchie
if poles != 8 or filiales != 56 or services != 56:
    recommendations.append(
        "🔄 Recréer la hiérarchie (les nombres ne correspondent pas)"
    )
    recommendations.append(
        "   Utiliser: python manage.py load_poles && load_filiales && load_services"
    )
else:
    recommendations.append("✅ Hiérarchie complète détectée (8×7×56 = 120 dossiers)")

# Vérifier si des règles utilisent Pôles au lieu de Filiales
pole_assignments = RoutingRule.objects.filter(branch__folder_type="pole").count()
if pole_assignments > 0:
    recommendations.append(
        f"⚠️ {pole_assignments} règles pointent vers des Pôles (niveau 0) au lieu de Filiales"
    )
    recommendations.append(
        "   Corriger: Les règles doivent pointer vers Filiales (folder_type='filiale')"
    )

for i, rec in enumerate(recommendations, 1):
    print(f"\n{i}. {rec}")

# ============================================================================
# 7. EXPORT SUMMARY
# ============================================================================
print("\n\n📤 SUMMARY EXPORT")
print("-" * 80)

summary = {
    "timestamp": str(django.utils.timezone.now()),
    "total_rules": total_rules,
    "active_rules": active_rules,
    "inactive_rules": inactive_rules,
    "compatibility_issues_count": len(compatibility_issues),
    "warnings_count": len(warnings),
    "hierarchy": {
        "poles": poles,
        "filiales": filiales,
        "services": services,
        "sub_services": sub_services,
    },
    "destination_types": dest_types,
}

print(json.dumps(summary, indent=2, ensure_ascii=False))

print("\n" + "=" * 80)
print("✅ AUDIT TERMINÉ")
print("=" * 80 + "\n")
