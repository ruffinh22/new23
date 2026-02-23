"""
Commande de gestion: Vérifier et corriger les problèmes de Celery Beat
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from django_celery_beat.models import PeriodicTask, CrontabSchedule, IntervalSchedule
from datetime import timedelta


class Command(BaseCommand):
    help = 'Vérifier et corriger les problèmes de Celery Beat (timezone, timestamps, etc.)'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix',
            action='store_true',
            help='Corriger automatiquement les problèmes détectés',
        )
        parser.add_argument(
            '--force-reinit',
            action='store_true',
            help='Réinitialiser toutes les tâches',
        )

    def handle(self, *args, **options):
        fix = options['fix']
        force_reinit = options['force_reinit']

        self.stdout.write(self.style.SUCCESS('\n📋 Vérification de Celery Beat\n'))

        # Vérifier les tâches
        issues_found = self._check_periodic_tasks(fix)

        # Vérifier les schedules
        issues_found += self._check_schedules(fix)

        # Réinitialiser si demandé
        if force_reinit:
            self._reinitialize_tasks()

        if not issues_found and not force_reinit:
            self.stdout.write(self.style.SUCCESS('✅ Aucun problème détecté!\n'))

    def _check_periodic_tasks(self, fix=False):
        """Vérifier les tâches périodiques"""
        issues = 0
        tasks = PeriodicTask.objects.all()

        self.stdout.write(f'\n🔍 Vérification de {tasks.count()} tâche(s):')

        for task in tasks:
            # Vérifier start_time
            if task.start_time is None:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  {task.name}: start_time est NULL')
                )
                if fix:
                    task.start_time = timezone.now()
                    task.save()
                    self.stdout.write(self.style.SUCCESS(f'     ✓ Corrigé'))
                issues += 1

            # Vérifier timezone
            if task.start_time:
                if timezone.is_naive(task.start_time):
                    self.stdout.write(
                        self.style.WARNING(f'  ⚠️  {task.name}: Datetime naive (sans timezone)')
                    )
                    if fix:
                        # Convertir en aware
                        task.start_time = timezone.make_aware(task.start_time)
                        task.save()
                        self.stdout.write(self.style.SUCCESS(f'     ✓ Corrigé'))
                    issues += 1

            # Vérifier que la tâche existe
            if task.task:
                try:
                    from celery import current_app
                    current_app.tasks[task.task]
                except KeyError:
                    self.stdout.write(
                        self.style.ERROR(f'  ❌ {task.name}: Tâche "{task.task}" non trouvée')
                    )
                    issues += 1

        return issues

    def _check_schedules(self, fix=False):
        """Vérifier les schedules"""
        issues = 0

        # Vérifier Crontab
        crontabs = CrontabSchedule.objects.all()
        self.stdout.write(f'\n🔍 Vérification de {crontabs.count()} Crontab(s):')

        for crontab in crontabs:
            # Vérifier que la tâche existe
            tasks_using = PeriodicTask.objects.filter(crontab=crontab)
            if tasks_using.count() == 0:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Crontab inutilisé: {crontab}')
                )
                if fix:
                    crontab.delete()
                    self.stdout.write(self.style.SUCCESS(f'     ✓ Supprimé'))
                issues += 1

        # Vérifier Interval
        intervals = IntervalSchedule.objects.all()
        self.stdout.write(f'\n🔍 Vérification de {intervals.count()} Interval(s):')

        for interval in intervals:
            tasks_using = PeriodicTask.objects.filter(interval=interval)
            if tasks_using.count() == 0:
                self.stdout.write(
                    self.style.WARNING(f'  ⚠️  Interval inutilisé: {interval}')
                )
                if fix:
                    interval.delete()
                    self.stdout.write(self.style.SUCCESS(f'     ✓ Supprimé'))
                issues += 1

        return issues

    def _reinitialize_tasks(self):
        """Réinitialiser toutes les tâches"""
        self.stdout.write(self.style.WARNING('\n⚠️  Réinitialisation des tâches...'))

        # Supprimer toutes les tâches
        PeriodicTask.objects.all().delete()
        CrontabSchedule.objects.all().delete()
        IntervalSchedule.objects.all().delete()

        # Recréer les tâches par défaut
        self._create_default_tasks()

    def _create_default_tasks(self):
        """Créer les tâches par défaut"""
        from celery.schedules import crontab

        self.stdout.write('\n📝 Création des tâches par défaut:')

        # Rappel de dépôt: 22e du mois à 09:00
        schedule, created = CrontabSchedule.objects.get_or_create(
            minute=0,
            hour=9,
            day_of_month=22,
            month_of_year='*',
            day_of_week='*',
        )

        task, created = PeriodicTask.objects.get_or_create(
            name='Rappel Dépôt Mensuel (22e du mois)',
            defaults={
                'task': 'apps.notifications.tasks.send_subscription_reminder_email',
                'crontab': schedule,
                'enabled': True,
                'start_time': timezone.now(),
            }
        )
        status = '✓ Créée' if created else '✓ Existe déjà'
        self.stdout.write(self.style.SUCCESS(f'  {status}: {task.name}'))

        # Nettoyage: Chaque jour à 02:00
        schedule, _ = CrontabSchedule.objects.get_or_create(
            minute=0,
            hour=2,
            day_of_month='*',
            month_of_year='*',
            day_of_week='*',
        )

        task, created = PeriodicTask.objects.get_or_create(
            name='Nettoyage Notifications (Quotidien)',
            defaults={
                'task': 'apps.notifications.tasks.cleanup_old_notifications',
                'crontab': schedule,
                'enabled': True,
                'start_time': timezone.now(),
            }
        )
        status = '✓ Créée' if created else '✓ Existe déjà'
        self.stdout.write(self.style.SUCCESS(f'  {status}: {task.name}'))

        self.stdout.write(self.style.SUCCESS('\n✅ Tâches par défaut créées!'))
