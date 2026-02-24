#!/usr/bin/env python
"""
🎯 Script to create a test user account
Run with: python manage.py shell < create_test_user.py
or: python create_test_user.py
"""

import django
import os

# Configure Django settings
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from apps.users.models import User
from apps.folders.models import Folder

print("\n" + "="*80)
print("👤 CRÉATION D'UN COMPTE UTILISATEUR TEST")
print("="*80 + "\n")

# Get or create a default pole, filiale, service for testing
try:
    pole = Folder.objects.filter(folder_type='pole').first()
    filiale = Folder.objects.filter(folder_type='filiale').first()
    service = Folder.objects.filter(folder_type='service').first()
except Exception as e:
    print(f"⚠️ Erreur lors de la récupération des dossiers: {e}")
    pole = filiale = service = None

# Create test users with different roles
test_users = [
    {
        'matricule': 'TEST_ADMIN',
        'email': 'admin.test@sgdra.com',
        'password': 'Test@12345',
        'first_name': 'Admin',
        'last_name': 'Test',
        'role': 'ADMIN',
        'is_staff': True,
    },
    {
        'matricule': 'TEST_AGENT',
        'email': 'agent.test@sgdra.com',
        'password': 'Test@12345',
        'first_name': 'Agent',
        'last_name': 'Test',
        'role': 'AGENT',
        'pole': pole,
        'branch': filiale,
        'department': service,
    },
    {
        'matricule': 'TEST_MANAGER',
        'email': 'manager.test@sgdra.com',
        'password': 'Test@12345',
        'first_name': 'Manager',
        'last_name': 'Test',
        'role': 'SERVICE_MANAGER',
        'pole': pole,
        'branch': filiale,
        'department': service,
    }
]

for user_data in test_users:
    # Check if user already exists
    matricule = user_data['matricule']
    email = user_data['email']
    
    if User.objects.filter(matricule=matricule).exists():
        print(f"⏭️  {matricule} existe déjà, passage...")
        continue
    
    try:
        # Extract password before creating user
        password = user_data.pop('password')
        
        # Create user
        user = User.objects.create_user(**user_data)
        user.set_password(password)
        user.save()
        
        print(f"✅ {matricule} créé avec succès")
        print(f"   Email: {email}")
        print(f"   Rôle: {user_data['role']}")
        print(f"   Mot de passe: {password}\n")
        
    except Exception as e:
        print(f"❌ Erreur lors de la création de {matricule}: {e}\n")

print("="*80)
print("✅ Création des utilisateurs terminée!\n")
print("📋 UTILISATEURS CRÉÉS:")
print("="*80)
print(f"Admin   : TEST_ADMIN / Test@12345")
print(f"Agent   : TEST_AGENT / Test@12345")
print(f"Manager : TEST_MANAGER / Test@12345")
print("="*80 + "\n")
