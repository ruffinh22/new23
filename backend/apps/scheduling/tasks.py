"""
Celery tasks for email scheduling and event management
"""
from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mass_mail
from django.conf import settings
from .models import EmailSchedule
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)


@shared_task
def send_scheduled_emails():
    """
    Celery task pour envoyer les emails programmés qui sont dus.
    Cette tâche doit être exécutée toutes les 5 minutes via Celery Beat.
    
    Gère:
    - Les emails ONE_TIME: envoie à la date/heure spécifiée
    - Les emails MONTHLY: envoie chaque mois aux jours sélectionnés à l'heure spécifiée
    """
    now = timezone.now()
    
    # 1. Traiter les emails ONE_TIME programmés qui sont dus
    due_schedules = EmailSchedule.objects.filter(
        status='SCHEDULED',
        recurrence_type='ONE_TIME',
        scheduled_at__lte=now
    )
    
    for schedule in due_schedules:
        _send_email_schedule(schedule)
    
    # 2. Traiter les emails MONTHLY qui doivent être envoyés aujourd'hui
    monthly_schedules = EmailSchedule.objects.filter(
        status='SCHEDULED',
        recurrence_type='MONTHLY'
    )
    
    current_day = now.day
    current_hour = now.hour
    current_minute = now.minute
    
    for schedule in monthly_schedules:
        if not schedule.monthly_days:
            continue
            
        # Parse les jours (ex: "15,23" -> ['15', '23'])
        days = [int(d.strip()) for d in schedule.monthly_days.split(',')]
        
        # Vérifier si c'est un jour d'envoi
        if current_day not in days:
            continue
        
        # Vérifier l'heure (envoyer si c'est l'heure de programmation et pas plus tôt)
        if schedule.monthly_time:
            scheduled_hour, scheduled_minute = map(int, schedule.monthly_time.split(':'))
            
            # Envoyer si on est à l'heure programmée (avec tolérance de 5 minutes)
            if (current_hour == scheduled_hour and 
                scheduled_minute <= current_minute < scheduled_minute + 5):
                _send_email_schedule(schedule)


def _send_email_schedule(schedule):
    """Envoie un email programmé donné"""
    try:
        # Récupère les destinataires selon le type
        recipient_emails = schedule.get_recipient_emails()
        
        if not recipient_emails:
            logger.warning(
                f"No recipients found for EmailSchedule {schedule.id} "
                f"with type {schedule.recipient_type}"
            )
            schedule.status = 'FAILED'
            schedule.error_message = "Aucun destinataire trouvé"
            schedule.save(update_fields=['status', 'error_message', 'updated_at'])
            return
        
        # Prepare email message
        from_email = settings.DEFAULT_FROM_EMAIL
        subject = schedule.subject
        message = schedule.message
        
        # Create list of (subject, message, from_email, [recipient_list])
        email_list = [
            (subject, message, from_email, [email])
            for email in recipient_emails
        ]
        
        # Send emails
        num_sent = send_mass_mail(email_list, fail_silently=False)
        
        # Pour les emails MONTHLY, on garde le statut SCHEDULED
        # Pour les emails ONE_TIME, on passe à SENT
        if schedule.recurrence_type == 'ONE_TIME':
            schedule.status = 'SENT'
        
        schedule.sent_at = timezone.now()
        schedule.save(update_fields=['status', 'sent_at', 'updated_at'])
        
        logger.info(
            f"EmailSchedule {schedule.id} sent successfully to {num_sent} recipients"
        )
        
    except Exception as e:
        logger.error(f"Error sending EmailSchedule {schedule.id}: {str(e)}")
        schedule.status = 'FAILED'
        schedule.error_message = str(e)
        schedule.save(update_fields=['status', 'error_message', 'updated_at'])



@shared_task
def cleanup_old_events():
    """
    Celery task pour archiver les événements passés (au besoin)
    Cette tâche peut être exécutée une fois par jour via Celery Beat.
    """
    from .models import Event
    from datetime import timedelta
    
    # Archive events older than 30 days
    old_date = timezone.now() - timedelta(days=30)
    archived = Event.objects.filter(
        is_public=True,
        status='PUBLISHED',
        event_date__lt=old_date
    ).update(status='ARCHIVED')
    
    logger.info(f"Archived {archived} old events")
    return archived
