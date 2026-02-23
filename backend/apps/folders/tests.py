"""
End-to-End API Tests for SGDRA Organizational Hierarchy

Tests the complete API structure:
- 8 Pôles (department types)
- 56 Filiales (7 per pôle)
- 56 Services (1 per filiale)

Run with:
    python manage.py test apps.folders.tests
"""

from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from rest_framework import status
import json

from apps.folders.models import Folder

User = get_user_model()


class FolderHierarchyTestCase(TestCase):
    """Test the organizational hierarchy structure."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data for all tests."""
        # Create test user
        cls.user = User.objects.create_user(
            matricule='TESTUSER',
            email='test@example.com',
            password='testpass123',
            first_name='Test',
            last_name='User'
        )
    
    def setUp(self):
        """Set up client and authenticate for each test."""
        self.client = Client()
        # Get JWT token
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'TESTUSER', 'password': 'testpass123'},
            content_type='application/json'
        )
        if response.status_code == 200:
            data = json.loads(response.content)
            self.token = data.get('access')
        else:
            self.token = None
    
    def _get_headers(self):
        """Get authorization headers."""
        if self.token:
            return {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
        return {}
    
    def test_hierarchy_structure(self):
        """Test that the organizational hierarchy is correctly structured."""
        poles = Folder.objects.filter(folder_type='pole')
        filiales = Folder.objects.filter(folder_type='filiale')
        services = Folder.objects.filter(folder_type='service')
        
        self.assertEqual(poles.count(), 8, "Should have 8 Pôles")
        self.assertEqual(filiales.count(), 56, "Should have 56 Filiales")
        self.assertEqual(services.count(), 56, "Should have 56 Services")
    
    def test_poles_have_filiales(self):
        """Test that each Pôle has exactly 7 Filiales."""
        poles = Folder.objects.filter(folder_type='pole')
        
        for pole in poles:
            filiales = pole.children.filter(folder_type='filiale')
            self.assertEqual(
                filiales.count(), 7,
                f"{pole.name} should have 7 Filiales but has {filiales.count()}"
            )
    
    def test_filiales_have_services(self):
        """Test that each Filiale has exactly 1 Service."""
        filiales = Folder.objects.filter(folder_type='filiale')
        
        for filiale in filiales:
            services = filiale.children.filter(folder_type='service')
            self.assertEqual(
                services.count(), 1,
                f"{filiale.name} should have 1 Service but has {services.count()}"
            )
    
    def test_service_names_match_pole_types(self):
        """Test that Service names match their parent Pôle type."""
        service_name_map = {
            'POL_ADM': 'Administration',
            'POL_COM': 'Commercial',
            'POL_DIR': 'Direction',
            'POL_FIN': 'Finance',
            'POL_INF': 'Informatique',
            'POL_LOG': 'Logistique',
            'POL_QUA': 'Qualité',
            'POL_RH': 'Ressources',
        }
        
        services = Folder.objects.filter(folder_type='service')
        for service in services:
            pole_code = service.parent.parent.code
            pole_prefix = pole_code.split('_')[1]
            
            # Service name should match pole type (allowing partial matches)
            pole_name = service.parent.parent.name
            self.assertIn(
                service.name, pole_name,
                f"Service '{service.name}' doesn't match Pôle '{pole_name}'"
            )


class PoleViewSetTestCase(TestCase):
    """Test the Pôles ViewSet API."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='POLETEST',
            email='pole@test.com',
            password='testpass123',
            first_name='Pole',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'POLETEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_list_poles(self):
        """Test GETting list of all Pôles."""
        response = self.client.get('/api/folders/poles/', **self.headers)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 8)
        self.assertEqual(len(data['results']), 8)
    
    def test_pole_detail(self):
        """Test GETting a specific Pôle."""
        pole = Folder.objects.get(code='POL_ADM')
        response = self.client.get(
            f'/api/folders/poles/{pole.id}/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['code'], 'POL_ADM')
        self.assertEqual(data['filiales_count'], 7)
    
    def test_pole_filiales_action(self):
        """Test Pôle filiales retrieval action."""
        pole = Folder.objects.get(code='POL_ADM')
        response = self.client.get(
            f'/api/folders/poles/{pole.id}/filiales/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 7)
    
    def test_poles_with_counts(self):
        """Test Pôles with statistics."""
        response = self.client.get(
            '/api/folders/poles/with_counts/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 8)
        
        # Check first pôle has all stats
        pole = data[0]
        self.assertIn('filiales_count', pole)
        self.assertIn('total_services', pole)
        self.assertIn('total_folders', pole)
        self.assertEqual(pole['filiales_count'], 7)
        self.assertEqual(pole['total_services'], 7)


class FilialeViewSetTestCase(TestCase):
    """Test the Filiales ViewSet API."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='FILTEST',
            email='fil@test.com',
            password='testpass123',
            first_name='Fil',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'FILTEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_list_filiales(self):
        """Test GETting list of all Filiales."""
        response = self.client.get('/api/folders/filiales/', **self.headers)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 56)
    
    def test_filiale_detail(self):
        """Test GETting a specific Filiale."""
        filiale = Folder.objects.get(code='POL_ADM_EN')
        response = self.client.get(
            f'/api/folders/filiales/{filiale.id}/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['code'], 'POL_ADM_EN')
        self.assertEqual(data['name'], 'Bénin')
        self.assertEqual(data['services_count'], 1)
    
    def test_filiales_by_pole(self):
        """Test Filiales grouped by Pôle."""
        response = self.client.get(
            '/api/folders/filiales/by_pole/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 8)  # 8 pôles
        
        # Check first pôle's group
        group = data[0]
        self.assertIn('filiales', group)
        self.assertEqual(group['filiales_count'], 7)
        self.assertEqual(len(group['filiales']), 7)
    
    def test_filiales_by_country(self):
        """Test Filiales grouped by country."""
        response = self.client.get(
            '/api/folders/filiales/by_country/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        # Should have groups for each country code
        self.assertGreater(len(data), 0)


class ServiceViewSetTestCase(TestCase):
    """Test the Services ViewSet API."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='SRVTEST',
            email='srv@test.com',
            password='testpass123',
            first_name='Srv',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'SRVTEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_list_services(self):
        """Test GETting list of all Services."""
        response = self.client.get('/api/folders/services/', **self.headers)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 56)
    
    def test_service_detail(self):
        """Test GETting a specific Service."""
        service = Folder.objects.get(code='SRV_ADM_IN')
        response = self.client.get(
            f'/api/folders/services/{service.id}/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['code'], 'SRV_ADM_IN')
        self.assertEqual(data['folder_type'], 'service')
    
    def test_services_by_type(self):
        """Test Services grouped by Pôle type."""
        response = self.client.get(
            '/api/folders/services/by_type/',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 8)  # 8 pôle types
        
        # Check each pôle has 7 services
        for pole_group in data:
            self.assertEqual(pole_group['services_count'], 7)
            self.assertEqual(len(pole_group['services']), 7)


class FilteringAndSearchTestCase(TestCase):
    """Test filtering and searching capabilities."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='FILTERTEST',
            email='filter@test.com',
            password='testpass123',
            first_name='Filter',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'FILTERTEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_pole_search_by_name(self):
        """Test searching Pôles by name."""
        response = self.client.get(
            '/api/folders/poles/?search=Administration',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 1)
        self.assertIn('Administration', data['results'][0]['name'])
    
    def test_filiale_search_by_code(self):
        """Test searching Filiales by code."""
        response = self.client.get(
            '/api/folders/filiales/?search=POL_ADM_EN',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 1)
    
    def test_filiale_filter_by_parent(self):
        """Test filtering Filiales by parent Pôle."""
        pole = Folder.objects.get(code='POL_ADM')
        response = self.client.get(
            f'/api/folders/filiales/?parent={pole.id}',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 7)
    
    def test_service_filter_by_parent(self):
        """Test filtering Services by parent Filiale."""
        filiale = Folder.objects.get(code='POL_ADM_EN')
        response = self.client.get(
            f'/api/folders/services/?parent={filiale.id}',
            **self.headers
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['count'], 1)


class PaginationTestCase(TestCase):
    """Test pagination on list endpoints."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='PAGETEST',
            email='page@test.com',
            password='testpass123',
            first_name='Page',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'PAGETEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_filiales_pagination(self):
        """Test pagination on Filiales list (56 items)."""
        response = self.client.get('/api/folders/filiales/', **self.headers)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        
        # Default page size is 20, so 56 items = 3 pages
        self.assertEqual(data['count'], 56)
        self.assertEqual(len(data['results']), 20)  # First page
        self.assertIsNotNone(data['next'])  # Should have next page
    
    def test_services_pagination(self):
        """Test pagination on Services list (56 items)."""
        response = self.client.get('/api/folders/services/', **self.headers)
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        
        self.assertEqual(data['count'], 56)
        self.assertEqual(len(data['results']), 20)  # First page


class HierarchyNavigationTestCase(TestCase):
    """Test hierarchy navigation through API."""
    
    @classmethod
    def setUpTestData(cls):
        """Set up test data."""
        cls.user = User.objects.create_user(
            matricule='NAVTEST',
            email='nav@test.com',
            password='testpass123',
            first_name='Nav',
            last_name='Test'
        )
    
    def setUp(self):
        """Set up client."""
        self.client = Client()
        response = self.client.post(
            '/api/auth/token/',
            {'matricule': 'NAVTEST', 'password': 'testpass123'},
            content_type='application/json'
        )
        data = json.loads(response.content)
        self.token = data.get('access')
        self.headers = {'HTTP_AUTHORIZATION': f'Bearer {self.token}'}
    
    def test_pole_to_filiales_navigation(self):
        """Test navigating from Pôle to Filiales."""
        pole = Folder.objects.get(code='POL_ADM')
        
        # Get pole
        response = self.client.get(
            f'/api/folders/poles/{pole.id}/',
            **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        pole_data = json.loads(response.content)
        
        # Navigate to filiales
        response = self.client.get(
            f'/api/folders/poles/{pole_data["id"]}/filiales/',
            **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        filiales = json.loads(response.content)
        self.assertEqual(len(filiales), 7)
    
    def test_filiale_to_services_navigation(self):
        """Test navigating from Filiale to Services."""
        filiale = Folder.objects.get(code='POL_ADM_EN')
        
        # Get filiale
        response = self.client.get(
            f'/api/folders/filiales/{filiale.id}/',
            **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        filiale_data = json.loads(response.content)
        
        # Navigate to services
        response = self.client.get(
            f'/api/folders/filiales/{filiale_data["id"]}/services/',
            **self.headers
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        services = json.loads(response.content)
        self.assertEqual(len(services), 1)
