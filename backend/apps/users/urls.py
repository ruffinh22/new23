from django.urls import path, include
from django.views.decorators.csrf import csrf_exempt
from apps.common.routers import SafeDefaultRouter
from .views import (
    UserViewSet,
    DepartmentViewSet,
    BranchViewSet,
    CustomTokenObtainPairView,
)
from rest_framework_simplejwt.views import TokenRefreshView

router = SafeDefaultRouter()
router.register(r"branches", BranchViewSet, basename="branch")
router.register(r"departments", DepartmentViewSet, basename="department")
router.register(r"users", UserViewSet, basename="user")

urlpatterns = [
    # User management
    path("", include(router.urls)),
    # JWT Authentication (CSRF exempt because they use Authorization header, not session cookies)
    path(
        "token/",
        csrf_exempt(CustomTokenObtainPairView.as_view()),
        name="token_obtain_pair",
    ),
    path(
        "token/refresh/", csrf_exempt(TokenRefreshView.as_view()), name="token_refresh"
    ),
]
