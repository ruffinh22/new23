"""
Tests de charge pour SGDRA API avec Locust.
Simule 100+ utilisateurs concurrents pour tester la performance et la stabilité.

Usage:
    locust -f load_tests.py --host=http://localhost:8000

Puis ouvrir http://localhost:8089 pour l'interface web.
"""

from locust import HttpUser, task, between, events
from io import BytesIO
import time


class SGDRAUser(HttpUser):
    """Utilisateur simulé pour tester SGDRA API."""

    wait_time = between(1, 3)  # Attendre 1-3 secondes entre les tâches

    def on_start(self):
        """Authentification au démarrage de l'utilisateur."""
        # Matricule de test (agent)
        self.matricule = f"AG{self.client.generate_random_id() % 1000:04d}"

        # S'authentifier pour obtenir le token JWT
        response = self.client.post(
            "/api/auth/token/",
            json={"matricule": "AG0001", "password": "password123"},
            name="/api/auth/token/",
        )

        if response.status_code == 200:
            self.token = response.json().get("access")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            }
        else:
            # Token par défaut si l'authentification échoue
            self.token = "dummy_token"
            self.headers = {
                "Authorization": "Bearer dummy",
                "Content-Type": "application/json",
            }

    @task(3)  # Poids 3 (tâche plus fréquente)
    def list_documents(self):
        """Lister les documents avec pagination."""
        for page in range(1, 4):
            self.client.get(
                f"/api/documents/?page={page}&page_size=25",
                headers=self.headers,
                name="/api/documents/ [LIST]",
            )

    @task(2)
    def view_document_detail(self):
        """Voir les détails d'un document."""
        # Simuler un ID de document (1-50)
        doc_id = (hash(self.token) % 50) + 1
        self.client.get(
            f"/api/documents/{doc_id}/",
            headers=self.headers,
            name="/api/documents/{id}/ [GET]",
        )

    @task(1)
    def upload_document(self):
        """Uploader un document (moins fréquent car plus lourd)."""
        # Créer un fichier Excel de test minimal
        excel_content = b"PK\x03\x04"  # Signature ZIP/Excel

        files = {
            "file": (
                "test_document.xlsx",
                BytesIO(excel_content),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ),
            "title": (None, f"Document Test {int(time.time())}"),
            "description": (None, "Test upload pour load testing"),
            "document_type": (None, "DONNEES_AGENTS"),
        }

        self.client.post(
            "/api/documents/",
            files=files,
            headers={"Authorization": self.headers.get("Authorization")},
            name="/api/documents/ [UPLOAD]",
        )

    @task(1)
    def get_statistics(self):
        """Récupérer les statistiques de validation."""
        self.client.get(
            "/api/documents/validation_stats/",
            headers=self.headers,
            name="/api/documents/validation_stats/ [STATS]",
        )

    @task(2)
    def search_documents(self):
        """Rechercher des documents."""
        search_terms = ["test", "document", "validation", "urgent"]
        term = search_terms[hash(self.token) % len(search_terms)]

        self.client.get(
            f"/api/documents/?search={term}",
            headers=self.headers,
            name="/api/documents/ [SEARCH]",
        )

    @task(1)
    def health_check(self):
        """Vérifier la santé de l'API."""
        self.client.get("/health/", name="/health/")


class AdminUser(HttpUser):
    """Utilisateur admin simulé (pour approver/rejeter)."""

    wait_time = between(2, 5)

    def on_start(self):
        """Authentification en tant qu'admin."""
        # S'authentifier comme admin
        response = self.client.post(
            "/api/auth/token/",
            json={"matricule": "ADMIN001", "password": "admin123"},
            name="/api/auth/token/ [ADMIN]",
        )

        if response.status_code == 200:
            self.token = response.json().get("access")
            self.headers = {
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            }

    @task(5)
    def list_pending_documents(self):
        """Lister les documents en attente d'approbation."""
        self.client.get(
            "/api/documents/?status=A_VALIDER",
            headers=self.headers,
            name="/api/documents/ [PENDING]",
        )

    @task(2)
    def approve_document(self):
        """Approuver un document."""
        doc_id = (hash(self.token) % 50) + 1
        self.client.post(
            f"/api/documents/{doc_id}/approve/",
            json={"comment": "Approuvé par load test"},
            headers=self.headers,
            name="/api/documents/{id}/approve/",
        )

    @task(1)
    def reject_document(self):
        """Rejeter un document."""
        doc_id = (hash(self.token) % 50) + 1
        self.client.post(
            f"/api/documents/{doc_id}/reject/",
            json={"reason": "Rejeté par load test"},
            headers=self.headers,
            name="/api/documents/{id}/reject/",
        )


@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Événement au démarrage du test."""
    print("\n🚀 Démarrage du test de charge SGDRA...")
    print(f"   Cible: {environment.host}")
    print("   Durée: Jusqu'à arrêt manuel")
    print("   Interface web: http://localhost:8089\n")


@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Événement à l'arrêt du test."""
    print("\n⏹️  Test de charge arrêté")
    print("\n📊 RÉSUMÉ DES RÉSULTATS:")
    print("=" * 80)

    # Statistiques globales
    stats = environment.stats
    total_requests = stats.total.num_requests
    total_failures = stats.total.num_failures
    success_rate = (
        ((total_requests - total_failures) / total_requests * 100)
        if total_requests > 0
        else 0
    )

    print(f"Total des requêtes: {total_requests}")
    print(f"Échecues: {total_failures}")
    print(f"Taux de succès: {success_rate:.2f}%")
    print(f"Temps réponse moyen: {stats.total.avg_response_time:.2f}ms")
    print(f"Temps réponse médian: {stats.total.median_response_time:.2f}ms")
    print(f"Temps réponse max: {stats.total.max_response_time:.2f}ms")
    print(f"RPS moyen: {stats.total.total_rps:.2f}")
    print("=" * 80)
