"""
Management command to load Filiales (branches) into the database.

Create Filiales under each Pôle:
- 7 Filiales per Pôle (one for each country)
- Total: 56 Filiales under 8 Pôles

Usage:
    python manage.py load_filiales
    python manage.py load_filiales --clear  # Delete and recreate
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.folders.models import Folder


class Command(BaseCommand):
    help = "Load Filiales (7 per Pôle) into the database"

    colors = {
        "success": "\033[92m",
        "warning": "\033[93m",
        "error": "\033[91m",
        "info": "\033[94m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }

    COUNTRIES = [
        {"name": "Bénin", "code": "BJ"},
        {"name": "Cameroun", "code": "CM"},
        {"name": "Congo", "code": "CG"},
        {"name": "Côte d'Ivoire", "code": "CI"},
        {"name": "Guinée", "code": "GN"},
        {"name": "Guinée Équatoriale", "code": "GQ"},
        {"name": "Guinée-Bissau", "code": "GW"},
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing Filiales before loading",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force update existing Filiales",
        )
        parser.add_argument(
            "--pole",
            type=str,
            help="Load Filiales for specific Pôle code (e.g., POL_ADM)",
        )

    def say(self, message, color="info"):
        self.stdout.write(f"{self.colors[color]}{message}{self.colors['reset']}")

    def handle(self, *args, **options):
        clear = options.get("clear", False)
        force = options.get("force", False)
        pole_filter = options.get("pole", None)

        self.say(f"\n{'=' * 70}", "bold")
        self.say("LOADING FILIALES (7 per Pôle = 56 total)", "bold")
        self.say(f"{'=' * 70}\n", "bold")

        try:
            with transaction.atomic():
                # Get Pôles
                if pole_filter:
                    poles = Folder.objects.filter(
                        folder_type="pole", code=pole_filter, is_active=True
                    )
                    if not poles.exists():
                        raise CommandError(f"Pôle with code {pole_filter} not found")
                    self.say(f"Loading Filiales for: {poles.first().name}\n", "info")
                else:
                    poles = Folder.objects.filter(
                        folder_type="pole", is_active=True
                    ).order_by("name")

                if not poles.exists():
                    raise CommandError(
                        'No Pôles found. Run "python manage.py load_poles" first'
                    )

                # Clear if requested
                if clear:
                    self.say("🗑️  Clearing existing Filiales...", "warning")
                    count = Folder.objects.filter(folder_type="filiale").delete()[0]
                    self.say(f"✓ Deleted {count} Filiales\n", "success")

                created_count = 0
                updated_count = 0
                skipped_count = 0

                for pole in poles:
                    self.say(f"\n📍 Processing {pole.name}:", "bold")

                    for idx, country in enumerate(self.COUNTRIES):
                        # Generate unique country code: A0, A1, A2... B0, B1, B2...
                        pole_idx = list(poles).index(pole)
                        country_code = chr(65 + pole_idx) + str(idx)

                        # Generate code using last 2 chars of country name
                        # Bénin→EN, Cameroun→MR, Congo→ON, etc.
                        country_code_suffix = country["name"][-2:].upper()
                        filiale_code = (
                            f"POL_{pole.code.split('_')[1]}_{country_code_suffix}"
                        )

                        # First try to get by code (preferred)
                        try:
                            filiale = Folder.objects.get(code=filiale_code)
                            created = False
                            # Update if needed
                            if force:
                                filiale.name = country["name"]
                                filiale.country_code = country_code
                                filiale.parent = pole
                                filiale.is_active = True
                                filiale.save()
                                updated_count += 1
                                self.say(
                                    f"  ↻ Updated: {country['name']} ({filiale_code})",
                                    "info",
                                )
                            else:
                                skipped_count += 1
                                self.say(
                                    f"  ◌ Skipped: {country['name']} (exists)",
                                    "warning",
                                )
                        except Folder.DoesNotExist:
                            # Code doesn't exist, try to create based on (name, parent)
                            filiale, created = Folder.objects.get_or_create(
                                name=country["name"],
                                parent=pole,
                                defaults={
                                    "code": filiale_code,
                                    "folder_type": "filiale",
                                    "country_code": country_code,
                                    "description": f"{country['name']} - {pole.name}",
                                    "is_active": True,
                                },
                            )

                            if created:
                                created_count += 1
                                self.say(
                                    f"  ✓ Created: {country['name']} ({filiale_code})",
                                    "success",
                                )
                            else:
                                # Folder exists with same (name, parent), update its code
                                if filiale.code != filiale_code:
                                    filiale.code = filiale_code
                                filiale.country_code = country_code
                                filiale.is_active = True
                                filiale.save()
                                updated_count += 1
                                self.say(
                                    f"  ↻ Updated: {country['name']} ({filiale_code})",
                                    "info",
                                )

                # Verify results
                self.say(f"\n{'-' * 70}", "bold")
                total_filiales = Folder.objects.filter(folder_type="filiale").count()
                total_poles_with_filiales = (
                    Folder.objects.filter(folder_type="filiale")
                    .values("parent__id")
                    .distinct()
                    .count()
                )

                self.say("\n✅ SUMMARY", "success")
                self.say(f"   Created:  {created_count}", "success")
                self.say(f"   Updated:  {updated_count}", "info")
                self.say(f"   Skipped:  {skipped_count}", "warning")
                self.say(f"   Total Filiales: {total_filiales}", "bold")
                self.say(
                    f"   Pôles with Filiales: {total_poles_with_filiales}\n", "bold"
                )

                if total_filiales == 56:
                    self.say("✓ All 56 Filiales verified successfully!", "success")
                else:
                    self.say(
                        f"⚠ Warning: Expected 56 Filiales but found {total_filiales}",
                        "warning",
                    )

                # Display summary by pôle
                self.say(f"\n{'-' * 70}", "bold")
                self.say("Summary by Pôle:", "bold")
                for pole in Folder.objects.filter(folder_type="pole").order_by("name"):
                    filiales = pole.children.filter(folder_type="filiale").count()
                    self.say(
                        f"  • {pole.name}: {filiales} Filiales",
                        "info" if filiales == 7 else "warning",
                    )

                self.say(f"\n{'=' * 70}\n", "bold")

        except Exception as e:
            raise CommandError(f"Failed to load Filiales: {str(e)}")
