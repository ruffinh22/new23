from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from .views import RoutingRuleViewSet, DepartmentDocumentTypeViewSet

router = SafeDefaultRouter()
router.register(r'document-types', DepartmentDocumentTypeViewSet, basename='document-type')
router.register(r'', RoutingRuleViewSet, basename='routing-rule')

urlpatterns = [
    path('', include(router.urls)),
]
