from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from .views import NotificationViewSet

router = SafeDefaultRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    path("", include(router.urls)),
]
