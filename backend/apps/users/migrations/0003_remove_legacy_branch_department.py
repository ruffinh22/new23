# Generated migration to mark legacy Branch and Department tables as handled
# These models have been replaced by the unified Folder model
# ✅ CONVERGENCE: Branch (filiale) and Department (service) are now Folder objects

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("users", "0002_add_pole_hierarchy"),
    ]

    operations = [
        # ✅ No operations needed - models already removed from code
        # The migration history records that we've moved past these legacy models
        # Database tables will be handled by subsequent cleanup if needed
    ]
