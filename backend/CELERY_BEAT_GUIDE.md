# Guide Celery Beat - Tâches Périodiques

## Vue d'ensemble

Django Celery Beat permet de planifier des tâches récurrentes (comme envoyer des emails chaque mois).

### Tâches Préconfigurées

```
✅ Rappel de Dépôt (22e du mois à 09:00)
   - Envoie un email aux utilisateurs
   - Les avertit que le dépôt commence le 25
   
✅ Nettoyage (Chaque jour à 02:00)
   - Supprime les anciennes notifications (> 30 jours)
   
✅ Rappels Quotidiens (Chaque jour à 08:00)
   - Envoie les rappels de deadline
```

---

## Configuration via Admin

### Accès

```
Admin → Scheduled Tasks (Django Celery Beat) → Periodic Tasks
http://localhost:8000/admin/django_celery_beat/periodictask/
```

### Créer une Nouvelle Tâche Périodique

#### Étape 1: Aller à la page d'ajout

```
Admin → Scheduled Tasks → Periodic Tasks → Add Periodic Task
```

#### Étape 2: Remplir les champs

**Exemple: Email mensuel le 22**

```
Name: Rappel Dépôt Mensuel
Task: apps.notifications.tasks.send_subscription_reminder_email
Enabled: ☑️ Coché

Interval: (autre option)
Crontab: ✓ Cocher "Crontab"

Crontab options:
├─ Minute: 0
├─ Hour: 9
├─ Day of month: 22
├─ Month of year: * (tous les mois)
└─ Day of week: * (tous les jours de la semaine)

Description: Envoie un rappel que le dépôt commence le 25
```

**Résultat:** Email envoyé chaque 22 du mois à 09:00

---

## Tâches Disponibles

### 1. send_subscription_reminder_email()

**Utilité:** Rappel de dépôt

```
Tâche: apps.notifications.tasks.send_subscription_reminder_email
Fréquence recommandée: 22e du mois à 09:00
Paramètres: Aucun
Destinataires: Tous les utilisateurs actifs
```

**Email produit:**
```
Sujet: Rappel: Le dépôt commence dans X jours (25/01/2026)

Contenu:
Bonjour,

Nous vous rappelons que la période de dépôt débutera le 25 janvier 2026.

Il vous reste 3 jour(s) pour préparer vos documents.

Merci,
L'équipe SGDRA
```

### 2. cleanup_old_notifications()

**Utilité:** Nettoyer les anciennes notifications

```
Tâche: apps.notifications.tasks.cleanup_old_notifications
Fréquence recommandée: Chaque jour à 02:00
Paramètres: Aucun
Action: Supprime les notifications lues de plus de 30 jours
```

### 3. send_document_validation_email(document_id, status)

**Utilité:** Notifier des validations de document

```
Tâche: apps.notifications.tasks.send_document_validation_email
Paramètres: 
  - document_id: ID du document
  - status: 'approved' ou 'rejected'
```

**À utiliser:** Quand un document est validé (depuis le code, pas via Celery Beat)

### 4. send_bulk_notification_email(title, message, recipient_filter)

**Utilité:** Envoyer des notifications massives

```
Tâche: apps.notifications.tasks.send_bulk_notification_email
Paramètres:
  - title: "Titre du message"
  - message: "Contenu du message"
  - recipient_filter: {"is_staff": true}  # optionnel
```

**Exemple:** Envoyer un message à tous les admins

---

## Configuration Avancée

### Planification par Crontab

#### Format Crontab

```
Minute (0-59):          Quand (0 = chaque minute)
Hour (0-23):            Heure de la journée
Day of month (1-31):    Jour du mois
Month of year (1-12):   Mois de l'année
Day of week (0-6):      Jour de la semaine (0=dimanche)
```

#### Exemples Courants

```
┌─ Chaque jour à 09:00
├─ Minute: 0
├─ Hour: 9
├─ Day of month: *
├─ Month of year: *
└─ Day of week: *

┌─ Le 22 du mois à 09:00
├─ Minute: 0
├─ Hour: 9
├─ Day of month: 22
├─ Month of year: *
└─ Day of week: *

┌─ Chaque lundi à 08:00
├─ Minute: 0
├─ Hour: 8
├─ Day of month: *
├─ Month of year: *
└─ Day of week: 1

┌─ Le 1er de chaque mois à 00:00
├─ Minute: 0
├─ Hour: 0
├─ Day of month: 1
├─ Month of year: *
└─ Day of week: *

┌─ Tous les jours à 02:00
├─ Minute: 0
├─ Hour: 2
├─ Day of month: *
├─ Month of year: *
└─ Day of week: *

┌─ Toutes les heures
├─ Minute: 0
├─ Hour: *
├─ Day of month: *
├─ Month of year: *
└─ Day of week: *
```

---

## Configuration Avec Interval (Alternative)

Si vous préférez une fréquence plus simple (heures, jours, semaines):

```
✓ Cocher "Interval" au lieu de "Crontab"

Options disponibles:
- Every 1 hour
- Every 12 hours
- Every 1 day
- Every 7 days
- Etc.
```

**Exemple:** Tous les 7 jours

```
Task: apps.notifications.tasks.send_subscription_reminder_email
Interval: Every 7 days
Repeat every: 1
Enabled: ☑️
```

---

## Tests et Suivi

### Tester une Tâche Manuellement

```bash
cd backend

# Tester une tâche
./venv/bin/python manage.py shell
>>> from apps.notifications.tasks import send_subscription_reminder_email
>>> result = send_subscription_reminder_email.apply()
>>> print(result.get())
```

### Voir l'Historique des Tâches

```
Admin → Scheduled Tasks (Django Celery Beat) → Task Results
```

### Vérifier que Celery Worker Tourne

```bash
# Terminal 1: Celery Worker
cd backend
source venv/bin/activate
celery -A config worker -l info

# Terminal 2: Celery Beat
cd backend
source venv/bin/activate
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

---

## Checkliste Configuration Production

### Tâches Recommandées à Configurer

- [ ] **Rappel Dépôt:** 22e du mois à 09:00
- [ ] **Nettoyage Notifications:** Chaque jour à 02:00
- [ ] **Validation Emails:** À chaque validation (dans le code)

### Vérifications

- [ ] Celery worker tourne en production
- [ ] Celery beat tourne en production
- [ ] Email SMTP configuré (settings.py)
- [ ] DEFAULT_FROM_EMAIL défini
- [ ] TIME_ZONE correct

---

## Configuration Email

### Fichier: backend/config/settings.py

```python
# Email Configuration
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = config('EMAIL_HOST', default='smtp.gmail.com')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='votre-email@gmail.com')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='votre-password')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@sgdra.com')
```

### Fichier: backend/.env

```
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=votre-email@gmail.com
EMAIL_HOST_PASSWORD=votre-mot-de-passe-app
DEFAULT_FROM_EMAIL=noreply@sgdra.com
```

---

## Dépannage

### Erreur: "Periodic tasks not found"

**Cause:** Celery Beat n'est pas en cours d'exécution

**Solution:**
```bash
# Démarrer Celery Beat
celery -A config beat -l info --scheduler django_celery_beat.schedulers:DatabaseScheduler
```

### Erreur: "Task not found"

**Cause:** Le nom de la tâche est incorrect

**Vérifier:**
```bash
# Lister toutes les tâches disponibles
cd backend
./venv/bin/python manage.py shell
>>> from celery import app
>>> app.tasks
```

### L'email n'est pas envoyé

**Vérifier:**
1. Celery worker tourne: `celery -A config worker -l info`
2. Email SMTP configuré dans settings.py
3. Destinataire a un email valide
4. Logs: `backend/logs/django.log`

### Email envoyé à l'heure incorrecte

**Vérifier:**
1. Timezone correct dans settings.py: `TIME_ZONE = 'Africa/Porto-Novo'`
2. Crontab time correct dans Periodic Task
3. Heure du serveur correcte: `timedatectl`

---

## API pour Créer des Tâches Programmées

### Via le Code Django

```python
from django_celery_beat.models import PeriodicTask, CrontabSchedule

# Créer un schedule Crontab
schedule, created = CrontabSchedule.objects.get_or_create(
    minute=0,
    hour=9,
    day_of_month=22,
    month_of_year='*',
    day_of_week='*',
)

# Créer une tâche périodique
PeriodicTask.objects.create(
    crontab=schedule,
    name='Rappel Dépôt Mensuel',
    task='apps.notifications.tasks.send_subscription_reminder_email',
    enabled=True,
)
```

### Via la Ligne de Commande

```bash
python manage.py shell

from django_celery_beat.models import PeriodicTask, CrontabSchedule

schedule, _ = CrontabSchedule.objects.get_or_create(
    minute=0, hour=9, day_of_month=22
)

PeriodicTask.objects.create(
    crontab=schedule,
    name='Rappel Mensuel',
    task='apps.notifications.tasks.send_subscription_reminder_email'
)
```

---

## Recommandation Finale

### Configuration Production Minimale

**3 tâches essentielles:**

1. **Rappel Dépôt** (22 du mois 09:00)
   ```
   Task: apps.notifications.tasks.send_subscription_reminder_email
   Crontab: minute=0, hour=9, day_of_month=22
   ```

2. **Nettoyage** (Chaque jour 02:00)
   ```
   Task: apps.notifications.tasks.cleanup_old_notifications
   Crontab: minute=0, hour=2
   ```

3. **Autre rappel** (Quotidien 08:00)
   ```
   Task: apps.documents.tasks.send_deadline_reminders_task
   Crontab: minute=0, hour=8
   ```

