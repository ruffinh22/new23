from celery import shared_task
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.documents.models import Document, DocumentValidationResult
from django.contrib.auth import get_user_model
from .validators import DocumentValidator

User = get_user_model()


@shared_task
def validate_document_task(document_id):
    """
    Celery task pour valider un document.
    Lance la validation du fichier selon les spécifications.
    """
    try:
        document = Document.objects.get(id=document_id)

        # Récupérer la spécification
        specification = document.specification
        if not specification:
            return f"No specification for document {document_id}"

        # Ouvrir le fichier
        if not document.file:
            return f"No file for document {document_id}"

        # Valider le document
        validator = DocumentValidator(document.file, specification)
        is_valid, errors, warnings, details = validator.validate()

        # Créer/mettre à jour le résultat de validation
        validation_result, created = DocumentValidationResult.objects.update_or_create(
            document=document,
            defaults={
                "status": "PASSED" if is_valid else "FAILED",
                "errors": errors,
                "warnings": warnings,
                "validation_details": details,
                "validated_at": timezone.now(),
            },
        )

        # Mettre à jour le document
        document.is_validated = is_valid
        if is_valid:
            document.status = (
                "EN_ATTENTE"  # En attente d'approbation admin, pas VALIDE directement
            )
        else:
            document.status = "REJETE"
        document.save()

        # Les notifications seront créées automatiquement via le signal post_save sur DocumentValidationResult
        # qui utilisera le service de notifications

        return f"Document {document_id} validated: {'PASSED' if is_valid else 'FAILED'}"

    except Document.DoesNotExist:
        return f"Document {document_id} not found"
    except Exception as e:
        return f"Error validating document {document_id}: {str(e)}"


@shared_task
def send_deadline_reminders_task():
    """
    Celery task to send email reminders to agents about pending documents.
    This task is scheduled to run daily via Celery Beat.
    """
    # Find documents pending for more than 5 days
    five_days_ago = timezone.now() - timedelta(days=5)
    pending_documents = Document.objects.filter(
        status="EN_ATTENTE", created_at__lt=five_days_ago
    ).select_related("agent")

    if not pending_documents.exists():
        return "No pending documents found"

    # Group documents by agent
    agents_documents = {}
    for doc in pending_documents:
        agent = doc.agent
        if agent not in agents_documents:
            agents_documents[agent] = []
        agents_documents[agent].append(doc)

    sent_count = 0
    failed_count = 0

    # Send emails to agents
    for agent, documents in agents_documents.items():
        try:
            # Prepare email context
            context = {
                "agent": agent,
                "documents": documents,
                "count": len(documents),
                "site_url": settings.SITE_URL
                if hasattr(settings, "SITE_URL")
                else "http://localhost:5173",
            }

            # Render email template
            html_message = render_to_string(
                "documents/email_deadline_reminder.html", context
            )

            # Send email
            send_mail(
                subject=f"Rappel: {len(documents)} document(s) en attente de traitement",
                message=f"Vous avez {len(documents)} document(s) en attente de traitement depuis plus de 5 jours.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[agent.email],
                html_message=html_message,
                fail_silently=False,
            )
            sent_count += 1
        except Exception as e:
            failed_count += 1
            log_error(
                f"Failed to send email to {agent.email}",
                exception=e,
                logger_instance=base_logger,
            )

    return f"Deadline reminders sent: {sent_count} successful, {failed_count} failed"


@shared_task
def notify_admin_on_document_upload(document_id):
    """
    Celery task to notify admins when a new document is uploaded.
    This can be called asynchronously from signals.

    NOTE: Cette fonction n'est probablement pas utilisée car les notifications
    sont envoyées directement dans la vue create() via le service NotificationService.
    """
    # DÉSACTIVÉ - Les notifications sont gérées par NotificationService dans les vues
    return f"Document {document_id} notifications handled by NotificationService"
