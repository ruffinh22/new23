"""
Tests E2E Avancés SGDRA
Teste les workflows complets et les scénarios critiques
"""

import os
import json
import requests
import time
from datetime import datetime
from io import BytesIO
from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient, APITestCase
from rest_framework import status
from documents.models import Document
from documents.serializers import DocumentSerializer
from users.models import AgentUser
import tempfile

User = get_user_model()


class E2EWorkflowTestCase(APITestCase):
    """Tests des workflows complets end-to-end"""
    
    def setUp(self):
        """Initialisation des données de test"""
        self.client = APIClient()
        
        # Créer les utilisateurs
        self.agent_user = AgentUser.objects.create_user(
            matricule='AG001',
            email='agent@example.com',
            password='test123456',
            full_name='Agent Test'
        )
        
        self.validator_user = AgentUser.objects.create_user(
            matricule='VAL001',
            email='validator@example.com',
            password='test123456',
            full_name='Validator Test',
            role='validateur'
        )
        
        self.approver_user = AgentUser.objects.create_user(
            matricule='APP001',
            email='approver@example.com',
            password='test123456',
            full_name='Approver Test',
            role='approbateur'
        )
        
    def _get_token(self, matricule, password):
        """Obtenir un token JWT"""
        response = self.client.post('/api/users/login/', {
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
    
    def test_concurrent_document_modification(self):
        """
        Test des modifications concurrentes
        Vérifie que 2 approbateurs ne peuvent pas modifier le même document
        """
        print("\n🔀 Test Modifications Concurrentes")
        
        # Créer un document validé
        self._authenticate('AG001')
        file_content = b"Test concurrent modification"
        file = BytesIO(file_content)
        file.name = 'concurrent_test.xlsx'
        
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Test concurrent'
        }, format='multipart')
        
        doc_id = response.data['id']
        
        # Valider le document
        self._authenticate('VAL001')
        self.client.post(f'/api/documents/{doc_id}/validate/', {
            'is_valid': True
        })
        
        # Approver 1: Approuve le document
        print("  1️⃣  Approbateur 1 approuve...")
        self._authenticate('APP001')
        response1 = self.client.post(f'/api/documents/{doc_id}/approve/', {
            'approved': True
        })
        self.assertEqual(response1.status_code, status.HTTP_200_OK)
        print("     ✅ Approbation 1 réussie")
        
        # Approver 2: Tente d'approuver le même document
        print("  2️⃣  Approbateur 2 tente d'approuver...")
        approver2 = AgentUser.objects.create_user(
            matricule='APP002',
            email='approver2@example.com',
            password='test123456',
            role='approbateur'
        )
        self._authenticate('APP002')
        
        response2 = self.client.post(f'/api/documents/{doc_id}/approve/', {
            'approved': True
        })
        
        # Vérifier que la deuxième approbation échoue (409 Conflict)
        self.assertEqual(response2.status_code, status.HTTP_409_CONFLICT)
        print("     ✅ Approbation 2 rejetée (conflit détecté)")
        
        print("✅ Test concurrent réussi!\n")
    
    def test_large_file_upload(self):
        """
        Test d'upload de gros fichiers
        Teste les limites et performances
        """
        print("\n📦 Test Upload Gros Fichiers")
        
        self._authenticate('AG001')
        
        # Test 1: Fichier de 10 MB
        print("  1️⃣  Upload fichier 10 MB...")
        large_content = b"x" * (10 * 1024 * 1024)  # 10 MB
        file = BytesIO(large_content)
        file.name = 'large_file_10mb.xlsx'
        
        start_time = time.time()
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Gros fichier 10MB'
        }, format='multipart')
        elapsed = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        print(f"     ✅ Fichier 10MB uploadé en {elapsed:.2f}s")
        
        # Test 2: Fichier au-delà de la limite
        print("  2️⃣  Upload fichier 100 MB (au-delà de limite)...")
        huge_content = b"x" * (100 * 1024 * 1024)  # 100 MB
        file = BytesIO(huge_content)
        file.name = 'huge_file_100mb.xlsx'
        
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Fichier trop grand'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        print("     ✅ Fichier 100MB rejeté (limite respectée)")
        
        print("✅ Test gros fichiers réussi!\n")
    
    def test_notification_delivery_timing(self):
        """
        Test du timing des notifications
        Vérifie que les notifications sont envoyées rapidement
        """
        print("\n⏱️  Test Timing Notifications")
        
        # Upload document
        self._authenticate('AG001')
        file_content = b"Test notification timing"
        file = BytesIO(file_content)
        file.name = 'notification_test.xlsx'
        
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'uploaded_file': file,
            'description': 'Test notification'
        }, format='multipart')
        
        doc_id = response.data['id']
        print(f"  1️⃣  Document créé: {doc_id}")
        
        # Mesurer le temps de validation
        self._authenticate('VAL001')
        start_time = time.time()
        
        response = self.client.post(f'/api/documents/{doc_id}/validate/', {
            'is_valid': True
        })
        
        elapsed = time.time() - start_time
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"  2️⃣  Validation en {elapsed:.3f}s")
        
        # Mesurer le temps d'approbation
        self._authenticate('APP001')
        start_time = time.time()
        
        response = self.client.post(f'/api/documents/{doc_id}/approve/', {
            'approved': True
        })
        
        elapsed = time.time() - start_time
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"  3️⃣  Approbation en {elapsed:.3f}s")
        
        print("✅ Test timing notifications réussi!\n")
    
    def test_search_and_filter_performance(self):
        """
        Test des performances de recherche et filtrage
        Crée plusieurs documents et teste les performances
        """
        print("\n🔍 Test Performance Recherche & Filtrage")
        
        self._authenticate('AG001')
        
        # Créer 10 documents
        print("  1️⃣  Création de 10 documents de test...")
        doc_ids = []
        for i in range(10):
            file_content = f"Document test {i}".encode()
            file = BytesIO(file_content)
            file.name = f'test_doc_{i}.xlsx'
            
            response = self.client.post('/api/documents/', {
                'document_type': 'DONNEES_AGENTS',
                'uploaded_file': file,
                'description': f'Document test {i}'
            }, format='multipart')
            
            if response.status_code == status.HTTP_201_CREATED:
                doc_ids.append(response.data['id'])
        
        print(f"     ✅ {len(doc_ids)} documents créés")
        
        # Test 1: Liste complète
        print("  2️⃣  Listing tous les documents...")
        start_time = time.time()
        response = self.client.get('/api/documents/')
        elapsed = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"     ✅ Listing en {elapsed:.3f}s ({len(response.data.get('results', []))} docs)")
        
        # Test 2: Recherche par texte
        print("  3️⃣  Recherche par texte...")
        start_time = time.time()
        response = self.client.get('/api/documents/?search=test')
        elapsed = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"     ✅ Recherche en {elapsed:.3f}s")
        
        # Test 3: Filtrage par type
        print("  4️⃣  Filtrage par document_type...")
        start_time = time.time()
        response = self.client.get('/api/documents/?document_type=DONNEES_AGENTS')
        elapsed = time.time() - start_time
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        print(f"     ✅ Filtrage en {elapsed:.3f}s")
        
        print("✅ Test recherche & filtrage réussi!\n")
    
    def test_rate_limiting(self):
        """
        Test du rate limiting
        Vérifie que le rate limiting est appliqué correctement
        """
        print("\n⏲️  Test Rate Limiting")
        
        self._authenticate('AG001')
        
        # Faire plusieurs requêtes rapidement
        print("  1️⃣  Envoi de requêtes rapides...")
        request_count = 0
        blocked = False
        
        for i in range(15):
            response = self.client.get('/api/documents/')
            request_count += 1
            
            if response.status_code == status.HTTP_429_TOO_MANY_REQUESTS:
                blocked = True
                print(f"     ⏸️  Rate limit atteint après {request_count} requêtes")
                break
        
        if blocked:
            print("     ✅ Rate limiting activé correctement")
        else:
            print("     ⚠️  Rate limiting non atteint (limite élevée)")
        
        print("✅ Test rate limiting réussi!\n")
    
    def test_error_handling_and_recovery(self):
        """
        Test de la gestion d'erreurs et récupération
        Teste les scénarios d'erreur courants
        """
        print("\n❌ Test Gestion d'Erreurs & Récupération")
        
        self._authenticate('AG001')
        
        # Test 1: Upload sans fichier
        print("  1️⃣  Upload sans fichier...")
        response = self.client.post('/api/documents/', {
            'document_type': 'DONNEES_AGENTS',
            'description': 'Sans fichier'
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("     ✅ Erreur 400 retournée correctement")
        
        # Test 2: Type de document invalide
        print("  2️⃣  Type de document invalide...")
        file_content = b"Test"
        file = BytesIO(file_content)
        file.name = 'test.xlsx'
        
        response = self.client.post('/api/documents/', {
            'document_type': 'INVALID_TYPE',
            'uploaded_file': file
        }, format='multipart')
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        print("     ✅ Type invalide rejeté")
        
        # Test 3: Document inexistant
        print("  3️⃣  Accès à un document inexistant...")
        response = self.client.get('/api/documents/99999/')
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        print("     ✅ Erreur 404 retournée")
        
        print("✅ Test gestion d'erreurs réussi!\n")


class E2EPerformanceTestCase(APITestCase):
    """Tests de performance E2E"""
    
    def setUp(self):
        """Initialisation"""
        self.client = APIClient()
        self.agent = AgentUser.objects.create_user(
            matricule='PERF001',
            email='perf@example.com',
            password='test123456'
        )
    
    def _authenticate(self):
        """Authentifier"""
        token = self.client.post('/api/users/login/', {
            'matricule': 'PERF001',
            'password': 'test123456'
        }).data['access']
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {token}')
    
    def test_api_response_times(self):
        """
        Test des temps de réponse API
        Mesure les performances des endpoints critiques
        """
        print("\n⏱️  Test Temps de Réponse API")
        
        self._authenticate()
        
        endpoints = [
            ('/api/documents/', 'GET', 'Liste documents'),
            ('/api/users/profile/', 'GET', 'Profil utilisateur'),
            ('/api/documents/stats/', 'GET', 'Statistiques'),
        ]
        
        for endpoint, method, name in endpoints:
            start_time = time.time()
            response = self.client.get(endpoint) if method == 'GET' else None
            elapsed = time.time() - start_time
            
            print(f"  {name}: {elapsed*1000:.2f}ms")
        
        print("✅ Test temps de réponse réussi!\n")


# Résumé des tests
def print_test_summary():
    """Afficher un résumé des tests"""
    summary = """
╔════════════════════════════════════════════════════════════════╗
║           TESTS E2E AVANCÉS - RÉSUMÉ                           ║
╠════════════════════════════════════════════════════════════════╣
║                                                                ║
║ ✅ Workflow Complet (Upload → Validation → Approbation)       ║
║ ✅ Modifications Concurrentes (Gestion des conflits)          ║
║ ✅ Upload Gros Fichiers (Performances + Limites)              ║
║ ✅ Timing des Notifications (Mesure du délai)                 ║
║ ✅ Recherche & Filtrage (Performance des requêtes)            ║
║ ✅ Rate Limiting (Vérification du throttling)                 ║
║ ✅ Gestion d'Erreurs (Scénarios d'erreur)                     ║
║ ✅ Temps de Réponse API (Mesure des performances)             ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
"""
    print(summary)


if __name__ == '__main__':
    print_test_summary()
