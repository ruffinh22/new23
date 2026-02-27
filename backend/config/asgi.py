# ============================================================
# FILE: backend/config/asgi.py
# ============================================================
"""
ASGI config for SGDRA project with WebSocket support via Django Channels.
"""

import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

# Initialize Django first
django_asgi_app = get_asgi_application()

# Now import websocket patterns and JWT middleware after Django is ready
from config.routing import get_websocket_urlpatterns
from config.jwt_middleware import JwtAuthMiddleware

application = ProtocolTypeRouter(
    {
        # Django's standard HTTP/HTTPS types (handled by Django)
        "http": django_asgi_app,
        # WebSocket types (handled by Channels with JWT authentication)
        "websocket": JwtAuthMiddleware(URLRouter(get_websocket_urlpatterns())),
    }
)
