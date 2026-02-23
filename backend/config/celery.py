import os
from celery import Celery
from celery.schedules import crontab

# Set the default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('sgdra')

# Load configuration from Django settings with CELERY_ prefix
app.config_from_object('django.conf:settings', namespace='CELERY')

# Auto-discover tasks from all registered Django apps
app.autodiscover_tasks()

# Celery Beat Schedule - Tâches périodiques (PHASE 5 - Notifications Refactored)
app.conf.beat_schedule = {
    # ===== NOTIFICATION TASKS (NEW - PHASE 5) =====
    
    # Archive des vieilles notifications (> 30 jours) - Quotidiennement à 01:00
    'archive-old-notifications-daily': {
        'task': 'apps.notifications.tasks.archive_old_notifications',
        'schedule': crontab(hour=1, minute=0),
        'kwargs': {}
    },
    
    # Nettoyage des notifications expirées - Quotidiennement à 02:00
    'cleanup-expired-notifications-daily': {
        'task': 'apps.notifications.tasks.cleanup_expired_notifications',
        'schedule': crontab(hour=2, minute=0),
        'kwargs': {}
    },
    
    # Envoi des digests journaliers (résumés) - Quotidiennement à 08:00
    'send-daily-digest-morning': {
        'task': 'apps.notifications.tasks.send_daily_digest',
        'schedule': crontab(hour=8, minute=0),
        'kwargs': {}
    },
    
    # ===== LEGACY TASKS (EXISTING) =====
    
    # Rappel de dépôt: Tous les 22e jour du mois à 09:00
    'send-deposit-reminder-monthly': {
        'task': 'apps.notifications.tasks.send_subscription_reminder_email',
        'schedule': crontab(day_of_month=22, hour=9, minute=0),
        'kwargs': {}
    },
    
    # Rappel de deadline: Chaque jour à 08:00
    'send-deadline-reminders-daily': {
        'task': 'apps.documents.tasks.send_deadline_reminders_task',
        'schedule': crontab(hour=8, minute=0),
    },
}

# Additional Celery configuration
app.conf.timezone = 'Africa/Porto-Novo'  # Fuseau horaire du serveur
app.conf.enable_utc = True  # Utiliser UTC en interne
app.conf.task_serializer = 'json'
app.conf.accept_content = ['json']
app.conf.result_serializer = 'json'
app.conf.task_track_started = True
app.conf.task_time_limit = 30 * 60  # Limite de temps: 30 minutes

@app.task(bind=True)
def debug_task(self):
    print(f'Request: {self.request!r}')


