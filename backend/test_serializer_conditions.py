#!/usr/bin/env python
"""
Quick validation that RoutingRuleSerializer returns conditions.
Run this in the Django shell:
    python manage.py shell < test_serializer_conditions.py
"""

from apps.routing_rules.models import RoutingRule
from apps.routing_rules.serializers import RoutingRuleSerializer

print("\n" + "="*60)
print("ROUTING RULE SERIALIZER TEST")
print("="*60 + "\n")

# Get a rule with conditions
rules = RoutingRule.objects.filter(conditions__isnull=False).first()

if not rules:
    print("❌ No rules with conditions found")
    exit(1)

print(f"Testing rule: {rules.name} (ID: {rules.id})")
print(f"Raw conditions: {rules.conditions}")
print("")

# Serialize it
serializer = RoutingRuleSerializer(rules)
data = serializer.data

print("Serialized data:")
print(f"  Keys: {data.keys()}")
print(f"  'conditions' in data: {'conditions' in data}")

if 'conditions' in data:
    print(f"  Conditions value: {data['conditions']}")
    
    if isinstance(data['conditions'], dict):
        if 'department' in data['conditions']:
            dept = data['conditions']['department']
            print(f"    ✓ Department: {dept.get('value', 'MISSING')}")
        else:
            print(f"    ✗ No 'department' in conditions")
        
        if 'document_type' in data['conditions']:
            dtype = data['conditions']['document_type']
            print(f"    ✓ Document Type: {dtype.get('value', 'MISSING')}")
        else:
            print(f"    ✗ No 'document_type' in conditions")
    else:
        print(f"    ✗ Conditions is not a dict: {type(data['conditions'])}")
else:
    print(f"  ❌ 'conditions' field missing from serialized data!")
    print(f"  Available fields: {list(data.keys())}")

print("\n" + "="*60)
print("If 'conditions' is present and has values, the serializer works correctly.")
print("="*60 + "\n")
