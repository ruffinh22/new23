"""
Management command pour envoyer des rappels d'échéance par email aux agents.
À utiliser avec une tâche cron (celery beat):
  0 9 * * * python manage.py send_deadline_reminders
"""

from datetime import timedelta
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from apps.documents.models import Document, DocumentSpecification


class Command(BaseCommand):
    help = 'Envoie des rappels d\'échéance par email aux agents'

    def handle(self, *args, **options):
        """Envoie des emails de rappel d'échéance."""
        
        # Documents en attente depuis plus de 5 jours
        cutoff_date = timezone.now() - timedelta(days=5)
        pending_docs = Document.objects.filter(
            status='EN_ATTENTE',
            created_at__lt=cutoff_date,
            is_validated=False
        ).select_related('agent', 'document_type')

        if not pending_docs.exists():
            self.stdout.write(
                self.style.SUCCESS('Aucun document en attente de validation')
            )
            return

        # Grouper par agent
        docs_by_agent = {}
        for doc in pending_docs:
            if doc.agent not in docs_by_agent:
                docs_by_agent[doc.agent] = []
            docs_by_agent[doc.agent].append(doc)

        # Envoyer les emails
        sent_count = 0
        for agent, documents in docs_by_agent.items():
            try:
                context = {
                    'agent': agent,
                    'documents': documents,
                    'count': len(documents),
                    'site_url': getattr(settings, 'SITE_URL', 'http://localhost:8000'),
                }
                
                message = render_to_string('documents/email_deadline_reminder.html', context)
                
                send_mail(
                    subject='⏰ Rappel: Documents en attente de validation',
                    message='Voir le message en HTML',
                    html_message=message,
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[agent.email],
                    fail_silently=False,
                )
                
                sent_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'Email envoyé à {agent.email}')
                )
            except Exception as e:
                self.stdout.write(
                    self.style.ERROR(f'Erreur lors de l\'envoi à {agent.email}: {str(e)}')
                )

        self.stdout.write(
            self.style.SUCCESS(f'\n{sent_count} email(s) envoyé(s)')
        )
