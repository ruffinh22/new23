# Generated migration - add pole and routing_path fields

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [
        ("folders", "0001_initial"),
        ("routing_rules", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="routingrule",
            name="pole",
            field=models.ForeignKey(
                blank=True,
                help_text="Pôle concerné par cette règle (null = s'applique à tous les Pôles)",
                limit_choices_to={"folder_type": "pole"},
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name="routing_rules_by_pole",
                to="folders.folder",
            ),
        ),
        migrations.AddField(
            model_name="routingrule",
            name="routing_path",
            field=models.JSONField(
                blank=True,
                default=None,
                help_text='\n        Chemin dynamique de routage. Format:\n        {\n            "include_pole": true/false,\n            "include_filiale": true/false,\n            "include_service": true/false,\n            "include_sub_service": true/false,\n            "include_document_type": true/false,\n            "custom_folders": {"name": "Dossier", ...}\n        }\n        \n        Exemple 1: Pôle > Filiale > Type\n        {"include_pole": false, "include_filiale": true, "include_service": false, "include_document_type": true}\n        \n        Exemple 2: Pôle > Filiale > Service > Type\n        {"include_pole": false, "include_filiale": true, "include_service": true, "include_document_type": true}\n        ',
                null=True,
            ),
        ),
    ]
