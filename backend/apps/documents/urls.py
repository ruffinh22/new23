from django.urls import path, include
from apps.common.routers import SafeDefaultRouter
from .views import (
    DocumentViewSet,
    DocumentSpecificationViewSet,
    DocumentValidationResultViewSet,
    DocumentShareViewSet,
)
from .file_config_views import FileTypeConfigurationViewSet
from .viewsets_templates import DocumentTemplateViewSet

router = SafeDefaultRouter()
router.register(r'templates', DocumentTemplateViewSet, basename='document-template')
router.register(r'file-type-configurations', FileTypeConfigurationViewSet, basename='file-type-configuration')
router.register(r'specifications', DocumentSpecificationViewSet, basename='document-specification')
router.register(r'validation-results', DocumentValidationResultViewSet, basename='document-validation-result')
router.register(r'shares', DocumentShareViewSet, basename='document-share')
router.register(r'', DocumentViewSet, basename='document')

urlpatterns = [
    path('', include(router.urls)),
]
