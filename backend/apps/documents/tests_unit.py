"""
Tests unitaires pour les modèles et serializers des documents.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from apps.folders.models import Folder
from apps.documents.models import Document, DocumentShare

User = get_user_model()


class DocumentModelTests(TestCase):
    """Tests pour le modèle Document."""

    def setUp(self):
        """Prépare les données de test."""
        # Créer un agent
        self.agent = User.objects.create_user(
            matricule="TEST_AGENT_001", email="agent@test.com", password="testpass123"
        )

        # Créer un dossier
        self.folder = Folder.objects.create(
            name="Test Folder", folder_type="service", code="TEST_SVC"
        )

    def test_document_creation(self):
        """Test la création d'un document valide."""
        doc = Document.objects.create(
            title="Test Document",
            document_type="FACTURE",
            status="NOUVEAU",
            agent=self.agent,
            folder=self.folder,
            file_size=1024,
            mime_type="application/pdf",
            file_format="pdf",
        )
        self.assertEqual(doc.title, "Test Document")
        self.assertEqual(doc.status, "NOUVEAU")
        self.assertEqual(doc.agent, self.agent)

    def test_document_title_validation(self):
        """Test que le titre doit faire au moins 3 caractères."""
        from django.core.exceptions import ValidationError

        doc = Document(
            title="AB",  # Trop court
            document_type="FACTURE",
            status="NOUVEAU",
            agent=self.agent,
            folder=self.folder,
        )
        with self.assertRaises(ValidationError):
            doc.full_clean()

    def test_document_default_status(self):
        """Test que le statut par défaut est NOUVEAU."""
        doc = Document.objects.create(
            title="Test Document",
            document_type="CONTRAT",
            agent=self.agent,
            folder=self.folder,
        )
        self.assertEqual(doc.status, "NOUVEAU")


class DocumentShareModelTests(TestCase):
    """Tests pour le modèle DocumentShare."""

    def setUp(self):
        """Prépare les données de test."""
        # Créer 2 utilisateurs
        self.user1 = User.objects.create_user(
            matricule="USER_001", email="user1@test.com", password="pass123"
        )
        self.user2 = User.objects.create_user(
            matricule="USER_002", email="user2@test.com", password="pass123"
        )

        # Créer un dossier et un document
        self.folder = Folder.objects.create(name="Test Folder", folder_type="service")
        self.document = Document.objects.create(
            title="Shared Document",
            document_type="FACTURE",
            agent=self.user1,
            folder=self.folder,
        )

    def test_document_share_creation(self):
        """Test la création d'un partage de document."""
        share = DocumentShare.objects.create(
            document=self.document,
            shared_by=self.user1,
            shared_with=self.user2,
            permission="VIEW",
        )
        self.assertEqual(share.permission, "VIEW")
        self.assertTrue(share.is_valid())

    def test_document_share_all_permissions(self):
        """Test toutes les permissions de partage."""
        permissions = ["VIEW", "COMMENT", "DOWNLOAD", "EDIT", "SHARE"]

        for i, perm in enumerate(permissions):
            user = User.objects.create_user(
                matricule=f"TEST_USER_{i}",
                email=f"user{i}@test.com",
                password="pass123",
            )
            share = DocumentShare.objects.create(
                document=self.document,
                shared_by=self.user1,
                shared_with=user,
                permission=perm,
            )
            self.assertEqual(share.permission, perm)
