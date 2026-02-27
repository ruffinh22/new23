"""
Management command to load Services (departments) into the database.

Create Services under each Filiale:
- 1 Service per Filiale (name matches parent Pôle type)
- Total: 56 Services under 56 Filiales

Usage:
    python manage.py load_services
    python manage.py load_services --clear  # Delete and recreate
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from apps.folders.models import Folder


class Command(BaseCommand):
    help = "Load Services (1 per Filiale) into the database"

    colors = {
        "success": "\033[92m",
        "warning": "\033[93m",
        "error": "\033[91m",
        "info": "\033[94m",
        "bold": "\033[1m",
        "reset": "\033[0m",
    }

    # Service name mapping based on Pôle type
    SERVICE_NAMES = {
        "POL_ADM": "Administration",
        "POL_COM": "Commercial",
        "POL_DIR": "Direction",
        "POL_FIN": "Finance",
        "POL_INF": "Informatique",
        "POL_LOG": "Logistique",
        "POL_QUA": "Qualité",
        "POL_RH": "Ressources Humaines",
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing Services before loading",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force update existing Services",
        )
        parser.add_argument(
            "--filiale",
            type=int,
            help="Load Services for specific Filiale ID",
        )

    def say(self, message, color="info"):
        self.stdout.write(f"{self.colors[color]}{message}{self.colors['reset']}")

    def handle(self, *args, **options):
        clear = options.get("clear", False)
        force = options.get("force", False)
        filiale_id = options.get("filiale", None)

        self.say(f"\n{'=' * 70}", "bold")
        self.say("LOADING SERVICES (1 per Filiale = 56 total)", "bold")
        self.say(f"{'=' * 70}\n", "bold")

        try:
            with transaction.atomic():
                # Get Filiales
                if filiale_id:
                    filiales = Folder.objects.filter(
                        folder_type="filiale", id=filiale_id, is_active=True
                    )
                    if not filiales.exists():
                        raise CommandError(f"Filiale with ID {filiale_id} not found")
                else:
                    filiales = (
                        Folder.objects.filter(folder_type="filiale", is_active=True)
                        .select_related("parent")
                        .order_by("parent__name", "name")
                    )

                if not filiales.exists():
                    raise CommandError(
                        'No Filiales found. Run "python manage.py load_filiales" first'
                    )

                # Clear if requested
                if clear:
                    self.say("🗑️  Clearing existing Services...", "warning")
                    count = Folder.objects.filter(folder_type="service").delete()[0]
                    self.say(f"✓ Deleted {count} Services\n", "success")

                created_count = 0
                updated_count = 0
                skipped_count = 0
                pole_counts = {}

                for filiale in filiales:
                    pole = filiale.parent

                    if pole is None:
                        self.say(
                            f"⚠ Skipping Filiale {filiale.name}: No parent Pôle",
                            "warning",
                        )
                        continue

                    # Get service base name from pole type
                    pole_code_prefix = pole.code.split("_")[1]  # Get ADM, COM, etc.
                    service_name = self.SERVICE_NAMES.get(pole.code, pole.name)

                    # Generate service code: SRV_ADM_EN, SRV_COM_MR, etc.
                    country_suffix = filiale.code.split("_")[-1]  # Get EN, MR, etc.
                    service_code = f"SRV_{pole_code_prefix}_{country_suffix}"

                    # First try to get by code (preferred)
                    try:
                        service = Folder.objects.get(code=service_code)
                        created = False
                        # Update if needed
                        if force:
                            service.name = service_name
                            service.is_active = True
                            service.save()
                            updated_count += 1
                            self.say(
                                f"  ↻ {filiale.name}: {service_name} ({service_code})",
                                "info",
                            )
                        else:
                            skipped_count += 1
                            self.say(
                                f"  ◌ {filiale.name}: {service_name} (exists)",
                                "warning",
                            )
                    except Folder.DoesNotExist:
                        # Code doesn't exist, try to create based on (name, parent)
                        service, created = Folder.objects.get_or_create(
                            name=service_name,
                            parent=filiale,
                            defaults={
                                "code": service_code,
                                "folder_type": "service",
                                "description": f"{service_name} - {filiale.name} ({pole.name})",
                                "is_active": True,
                            },
                        )

                        if created:
                            created_count += 1
                            self.say(
                                f"  ✓ {filiale.name}: {service_name} ({service_code})",
                                "success",
                            )
                        else:
                            # Service exists with same (name, parent), update its code
                            if service.code != service_code:
                                service.code = service_code
                            service.is_active = True
                            service.save()
                            updated_count += 1
                            self.say(
                                f"  ↻ {filiale.name}: {service_name} ({service_code})",
                                "info",
                            )

                    # Track services per pole for summary
                    pole_name = pole.name
                    if pole_name not in pole_counts:
                        pole_counts[pole_name] = 0
                    pole_counts[pole_name] += 1

                # Verify results
                self.say(f"\n{'-' * 70}", "bold")
                total_services = Folder.objects.filter(folder_type="service").count()
                total_filiales_with_services = (
                    Folder.objects.filter(folder_type="service")
                    .values("parent__id")
                    .distinct()
                    .count()
                )

                self.say("\n✅ SUMMARY", "success")
                self.say(f"   Created:  {created_count}", "success")
                self.say(f"   Updated:  {updated_count}", "info")
                self.say(f"   Skipped:  {skipped_count}", "warning")
                self.say(f"   Total Services: {total_services}", "bold")
                self.say(
                    f"   Filiales with Services: {total_filiales_with_services}\n",
                    "bold",
                )

                if total_services == 56:
                    self.say("✓ All 56 Services verified successfully!", "success")
                else:
                    self.say(
                        f"⚠ Warning: Expected 56 Services but found {total_services}",
                        "warning",
                    )

                # Display summary by pôle type
                self.say(f"\n{'-' * 70}", "bold")
                self.say("Services by Pôle Type:", "bold")
                for pole in Folder.objects.filter(folder_type="pole").order_by("name"):
                    services = Folder.objects.filter(
                        parent__parent_id=pole.id, folder_type="service"
                    ).count()
                    self.say(
                        f"  • {pole.name}: {services} Services",
                        "info" if services == 7 else "warning",
                    )

                # Overall hierarchy summary
                self.say(f"\n{'-' * 70}", "bold")
                self.say("📊 Overall Hierarchy:", "bold")
                poles = Folder.objects.filter(folder_type="pole").count()
                filiales = Folder.objects.filter(folder_type="filiale").count()
                services = Folder.objects.filter(folder_type="service").count()
                total = poles + filiales + services

                self.say(f"  Pôles:    {poles} ✓", "success")
                self.say(f"  Filiales: {filiales} ✓", "success")
                self.say(f"  Services: {services} ✓", "success")
                self.say(f"  Total:    {total} folders in hierarchy\n", "bold")

                if total == 120:
                    self.say("✅ COMPLETE HIERARCHY VERIFIED!", "success")

                self.say(f"{'=' * 70}\n", "bold")

        except Exception as e:
            raise CommandError(f"Failed to load Services: {str(e)}")
