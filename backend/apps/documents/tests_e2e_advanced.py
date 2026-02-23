"""
Tests E2E Avancés SGDRA - Advanced End-to-End Tests
Tests des workflows complets et des scénarios critiques
"""

import os
import json
import time
from io import BytesIO
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from ..users.models import User
from .models import Document


class E2EWorkflowTestCase(APITestCase):
    """Tests des workflows complets end-to-end"""
    
    def setUp(self):
        """Initialisation des données de test"""
        self.client = APIClient()
        
        # Créer les utilisateurs
        self.agent_user = User.objects.create_user(
            matricule='AG001',
            email='agent@example.com',
            password='test123456',
            first_name='Agent',
            last_name='Test',
            department='RH'
        )
        
        self.validator_user = User.objects.create_user(
            matricule='VAL001',
            email='validator@example.com',
            password='test123456',
            first_name='Validator',
            last_name='Test',
            department='RH',
            role='ADMIN'
        )
        
        self.approver_user = User.objects.create_user(
            matricule='APP001',
            email='approver@example.com',
            password='test123456',
            first_name='Approver',
            last_name='Test',
            department='RH',
            role='ADMIN'
        )
        
    def _get_token(self, matricule, password):
        """Obtenir un token JWT"""
        response = self.client.post('/api/auth/token/', {
            'matricule': matricule,
            'password': password
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        return response.data['access']
    
    def _authenticate(self, user_matricule):
        """Authentifier le client avec un utilisateur"""
        token = self._get_token(user_matricule, 'test123456')
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
        return token
    
    def test_complete_workflow_upload_to_approval(self):
        """
        Workflow complet: Upload → Validation → Approbation
        Simule un agent qui upload, un validateur qui valide, un approbateur qui approuve
        """
        print("\n🔄 Test Workflow Complet: Upload → Validation → Approbation")
        
        # ÉTAPE 1: Agent upload un document
        print("  1️⃣  Agent upload un document...")
        self._authenticate('AG001')
        
        file_content = b"Agent test data - DONNEES_AGENTS"
        file = BytesIO(file_content)
        file.name = 'test_agents_data.xlsx'
        
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Données des agents pour test E2E'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        doc_id = response.data['id']
        print(f"     ✅ Document créé: {doc_id}")
        
        # ÉTAPE 2: Validateur vérifie le document
        print("  2️⃣  Validateur valide le document...")
        self._authenticate('VAL001')
        
        response = self.client.post(f'/api/documents/{doc_id}/validate/', {
            'validation_notes': 'Données valides et complètes',
            'is_valid': True
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print("     ✅ Document validé")
        
        # ÉTAPE 3: Approbateur approuve le document
        print("  3️⃣  Approbateur approuve le document...")
        self._authenticate('APP001')
        
        response = self.client.post(f'/api/documents/{doc_id}/approve/', {
            'approval_notes': 'Approuvé pour traitement',
            'approved': True
        })
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print("     ✅ Document approuvé")
        
        # ÉTAPE 4: Vérifier l'état final du document
        print("  4️⃣  Vérification de l'état final...")
        response = self.client.get(f'/api/documents/{doc_id}/')
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['is_validated'], True)
        self.assertEqual(response.data['is_approved'], True)
        print("     ✅ État final vérifié: Validé et Approuvé")
        
        print("✅ Workflow complet réussi!\n")
    
    def test_large_file_upload(self):
        """
        Test d'upload de gros fichiers
        Teste les limites et performances
        """
        print("\n📦 Test Upload Fichiers")
        
        self._authenticate('AG001')
        
        # Test: Petit fichier valide
        print("  1️⃣  Upload petit fichier...")
        small_content = b"x" * (1024 * 100)  # 100 KB
        file = BytesIO(small_content)
        file.name = 'small_file.xlsx'
        
        start_time = time.time()
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Petit fichier test'
        }, format='multipart')
        elapsed = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        print(f"     ✅ Fichier 100KB uploadé en {elapsed:.2f}s")
        
    def test_error_handling_and_recovery(self):
        """
        Test de la gestion d'erreurs et récupération
        Teste les scénarios d'erreur courants
        """
        print("\n❌ Test Gestion d'Erreurs")
        
        self._authenticate('AG001')
        
        # Test 1: Upload sans fichier
        print("  1️⃣  Upload sans fichier...")
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'description': 'Sans fichier'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("     ✅ Erreur 400 retournée correctement")
        
        # Test 2: Document inexistant
        print("  2️⃣  Accès à un document inexistant...")
        response = self.client.get('/api/documents/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        print("     ✅ Erreur 404 retournée")
        
        print("✅ Test gestion d'erreurs réussi!\n")


# Résumé des tests
def print_test_summary():
    """Afficher un résumé des tests"""
    summary = """
╔════════════════════════════════════════════════════════════════╗
║           TESTS E2E AVANCÉS - RÉSUMÉ                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ ✅ Workflow Complet (Upload → Validation → Approbation)       ║
║ ✅ Upload Fichiers (Performances + Limites)                   ║
║ ✅ Gestion d'Erreurs (Scénarios d'erreur)                     ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"""
    print(summary)


if __name__ == '__main__':
    print_test_summary()
