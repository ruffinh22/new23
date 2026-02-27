"""
Tests unitaires pour les modèles User et validations de rôles.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.folders.models import Folder

User = get_user_model()


class UserModelTests(TestCase):
    """Tests pour le modèle User avec les rôles."""

    def setUp(self):
        """Prépare les données de test."""
        # Créer un pôle pour les tests de rôle
        self.pole = Folder.objects.create(
            name="Pôle Commercial", folder_type="pole", code="POL_COM"
        )

        # Créer une filiale sous le pôle
        self.filiale = Folder.objects.create(
            name="Filiale Benin",
            folder_type="filiale",
            code="FIL_BEN",
            parent=self.pole,
        )

        # Créer un service sous la filiale
        self.service = Folder.objects.create(
            name="Service Admin",
            folder_type="service",
            code="SVC_ADM",
            parent=self.filiale,
        )

    def test_agent_role_creation(self):
        """Test la création d'un utilisateur avec le rôle AGENT."""
        user = User.objects.create_user(
            matricule="AGENT_001",
            email="agent@test.com",
            password="pass123",
            role="AGENT",
        )
        self.assertEqual(user.role, "AGENT")
        self.assertTrue(user.is_agent)
        self.assertFalse(user.is_admin)

    def test_pole_manager_role(self):
        """Test la création d'un utilisateur POLE_MANAGER."""
        user = User.objects.create_user(
            matricule="POLE_MGR_001",
            email="polemgr@test.com",
            password="pass123",
            role="POLE_MANAGER",
            pole=self.pole,
        )
        self.assertEqual(user.role, "POLE_MANAGER")
        self.assertTrue(user.is_pole_manager)
        self.assertEqual(user.pole, self.pole)

    def test_admin_role(self):
        """Test la création d'un utilisateur ADMIN."""
        user = User.objects.create_user(
            matricule="ADMIN_001",
            email="admin@test.com",
            password="pass123",
            role="ADMIN",
        )
        self.assertTrue(user.is_admin)
        self.assertFalse(user.is_agent)

    def test_has_access_to_folder_admin(self):
        """Test que ADMIN a accès à tous les dossiers."""
        admin = User.objects.create_user(
            matricule="ADMIN_001",
            email="admin@test.com",
            password="pass123",
            role="ADMIN",
        )

        self.assertTrue(admin.has_access_to_folder(self.pole))
        self.assertTrue(admin.has_access_to_folder(self.filiale))
        self.assertTrue(admin.has_access_to_folder(self.service))

    def test_has_access_to_folder_pole_manager(self):
        """Test que POLE_MANAGER a accès à son pôle et ses enfants."""
        pole_mgr = User.objects.create_user(
            matricule="POLE_MGR_001",
            email="polemgr@test.com",
            password="pass123",
            role="POLE_MANAGER",
            pole=self.pole,
        )

        self.assertTrue(pole_mgr.has_access_to_folder(self.pole))
        self.assertTrue(pole_mgr.has_access_to_folder(self.filiale))
        self.assertTrue(pole_mgr.has_access_to_folder(self.service))

    def test_has_access_to_folder_agent_restricted(self):
        """Test que AGENT n'a accès qu'à son service."""
        agent = User.objects.create_user(
            matricule="AGENT_001",
            email="agent@test.com",
            password="pass123",
            role="AGENT",
            department=self.service,
        )

        # Agent devrait n'avoir accès qu'à son service
        self.assertTrue(agent.has_access_to_folder(self.service))
        self.assertFalse(agent.has_access_to_folder(self.filiale))
        self.assertFalse(agent.has_access_to_folder(self.pole))


class UserSerializerTests(TestCase):
    """Tests pour les serializers User."""

    def setUp(self):
        """Prépare les données de test."""
        self.pole = Folder.objects.create(name="Pôle Test", folder_type="pole")

    def test_user_detail_serializer_output(self):
        """Test que le serializer retourne les informations correctes."""
        from apps.users.serializers import UserDetailSerializer

        user = User.objects.create_user(
            matricule="USER_001",
            email="user@test.com",
            password="pass123",
            role="POLE_MANAGER",
            pole=self.pole,
        )

        serializer = UserDetailSerializer(user)
        data = serializer.data

        self.assertEqual(data["matricule"], "USER_001")
        self.assertEqual(data["email"], "user@test.com")
        self.assertEqual(data["role"], "POLE_MANAGER")
        self.assertTrue(data["is_pole_manager"])
        self.assertIn("id", data)
