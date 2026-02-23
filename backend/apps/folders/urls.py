from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from .views import (
    FolderViewSet,
    PoleViewSet,
    FilialeViewSet,
    ServiceViewSet,
)

router = SafeDefaultRouter()
router.register(r'folders', FolderViewSet, basename='folder')
router.register(r'poles', PoleViewSet, basename='pole')
router.register(r'filiales', FilialeViewSet, basename='filiale')
router.register(r'services', ServiceViewSet, basename='service')

urlpatterns = [
    path('', include(router.urls)),
]
