# Generated migration - Update notification type choices

from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="notification",
            name="notification_type",
            field=models.CharField(
                choices=[
                    ("DOCUMENT_UPLOADED", "Document uploadé"),
                    ("DOCUMENT_DOWNLOADED", "Document téléchargé"),
                    ("DOCUMENT_APPROVED", "Document approuvé"),
                    ("DOCUMENT_REJECTED", "Document rejeté"),
                    ("VALIDATION", "Document validé"),
                    ("COMMENT", "Nouveau commentaire"),
                    ("ROUTING", "Document routé"),
                    ("SYSTEM", "Notification système"),
                ],
                max_length=20,
            ),
        ),
    ]
