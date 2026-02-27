"""
Custom authentication backend for User model with matricule field.
"""

from django.contrib.auth.backends import ModelBackend
from django.contrib.auth import get_user_model

User = get_user_model()


class MatriculeBackend(ModelBackend):
    """
    Authenticate using matricule instead of username.
    """

    def authenticate(self, request, matricule=None, password=None, **kwargs):
        """
        Authenticate user with matricule and password.
        """
        if matricule is None or password is None:
            return None

        try:
            user = User.objects.get(matricule=matricule)
        except User.DoesNotExist:
            return None

        if user.check_password(password) and self.user_can_authenticate(user):
            return user

        return None

    def get_user(self, user_id):
        """Get user by id."""
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
