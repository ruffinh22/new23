#!/usr/bin/env python
"""
Fix script to ensure ADMIN001 has null department and test the fix.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.users.serializers import UserDetailSerializer

User = get_user_model()

# Check if ADMIN001 exists
try:
    admin_user = User.objects.get(matricule="ADMIN001")
    print(f"✓ Found ADMIN001: {admin_user.first_name} {admin_user.last_name}")
    print(f"  Role: {admin_user.role}")
    print(f"  Department: {admin_user.department}")
    print(
        f"  Department Display: {admin_user.get_department_display() if admin_user.department else 'None'}"
    )

    # Set department to None if not already
    if admin_user.department:
        admin_user.department = None
        admin_user.save()
        print("✓ Set department to NULL for ADMIN001")

    # Test serialization
    serializer = UserDetailSerializer(admin_user)
    data = serializer.data
    print("\n✓ Serialization successful!")
    print(f"  Serialized data keys: {list(data.keys())}")
    print(f"  Department: {data.get('department')}")
    print(f"  Department Display: {data.get('department_display')}")

except User.DoesNotExist:
    print("✗ ADMIN001 not found. Creating...")
    admin_user = User.objects.create_user(
        matricule="ADMIN001",
        email="admin@example.com",
        first_name="Admin",
        last_name="User",
        password="admin123",
        role="ADMIN",
        department=None,  # No department for admin
        is_staff=True,
        is_superuser=True,
    )
    print("✓ Created ADMIN001 with department=None")

print("\n✅ Fix applied successfully!")
