#!/usr/bin/env python
"""
Test script to verify routing rules creation and conditions storage.
Run this in the Django shell:
    python manage.py shell < test_routing_rules_db.py
"""

from apps.routing_rules.models import RoutingRule
from apps.folders.models import Folder
from django.contrib.auth import get_user_model

User = get_user_model()

print("\n" + "=" * 60)
print("ROUTING RULES DATABASE TEST")
print("=" * 60 + "\n")

# Get admin user
try:
    admin = User.objects.get(matricule="ADMIN001")
    print(f"✓ Found admin user: {admin.matricule}")
except User.DoesNotExist:
    print("✗ Admin user not found")
    exit(1)

# Get first folder
try:
    folder = Folder.objects.first()
    print(f"✓ Found folder: {folder.name} (ID: {folder.id})")
except:
    print("✗ No folders found")
    exit(1)

# Create a test rule
print("\n1. Creating test rule...")
test_conditions = {
    "department": {"value": "RH", "operator": "equals"},
    "document_type": {"value": "CONGE", "operator": "equals"},
}

try:
    rule = RoutingRule.objects.create(
        name="Test Direct Creation",
        description="Test from shell",
        conditions=test_conditions,
        destination_folder=folder,
        priority=50,
        created_by=admin,
    )
    print(f"✓ Rule created with ID: {rule.id}")
except Exception as e:
    print(f"✗ Error creating rule: {e}")
    exit(1)

# Verify what's in the database
print("\n2. Verifying conditions in database...")
fresh_rule = RoutingRule.objects.get(id=rule.id)
print(f"   Rule name: {fresh_rule.name}")
print(f"   Conditions (raw): {fresh_rule.conditions}")
print(f"   Conditions (type): {type(fresh_rule.conditions)}")

if fresh_rule.conditions:
    print("   ✓ Conditions are present")
    if "department" in fresh_rule.conditions:
        dept = fresh_rule.conditions["department"]
        print(f"     - Department value: {dept.get('value', 'MISSING')}")
    else:
        print("     ✗ 'department' key missing from conditions")

    if "document_type" in fresh_rule.conditions:
        dtype = fresh_rule.conditions["document_type"]
        print(f"     - Document type value: {dtype.get('value', 'MISSING')}")
    else:
        print("     ✗ 'document_type' key missing from conditions")
else:
    print("   ✗ Conditions are empty or None!")

# Check all rules
print("\n3. Checking all rules in database...")
all_rules = RoutingRule.objects.all()
print(f"   Total rules: {len(all_rules)}")

for i, r in enumerate(all_rules[:5], 1):
    print(f"\n   Rule {i}: {r.name}")
    print(f"     - ID: {r.id}")
    print(f"     - Conditions: {r.conditions}")
    if r.conditions:
        if isinstance(r.conditions, dict):
            for key, val in r.conditions.items():
                if isinstance(val, dict):
                    print(f"       {key}: {val.get('value', 'N/A')}")

print("\n" + "=" * 60)
print("TEST COMPLETE")
print("=" * 60 + "\n")
