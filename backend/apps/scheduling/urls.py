from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EmailScheduleViewSet, EventViewSet

router = DefaultRouter()
router.register(r'email-schedules', EmailScheduleViewSet, basename='email-schedule')
router.register(r'events', EventViewSet, basename='event')

urlpatterns = [
    path('', include(router.urls)),
]
