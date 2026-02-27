from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "Notifications"

    def ready(self):
        """Import tasks and signals when the app is ready"""
        import apps.notifications.tasks  # noqa
        import apps.notifications.signals  # noqa
