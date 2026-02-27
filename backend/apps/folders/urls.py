from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from .views import (
    FolderViewSet,
    PoleViewSet,
    FilialeViewSet,
    ServiceViewSet,
)

router = SafeDefaultRouter()
# Register specific viewsets FIRST (more specific routes must come before generic ones)
router.register(r"poles", PoleViewSet, basename="pole")
router.register(r"filiales", FilialeViewSet, basename="filiale")
router.register(r"services", ServiceViewSet, basename="service")
# Register generic folder viewset last (catches remaining routes)
router.register(r"", FolderViewSet, basename="folder")

urlpatterns = [
    path("", include(router.urls)),
]
