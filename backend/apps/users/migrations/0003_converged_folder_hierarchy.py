# Migration finale pour enregistrer l'état réel converge de la base de données
# Aucune opération - la structure DB est déjà correcte
# Cette migration enregistre juste l'état cohérent après convergence Branch/Department → Folder

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0002_add_pole_hierarchy'),
        ('routing_rules', '0002_add_pole_routing_path'),
    ]

    operations = [
        # No operations needed - database schema is already correct after convergence
        # The fields branch, department, pole point to Folder model (unified hierarchy)
        # Legacy Branch and Department models have been removed from code and consolidated into Folder
    ]
