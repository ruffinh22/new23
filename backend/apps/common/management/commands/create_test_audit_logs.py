"""
Django management command to create test audit logs.
"""

from django.core.management.base import BaseCommand
from apps.common.audit import AuditLog
from apps.users.models import User


class Command(BaseCommand):
    help = "Create test audit logs for demonstration"

    def handle(self, *args, **options):
        # Get admin user
        admin = User.objects.filter(role="ADMIN").first()
        if not admin:
            self.stdout.write(self.style.ERROR("❌ Pas d'utilisateur ADMIN trouvé"))
            return

        # Create test logs
        actions = [
            ("DOCUMENT_UPLOAD", "INFO", True, "Document test.pdf uploadé"),
            ("DOCUMENT_VALIDATE", "INFO", True, "Document validé avec succès"),
            ("DOCUMENT_APPROVE", "INFO", True, "Document approuvé par admin"),
            ("USER_LOGIN", "INFO", True, "Connexion utilisateur ADMIN001"),
            ("CONFIGURATION_CHANGE", "WARNING", True, "Configuration système modifiée"),
            ("DOCUMENT_REJECT", "WARNING", False, "Document rejeté - format invalide"),
            ("ACCESS_DENIED", "ERROR", False, "Accès refusé à ressource sensible"),
            ("SYSTEM_ERROR", "CRITICAL", False, "Erreur système détectée"),
        ]

        created_count = 0
        for action, severity, success, description in actions:
            try:
                AuditLog.log_action(
                    actor=admin,
                    action=action,
                    severity=severity,
                    description=description,
                    success=success,
                    ip_address="127.0.0.1",
                )
                created_count += 1
                self.stdout.write(f"  ✓ {action}")
            except Exception as e:
                self.stdout.write(self.style.ERROR(f"  ✗ {action}: {e}"))

        total = AuditLog.objects.count()
        self.stdout.write(
            self.style.SUCCESS(
                f"\n✅ {created_count} logs créés. Total dans la DB: {total}"
            )
        )
