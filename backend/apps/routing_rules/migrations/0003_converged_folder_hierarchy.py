# Migration finale pour routing_rules après la convergence hiérarchique
# Aucune opération - la structure DB est déjà correcte

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('routing_rules', '0002_add_pole_routing_path'),
        ('users', '0002_add_pole_hierarchy'),
    ]

    operations = [
        # No operations needed - database schema is already correct
        # All references to legacy Branch/Department models have been replaced with Folder
    ]
