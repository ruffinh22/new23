#!/usr/bin/env python
"""
Vérifier et corriger les utilisateurs test ADMIN
"""

import django
import os

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User

print("\n" + "=" * 80)
print("🔍 VÉRIFICATION DES UTILISATEURS ADMIN")
print("=" * 80 + "\n")

# Récupérer TEST_ADMIN
try:
    admin_user = User.objects.get(matricule="TEST_ADMIN")
    print(f"✅ Utilisateur found: {admin_user.matricule}")
    print(f"   - Email: {admin_user.email}")
    print(f"   - Role: {admin_user.role}")
    print(f"   - is_staff: {admin_user.is_staff}")
    print(f"   - is_superuser: {admin_user.is_superuser}")
except User.DoesNotExist:
    print("❌ TEST_ADMIN not found")

# Récupérer TESTADMIN
try:
    admin_user = User.objects.get(matricule="TESTADMIN")
    print(f"\n✅ Utilisateur found: {admin_user.matricule}")
    print(f"   - Email: {admin_user.email}")
    print(f"   - Role: {admin_user.role}")
    print(f"   - is_staff: {admin_user.is_staff}")
    print(f"   - is_superuser: {admin_user.is_superuser}")
except User.DoesNotExist:
    print("\n❌ TESTADMIN not found")

# Corriger TEST_ADMIN si nécessaire
try:
    admin_user = User.objects.get(matricule="TEST_ADMIN")
    if admin_user.role != "ADMIN":
        print(f"\n🔧 Correction: Changement du rôle de {admin_user.role} → ADMIN")
        admin_user.role = "ADMIN"
        admin_user.save()

    if not admin_user.is_staff:
        print("🔧 Correction: Activation de is_staff")
        admin_user.is_staff = True
        admin_user.save()

    print(f"\n✅ {admin_user.matricule} corrigé et prêt à l'emploi\n")
except Exception as e:
    print(f"❌ Erreur: {e}\n")

print("=" * 80 + "\n")
