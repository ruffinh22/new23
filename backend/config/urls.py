# ============================================================
# FILE: backend/config/urls.py
# ============================================================
"""
URL Configuration for SGDRA project.

Static files are served by WhiteNoise middleware (production-grade solution)
that handles both development and production efficiently.
"""

from django.contrib import admin
from django.urls import path, include, re_path
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularSwaggerView,
    SpectacularRedocView,
)
from apps.common.views import health_check, readiness_check, liveness_check
from apps.common.frontend_views import FrontendView

urlpatterns = [
    # Admin
    path("admin/", admin.site.urls),
    # Health & Monitoring Endpoints
    path("health/", health_check, name="health-check"),
    path("ready/", readiness_check, name="readiness-check"),
    path("live/", liveness_check, name="liveness-check"),
    # API Documentation
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/docs/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # API Endpoints
    path("api/auth/", include("apps.users.urls")),
    path("api/", include("apps.common.urls")),
    path("api/documents/", include("apps.documents.urls")),
    path("api/folders/", include("apps.folders.urls")),
    path("api/routing-rules/", include("apps.routing_rules.urls")),
    path("api/notifications/", include("apps.notifications.urls")),
    path("api/scheduling/", include("apps.scheduling.urls")),
    # Frontend (React SPA) - Must be LAST (catches all remaining routes)
    # Static files are served by WhiteNoise middleware (production-grade)
    # Exclude /static/, /media/, and /api/ from this catch-all to allow Django to handle them
    # Pattern: match anything that doesn't start with /static/, /media/, or /api/
    re_path(
        r"^(?!static/|media/|api/)(?P<path>.*)$",
        FrontendView.as_view(),
        name="frontend",
    ),
]

# Admin site customization
admin.site.site_header = "SGDRA Administration"
admin.site.site_title = "SGDRA Admin"
admin.site.index_title = "Gestion du Système"
