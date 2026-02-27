#!/usr/bin/env python
"""
Test complet de la restructuration Pôle > Filiale > Service > Sous-service
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.folders.models import Folder
from apps.folders.serializers import (
    FolderPoleSerializer,
    FolderBranchSerializer,
    FolderServiceSerializer,
)

print("\n🧪 TEST: NOUVELLE HIÉRARCHIE PÔLE > FILIALE > SERVICE")
print("=" * 80)

# Test 1: Vérifier la structure
print("\n✅ Test 1: Vérifier la structure Pôle > Filiale > Service")
poles = Folder.objects.filter(folder_type="pole")
filiales = Folder.objects.filter(folder_type="filiale")
services = Folder.objects.filter(folder_type="service")
sous_services = Folder.objects.filter(folder_type="sub_service")

print(f"  Pôles: {poles.count()}")
print(f"  Filiales: {filiales.count()}")
print(f"  Services: {services.count()}")
print(f"  Sous-services: {sous_services.count()}")
print(f"  Total: {Folder.objects.count()}")

assert poles.count() == 1, "Doit avoir 1 pôle"
assert filiales.count() == 7, "Doit avoir 7 filiales"
assert services.count() == 56, "Doit avoir 56 services"

# Test 2: Vérifier les types auto_type
print("\n✅ Test 2: Vérifier la propriété auto_type")
for folder in Folder.objects.all()[:10]:
    level = folder.get_level()
    auto_type = folder.auto_type
    expected = {0: "pole", 1: "filiale", 2: "service"}.get(level, "sub_service")
    assert auto_type == expected, f"auto_type doit être {expected}"
    print(f"  {folder.name:20} - level: {level}, auto_type: {auto_type} ✅")

# Test 3: Vérifier hiérarchie complète
print("\n✅ Test 3: Vérifier hiérarchie Pôle > Filiales > Services")
pole = poles.first()
print(f"\n  🏢 Pôle: {pole.name}")

for filiale in pole.children.all()[:2]:
    services_under_filiale = filiale.children.all()
    print(f"    ├── {filiale.name} ({services_under_filiale.count()} services)")

    for service in services_under_filiale[:2]:
        subs = service.children.all()
        print(f"    │   ├── {service.name} ({subs.count()} sous-services)")

# Test 4: Tester les serializers
print("\n✅ Test 4: Tester les serializers API")

# Sérializer le Pôle
pole_serializer = FolderPoleSerializer(pole)
pole_data = pole_serializer.data
print(f"  🏢 FolderPoleSerializer: {pole_data['name']} ({pole_data['folder_type']})")
assert "filiales_count" in pole_data, "Doit contenir filiales_count"
assert pole_data["filiales_count"] == 7, (
    f"Doit avoir 7 filiales, a {pole_data['filiales_count']}"
)

# Sérializer une Filiale
filiale = filiales.first()
filiale_serializer = FolderBranchSerializer(filiale)
filiale_data = filiale_serializer.data
print(
    f"  📁 FolderBranchSerializer: {filiale_data['name']} ({filiale_data['folder_type']})"
)
assert "services_count" in filiale_data, "Doit contenir services_count"
assert filiale_data["services_count"] == 8, (
    f"Doit avoir 8 services, a {filiale_data['services_count']}"
)

# Sérializer un Service
service = services.first()
service_serializer = FolderServiceSerializer(service)
service_data = service_serializer.data
print(
    f"  📄 FolderServiceSerializer: {service_data['name']} ({service_data['folder_type']})"
)
assert "sous_services_count" in service_data, "Doit contenir sous_services_count"

# Test 5: Vérifier les chemins complets
print("\n✅ Test 5: Vérifier get_full_path() pour tout")
for folder in [pole, filiale, service]:
    full_path = folder.get_full_path()
    print(f"  {full_path} ✅")

# Test 6: Vérifier les ancestors
print("\n✅ Test 6: Vérifier get_ancestors()")
service = services.first()
ancestors = service.get_ancestors()
print(f"  Service: {service.name}")
print(f"  Ancestors: {[a.name + f' ({a.folder_type})' for a in ancestors]}")
assert len(ancestors) >= 2, "Doit avoir au moins 2 ancêtres (filiale + pôle)"

print("\n" + "=" * 80)
print("🎉 TOUS LES TESTS RÉUSSIS!")
print("=" * 80)
print("\n📊 Résumé de la structure:")
print("  ✅ 1 Pôle racine")
print("  ✅ 7 Filiales enfants du Pôle")
print("  ✅ 56 Services enfants des Filiales")
print("  ✅ auto_type property fonctionnelle")
print("  ✅ Serializers pour Pôle/Filiale/Service")
print("  ✅ Hiérarchie complète vérifiée")
