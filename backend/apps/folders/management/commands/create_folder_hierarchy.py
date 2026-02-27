"""
Management command to create the complete folder hierarchy:
Pôles -> Filiales -> Services -> Sub-Services
"""

from django.core.management.base import BaseCommand
from apps.folders.models import Folder


class Command(BaseCommand):
    help = (
        "Create complete folder hierarchy with Pôles, Filiales, Campagnes, and Services"
    )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS("\n🔄 Creating folder hierarchy...\n"))

        # Define hierarchy structure
        hierarchy = {
            "QUALITÉ": {
                "GUINEE CONAKRY": {
                    "MTN": ["RA", "DIGITAL"],
                    "CELTIS": ["CELTIS RA", "BO"],
                },
                "CÔTE D'IVOIRE": {"MTN": ["RA", "DIGITAL"]},
                "BENIN": {"MTN": ["MTN DIGITAL", "MTN BO"], "CELTIS": ["CELTIS RA"]},
                "CAMEROUN": {"MTN": ["EA", "BO"]},
                "GUINEE BISSAU": {"MTN": ["RA", "BO"]},
                "CONGO": {"MTN": ["RA", "BO"]},
            },
            "AAIM": {
                "GUINEE CONAKRY": {"MTN": ["RA", "DIGITAL"]},
                "CÔTE D'IVOIRE": {"MTN": ["RA"]},
                "BENIN": {"MTN": ["MTN DIGITAL", "MTN BO"], "CELTIS": ["CELTIS RA"]},
                "CAMEROUN": {"MTN": ["EA"]},
                "GUINEE BISSAU": {"MTN": ["RA"]},
                "CONGO": {"MTN": ["RA"]},
            },
            "PRODUCTION": {
                "GUINEE CONAKRY": {"MTN": ["RA", "DIGITAL"]},
                "CÔTE D'IVOIRE": {"MTN": ["RA", "DIGITAL"]},
                "BENIN": {"MTN": ["MTN DIGITAL", "MTN BO"], "CELTIS": ["CELTIS RA"]},
                "CAMEROUN": {"MTN": ["PA", "BO"]},
                "GUINEE BISSAU": {"MTN": ["PA"]},
                "CONGO": {"MTN": ["RA", "BO"]},
            },
        }

        created_count = 0
        skipped_count = 0

        # Create Pôles (level 1)
        poles = {}
        for pole_name in hierarchy.keys():
            pole, created = Folder.objects.get_or_create(
                name=pole_name,
                folder_type="pole",
                defaults={"description": f"Pôle {pole_name}"},
            )
            poles[pole_name] = pole
            if created:
                self.stdout.write(self.style.SUCCESS(f"  ✅ Created Pôle: {pole_name}"))
                created_count += 1
            else:
                self.stdout.write(self.style.WARNING(f"  ⏭️  Pôle exists: {pole_name}"))
                skipped_count += 1

        # Create Filiales (level 2)
        filiales = {}
        for pole_name, filiales_dict in hierarchy.items():
            pole = poles[pole_name]
            for filiale_name in filiales_dict.keys():
                filiale, created = Folder.objects.get_or_create(
                    name=filiale_name,
                    folder_type="filiale",
                    parent=pole,
                    defaults={"description": f"Filiale {filiale_name} - {pole_name}"},
                )
                filiales[(pole_name, filiale_name)] = filiale
                if created:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"    ✅ Created Filiale: {filiale_name} (under {pole_name})"
                        )
                    )
                    created_count += 1
                else:
                    self.stdout.write(
                        self.style.WARNING(f"    ⏭️  Filiale exists: {filiale_name}")
                    )
                    skipped_count += 1

        # Create Campagnes/Services with Activities (level 3 & 4)
        for pole_name, filiales_dict in hierarchy.items():
            pole = poles[pole_name]
            for filiale_name, campaigns_dict in filiales_dict.items():
                filiale = filiales[(pole_name, filiale_name)]

                for campaign_name, activities in campaigns_dict.items():
                    # Create Campaign/Service folder (level 3)
                    service, created = Folder.objects.get_or_create(
                        name=campaign_name,
                        folder_type="service",  # Use 'service' for campaigns
                        parent=filiale,
                        defaults={"description": f"Service {campaign_name}"},
                    )
                    if created:
                        self.stdout.write(
                            self.style.SUCCESS(
                                f"      ✅ Created Service: {campaign_name} ({filiale_name})"
                            )
                        )
                        created_count += 1
                    else:
                        self.stdout.write(
                            self.style.WARNING(
                                f"      ⏭️  Service exists: {campaign_name}"
                            )
                        )
                        skipped_count += 1

                    # Create Activities/Sub-services (level 4, children of service)
                    for activity_name in activities:
                        activity, created = Folder.objects.get_or_create(
                            name=activity_name,
                            folder_type="sub_service",  # Use 'sub_service' for activities
                            parent=service,
                            defaults={"description": f"Sous-service {activity_name}"},
                        )
                        if created:
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f"        ✅ Created Sub-service: {activity_name}"
                                )
                            )
                            created_count += 1
                        else:
                            self.stdout.write(
                                self.style.WARNING(
                                    f"        ⏭️  Sub-service exists: {activity_name}"
                                )
                            )
                            skipped_count += 1

        # Summary
        self.stdout.write(self.style.SUCCESS("\n📊 Summary:"))
        self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {created_count} folders"))
        self.stdout.write(self.style.WARNING(f"  ⏭️  Skipped: {skipped_count} folders"))
        self.stdout.write(
            self.style.SUCCESS(f"  📌 Total folders: {Folder.objects.count()}")
        )
        self.stdout.write(self.style.SUCCESS("\n✨ Folder hierarchy setup complete!\n"))
