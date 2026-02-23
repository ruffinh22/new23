"""
Routage WebSocket pour Django Channels.
"""

from django.urls import path

def get_websocket_urlpatterns():
    """
    Retourne les patterns WebSocket.
    Importé de manière différée pour éviter les problèmes d'initialisation Django.
    """
    from apps.notifications.consumers import NotificationConsumer
    return [
        path('ws/notifications/', NotificationConsumer.as_asgi(), name='ws-notifications'),
    ]

websocket_urlpatterns = []  # Placeholder, sera rempli après Django initialization

