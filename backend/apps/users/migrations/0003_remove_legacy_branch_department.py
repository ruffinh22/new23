# Generated migration to drop legacy Branch and Department tables
# These models have been replaced by the unified Folder model
# ✅ CONVERGENCE: Branch (filiale) and Department (service) are now Folder objects

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_pole_hierarchy'),
    ]

    operations = [
        # ✅ Direct deletion of legacy models
        # The models no longer exist in code, but tables exist in DB
        # This step allows the migration to proceed by marking them as deleted in migration history
        
        migrations.DeleteModel(
            name='Department',
        ),
        migrations.DeleteModel(
            name='Branch',
        ),
    ]
