"""
Management command to create initial users for each role.
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model

User = get_user_model()

# Define initial users with their roles and passwords
INITIAL_USERS = [
    # Admin users
    {
        "matricule": "ADMIN001",
        "email": "admin001@sgdra.com",
        "password": "admin123",
        "role": "ADMIN",
        "first_name": "Admin",
        "last_name": "Principal",
    },
    # Pole managers
    {
        "matricule": "POLE_MGR001",
        "email": "pole.mgr001@sgdra.com",
        "password": "pm123456",
        "role": "POLE_MGR",
        "first_name": "Pole",
        "last_name": "Manager 1",
    },
    {
        "matricule": "POLE_MGR002",
        "email": "pole.mgr002@sgdra.com",
        "password": "pm123456",
        "role": "POLE_MGR",
        "first_name": "Pole",
        "last_name": "Manager 2",
    },
    # Filiale managers
    {
        "matricule": "FILIALE_MGR001",
        "email": "filiale.mgr001@sgdra.com",
        "password": "fm123456",
        "role": "FILIALE",
        "first_name": "Filiale",
        "last_name": "Manager 1",
    },
    {
        "matricule": "FILIALE_MGR002",
        "email": "filiale.mgr002@sgdra.com",
        "password": "fm123456",
        "role": "FILIALE",
        "first_name": "Filiale",
        "last_name": "Manager 2",
    },
    # Service managers
    {
        "matricule": "SERVICE_MGR001",
        "email": "service.mgr001@sgdra.com",
        "password": "sm123456",
        "role": "SERVICE",
        "first_name": "Service",
        "last_name": "Manager 1",
    },
    {
        "matricule": "SERVICE_MGR002",
        "email": "service.mgr002@sgdra.com",
        "password": "sm123456",
        "role": "SERVICE",
        "first_name": "Service",
        "last_name": "Manager 2",
    },
    # Agents
    {
        "matricule": "AGENT001",
        "email": "agent001@sgdra.com",
        "password": "agent123",
        "role": "AGENT",
        "first_name": "Agent",
        "last_name": "Standard 1",
    },
    {
        "matricule": "AGENT002",
        "email": "agent002@sgdra.com",
        "password": "agent123",
        "role": "AGENT",
        "first_name": "Agent",
        "last_name": "Standard 2",
    },
    {
        "matricule": "AGENT003",
        "email": "agent003@sgdra.com",
        "password": "agent123",
        "role": "AGENT",
        "first_name": "Agent",
        "last_name": "Standard 3",
    },
    # Document managers
    {
        "matricule": "DOC_MGR001",
        "email": "doc.mgr001@sgdra.com",
        "password": "dm123456",
        "role": "DOC_MGR",
        "first_name": "Document",
        "last_name": "Manager 1",
    },
    {
        "matricule": "DOC_MGR002",
        "email": "doc.mgr002@sgdra.com",
        "password": "dm123456",
        "role": "DOC_MGR",
        "first_name": "Document",
        "last_name": "Manager 2",
    },
]


class Command(BaseCommand):
    help = "Create initial users for each role"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force creation even if users already exist",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        created_count = 0
        skipped_count = 0

        self.stdout.write(self.style.SUCCESS("\n🔄 Creating initial users...\n"))

        for user_data in INITIAL_USERS:
            matricule = user_data["matricule"]
            email = user_data["email"]
            password = user_data["password"]
            role = user_data["role"]
            first_name = user_data.get("first_name", "")
            last_name = user_data.get("last_name", "")

            # Check if user already exists
            if User.objects.filter(matricule=matricule).exists() and not force:
                self.stdout.write(
                    self.style.WARNING(
                        f"⏭️  Skipped: {matricule} ({email}) - already exists"
                    )
                )
                skipped_count += 1
                continue

            try:
                # Create or update user
                user, created = User.objects.update_or_create(
                    matricule=matricule,
                    defaults={
                        "email": email,
                        "first_name": first_name,
                        "last_name": last_name,
                        "role": role,
                        "is_active": True,
                        "is_staff": role
                        == "ADMIN",  # Only ADMIN users get is_staff=True
                    },
                )

                # Set password
                user.set_password(password)
                user.save()

                action = "Created" if created else "Updated"
                self.stdout.write(
                    self.style.SUCCESS(f"✅ {action}: {matricule} ({email}) - {role}")
                )
                if created:
                    created_count += 1

            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f"❌ Error creating {matricule}: {str(e)}")
                )

        # Summary
        self.stdout.write(self.style.SUCCESS("\n📊 Summary:"))
        self.stdout.write(self.style.SUCCESS(f"  ✅ Created: {created_count} users"))
        self.stdout.write(self.style.WARNING(f"  ⏭️  Skipped: {skipped_count} users"))
        self.stdout.write(
            self.style.SUCCESS(f"  📌 Total users: {User.objects.count()}")
        )
        self.stdout.write(self.style.SUCCESS("\n✨ Initial users setup complete!\n"))
