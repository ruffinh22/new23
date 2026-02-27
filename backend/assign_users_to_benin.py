#!/usr/bin/env python
"""
Script to assign all current users to Bénin branch (ID=1)
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from apps.users.models import User, Branch


def assign_users_to_benin():
    """Assign all users without a branch to Bénin"""
    try:
        # Get Benin branch
        benin_branch = Branch.objects.get(code="BEN")
        print(f"✓ Found Bénin branch: {benin_branch.name} (ID: {benin_branch.id})")

        # Get users without branch
        users_without_branch = User.objects.filter(branch__isnull=True)
        count = users_without_branch.count()

        if count == 0:
            print("✓ All users already have a branch assigned")
            return

        print(f"✓ Found {count} users without branch assignment")

        # Update users
        updated = users_without_branch.update(branch=benin_branch)
        print(f"✓ Successfully assigned {updated} users to Bénin branch")

        # Verify
        all_users = User.objects.all()
        print("\n📊 Final Status:")
        print(f"  Total users: {all_users.count()}")
        print(f"  Users with branch: {all_users.filter(branch__isnull=False).count()}")

        # Show sample
        print("\n📋 Sample users:")
        for user in all_users[:5]:
            branch_name = user.branch.name if user.branch else "None"
            print(f"  - {user.matricule}: {branch_name}")

        print("\n✅ Update completed successfully!")

    except Branch.DoesNotExist:
        print("❌ Error: Bénin branch not found")
    except Exception as e:
        print(f"❌ Error: {str(e)}")


if __name__ == "__main__":
    assign_users_to_benin()
