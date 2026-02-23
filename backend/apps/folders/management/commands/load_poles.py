"""
Management command to load Pôles into the database.

Create or update the 8 Pôles (department types):
1. Administration
2. Commercial
3. Direction
4. Finance
5. Informatique
6. Logistique
7. Qualité
8. RH

Usage:
    python manage.py load_poles
    python manage.py load_poles --clear  # Delete and recreate
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.folders.models import Folder


class Command(BaseCommand):
    help = 'Load 8 Pôles (department types) into the database'
    
    # ANSI color codes for terminal output
    colors = {
        'success': '\033[92m',    # Green
        'warning': '\033[93m',    # Yellow
        'error': '\033[91m',      # Red
        'info': '\033[94m',       # Blue
        'bold': '\033[1m',        # Bold
        'reset': '\033[0m',       # Reset
    }
    
    POLES = [
        {
            'name': 'Pôle Administration',
            'code': 'POL_ADM',
            'description': 'Direction générale et gestion administrative'
        },
        {
            'name': 'Pôle Commercial',
            'code': 'POL_COM',
            'description': 'Ventes et relations commerciales'
        },
        {
            'name': 'Pôle Direction',
            'code': 'POL_DIR',
            'description': 'Direction générale'
        },
        {
            'name': 'Pôle Finance',
            'code': 'POL_FIN',
            'description': 'Gestion financière et comptabilité'
        },
        {
            'name': 'Pôle Informatique',
            'code': 'POL_INF',
            'description': 'Informatique et systèmes d\'information'
        },
        {
            'name': 'Pôle Logistique',
            'code': 'POL_LOG',
            'description': 'Logistique et approvisionnement'
        },
        {
            'name': 'Pôle Qualité',
            'code': 'POL_QUA',
            'description': 'Assurance qualité et amélioration'
        },
        {
            'name': 'Pôle RH',
            'code': 'POL_RH',
            'description': 'Ressources humaines'
        },
    ]
    
    def add_arguments(self, parser):
        """Add command-line arguments."""
        parser.add_argument(
            '--clear',
            action='store_true',
            help='Delete all existing Pôles before loading',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Force update existing Pôles',
        )
    
    def say(self, message, color='info'):
        """Print colored message."""
        self.stdout.write(f"{self.colors[color]}{message}{self.colors['reset']}")
    
    def handle(self, *args, **options):
        """Execute the command."""
        clear = options.get('clear', False)
        force = options.get('force', False)
        
        self.say(f"\n{'='*70}", 'bold')
        self.say('LOADING PÔLES (8 department types)', 'bold')
        self.say(f"{'='*70}\n", 'bold')
        
        try:
            with transaction.atomic():
                # Clear if requested
                if clear:
                    self.say('🗑️  Clearing existing Pôles...', 'warning')
                    count = Folder.objects.filter(folder_type='pole').delete()[0]
                    self.say(f'✓ Deleted {count} Pôles\n', 'success')
                
                created_count = 0
                updated_count = 0
                skipped_count = 0
                
                for pole_data in self.POLES:
                    pole, created = Folder.objects.get_or_create(
                        code=pole_data['code'],
                        defaults={
                            'name': pole_data['name'],
                            'folder_type': 'pole',
                            'description': pole_data['description'],
                            'parent': None,
                            'is_active': True,
                        }
                    )
                    
                    if created:
                        created_count += 1
                        self.say(f"✓ Created: {pole['name']} ({pole_data['code']})", 'success')
                    else:
                        if force:
                            # Update existing pole
                            pole.name = pole_data['name']
                            pole.description = pole_data['description']
                            pole.is_active = True
                            pole.save()
                            updated_count += 1
                            self.say(f"↻ Updated: {pole.name} ({pole_data['code']})", 'info')
                        else:
                            skipped_count += 1
                            self.say(f"◌ Skipped (exists): {pole.name} ({pole_data['code']})", 'warning')
                
                # Verify results
                self.say(f"\n{'-'*70}", 'bold')
                total_poles = Folder.objects.filter(folder_type='pole').count()
                
                self.say(f"\n✅ SUMMARY", 'success')
                self.say(f"   Created:  {created_count}", 'success')
                self.say(f"   Updated:  {updated_count}", 'info')
                self.say(f"   Skipped:  {skipped_count}", 'warning')
                self.say(f"   Total:    {total_poles} Pôles in database\n", 'bold')
                
                if total_poles == 8:
                    self.say(f"✓ All 8 Pôles verified successfully!", 'success')
                else:
                    self.say(f"⚠ Warning: Expected 8 Pôles but found {total_poles}", 'warning')
                
                # Display loaded pôles
                self.say(f"\n{'-'*70}", 'bold')
                self.say("Loaded Pôles:", 'bold')
                for i, pole in enumerate(Folder.objects.filter(folder_type='pole').order_by('name'), 1):
                    self.say(f"  {i}. {pole.name} ({pole.code})", 'info')
                
                self.say(f"\n{'='*70}\n", 'bold')
                
        except Exception as e:
            raise CommandError(f'Failed to load Pôles: {str(e)}')
