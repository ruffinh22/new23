#!/usr/bin/env python
"""
Test complet des endpoints API pour la nouvelle hiérarchie
"""
import os
import django
import json
import requests
from requests.auth import HTTPBasicAuth

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.folders.models import Folder

# Configuration
BASE_URL = 'http://localhost:8003'
HEADERS = {'Accept': 'application/json'}

print("\n🌐 TEST API: ENDPOINTS POUR NOUVELLE HIÉRARCHIE")
print("=" * 80)

# Test 1: GET /api/folders/
print("\n✅ Test 1: GET /api/folders/")
try:
    response = requests.get(f'{BASE_URL}/api/folders/', headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        print(f"  Status: {response.status_code}")
        print(f"  Count: {len(data) if isinstance(data, list) else data.get('count', 'N/A')}")
        if isinstance(data, list) and len(data) > 0:
            first = data[0]
            print(f"  First object: {first.get('name')} ({first.get('folder_type')})")
    else:
        print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 2: GET /api/folders/?folder_type=pole
print("\n✅ Test 2: GET /api/folders/?folder_type=pole")
try:
    response = requests.get(f'{BASE_URL}/api/folders/?folder_type=pole', headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        pole_count = len(data) if isinstance(data, list) else data.get('count', 0)
        print(f"  Status: {response.status_code}")
        print(f"  Pôles found: {pole_count}")
        if isinstance(data, list) and len(data) > 0:
            print(f"  First: {data[0].get('name')}")
    else:
        print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 3: GET /api/folders/?folder_type=filiale
print("\n✅ Test 3: GET /api/folders/?folder_type=filiale")
try:
    response = requests.get(f'{BASE_URL}/api/folders/?folder_type=filiale', headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        filiale_count = len(data) if isinstance(data, list) else data.get('count', 0)
        print(f"  Status: {response.status_code}")
        print(f"  Filiales found: {filiale_count}")
        if isinstance(data, list) and len(data) > 0:
            for filiale in data[:3]:
                print(f"    - {filiale.get('name')}")
    else:
        print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 4: GET /api/folders/?folder_type=service
print("\n✅ Test 4: GET /api/folders/?folder_type=service")
try:
    response = requests.get(f'{BASE_URL}/api/folders/?folder_type=service', headers=HEADERS)
    if response.status_code == 200:
        data = response.json()
        service_count = len(data) if isinstance(data, list) else data.get('count', 0)
        print(f"  Status: {response.status_code}")
        print(f"  Services found: {service_count}")
        if isinstance(data, list) and len(data) > 0:
            for service in data[:3]:
                print(f"    - {service.get('name')}")
    else:
        print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 5: GET specific folder by ID
print("\n✅ Test 5: GET /api/folders/{id}/ for specific folder")
try:
    pole = Folder.objects.filter(folder_type='pole').first()
    if pole:
        response = requests.get(f'{BASE_URL}/api/folders/{pole.id}/', headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            print(f"  Status: {response.status_code}")
            print(f"  Folder: {data.get('name')} ({data.get('folder_type')})")
            print(f"  Level: {pole.get_level()}")
        else:
            print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 6: GET children
print("\n✅ Test 6: GET /api/folders/{id}/children/ - enfants d'une Filiale")
try:
    filiale = Folder.objects.filter(folder_type='filiale').first()
    if filiale:
        response = requests.get(f'{BASE_URL}/api/folders/{filiale.id}/children/', headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            children_count = len(data) if isinstance(data, list) else data.get('count', 0)
            print(f"  Status: {response.status_code}")
            print(f"  Filiale: {filiale.name}")
            print(f"  Children (services): {children_count}")
            if isinstance(data, list) and len(data) > 0:
                for child in data[:3]:
                    print(f"    - {child.get('name')} ({child.get('folder_type')})")
        else:
            print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

# Test 7: GET ancestors
print("\n✅ Test 7: GET /api/folders/{id}/ancestors/ - ancêtres d'un Service")
try:
    service = Folder.objects.filter(folder_type='service').first()
    if service:
        response = requests.get(f'{BASE_URL}/api/folders/{service.id}/ancestors/', headers=HEADERS)
        if response.status_code == 200:
            data = response.json()
            ancestors_count = len(data) if isinstance(data, list) else data.get('count', 0)
            print(f"  Status: {response.status_code}")
            print(f"  Service: {service.name}")
            print(f"  Ancestors: {ancestors_count}")
            if isinstance(data, list):
                for ancestor in data:
                    print(f"    - {ancestor.get('name')} ({ancestor.get('folder_type')})")
        else:
            print(f"  Status: {response.status_code} ❌")
except Exception as e:
    print(f"  Error: {e} ❌")

print("\n" + "=" * 80)
print("✅ TESTS API COMPLÉTÉS")
print("=" * 80)
