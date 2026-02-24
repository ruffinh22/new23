# Generated migration for adding folder sharing support to DocumentShare

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('folders', '0007_alter_folder_folder_type'),
        ('documents', '0005_refactor_models_realtime'),
    ]

    operations = [
        # Add share_type field
        migrations.AddField(
            model_name='documentshare',
            name='share_type',
            field=models.CharField(
                choices=[('USER', 'Utilisateur'), ('FOLDER', 'Dossier (Pôle/Filiale/Service)')],
                default='USER',
                help_text='Partage avec un utilisateur ou un dossier',
                max_length=20,
            ),
        ),
        
        # Make shared_with optional
        migrations.AlterField(
            model_name='documentshare',
            name='shared_with',
            field=models.ForeignKey(
                blank=True,
                help_text='Utilisateur qui reçoit le document',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='documents_shared_with_me',
                to=settings.AUTH_USER_MODEL,
            ),
        ),
        
        # Add shared_with_folder field
        migrations.AddField(
            model_name='documentshare',
            name='shared_with_folder',
            field=models.ForeignKey(
                blank=True,
                help_text='Pôle, Filiale ou Service avec qui partager le document',
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='documents_shared_with_folder',
                to='folders.folder',
            ),
        ),
        
        # Remove unique_together constraint
        migrations.AlterUniqueTogether(
            name='documentshare',
            unique_together=set(),
        ),
        
        # Update indexes
        migrations.AddIndex(
            model_name='documentshare',
            index=models.Index(fields=['shared_with_folder', '-shared_at'], name='documents_d_shared_idx'),
        ),
        migrations.AddIndex(
            model_name='documentshare',
            index=models.Index(fields=['share_type'], name='documents_d_type_idx'),
        ),
    ]
