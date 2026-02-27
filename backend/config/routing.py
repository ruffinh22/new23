"""
Routage WebSocket pour Django Channels.
✅ Support des notifications et audit en temps réel
"""

from django.urls import re_path


def get_websocket_urlpatterns():
    """
    Retourne les patterns WebSocket.
    Importé de manière différée pour éviter les problèmes d'initialisation Django.
    """
    from config.consumers import NotificationConsumer, AuditLogConsumer

    return [
        # WebSocket pour les notifications en temps réel
        re_path(
            r"ws/notifications/$",
            NotificationConsumer.as_asgi(),
            name="ws-notifications",
        ),
        # WebSocket pour l'audit en temps réel (ADMIN ONLY)
        re_path(r"ws/auditlog/$", AuditLogConsumer.as_asgi(), name="ws-auditlog"),
    ]


websocket_urlpatterns = []  # Placeholder, sera rempli après Django initialization
