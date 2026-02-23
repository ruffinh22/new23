"""
Test du système de notifications révisé.

Ce script teste les scénarios de notifications :
1. Agent upload un document → l'agent + admins reçoivent une notification
2. Admin approuve un document → l'admin + autres admins + l'agent reçoivent une notification
3. Admin rejette un document → l'admin + autres admins + l'agent reçoivent une notification
4. Admin ouvre un document → l'agent reçoit une notification
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/home/lidruf/sgdra-project/backend')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document, DocumentSpecification, DocumentValidationResult
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from datetime import datetime
from django.core.files.uploadedfile import SimpleUploadedFile

User = get_user_model()


def print_section(title):
    """Affiche un titre de section."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")


def test_notification_system():
    """Teste le système de notifications."""
    
    print_section("TEST DU SYSTÈME DE NOTIFICATIONS RÉVISÉ")
    
    # 1. Créer les utilisateurs de test
    print("\n[1] Création des utilisateurs de test...")
    
    try:
        agent1 = User.objects.get(matricule='AGENT001')
    except User.DoesNotExist:
        agent1 = User.objects.create_user(
            matricule='AGENT001',
            password='testpass123',
            first_name='Jean',
            last_name='Dupont',
            email='agent1@example.com',
            role='AGENT'
        )
        print(f"  ✅ Agent créé: {agent1.matricule}")
    
    try:
        admin1 = User.objects.get(matricule='ADMIN001')
    except User.DoesNotExist:
        admin1 = User.objects.create_user(
            matricule='ADMIN001',
            password='testpass123',
            first_name='Marie',
            last_name='Martin',
            email='admin1@example.com',
            role='ADMIN',
            is_staff=True
        )
        print(f"  ✅ Admin créé: {admin1.matricule}")
    
    try:
        admin2 = User.objects.get(matricule='ADMIN002')
    except User.DoesNotExist:
        admin2 = User.objects.create_user(
            matricule='ADMIN002',
            password='testpass123',
            first_name='Pierre',
            last_name='Bernard',
            email='admin2@example.com',
            role='ADMIN',
            is_staff=True
        )
        print(f"  ✅ Admin créé: {admin2.matricule}")
    
    # 2. Créer une spécification de document si nécessaire
    print("\n[2] Création de la spécification de document...")
    
    spec, created = DocumentSpecification.objects.get_or_create(
        document_type='TEST_DOC',
        defaults={
            'display_name': 'Document de Test',
            'allowed_formats': 'pdf,txt',
            'max_file_size_mb': 10
        }
    )
    print(f"  ✅ Spécification: {spec.document_type}")
    
    # 3. Nettoyer les notifications précédentes
    print("\n[3] Nettoyage des notifications précédentes...")
    Notification.objects.all().delete()
    print(f"  ✅ Toutes les notifications supprimées")
    
    # 4. Test 1: Agent upload un document
    print("\n[4] TEST 1: Upload d'un document par un agent")
    print("-" * 60)
    
    # Créer un fichier de test
    test_file = SimpleUploadedFile(
        "test_doc.txt",
        b"Contenu du document de test",
        content_type="text/plain"
    )
    
    doc = Document.objects.create(
        agent=agent1,
        title='Document de Test',
        document_type='TEST_DOC',
        file=test_file,
        specification=spec
    )
    print(f"  ✅ Document créé: {doc.id}")
    
    # Envoyer les notifications comme dans la vue create()
    NotificationService.notify_on_document_uploaded(doc, agent1)
    
    # Vérifier que les notifications ont été créées
    agent_notifs = Notification.objects.filter(recipient=agent1)
    admin1_notifs = Notification.objects.filter(recipient=admin1)
    admin2_notifs = Notification.objects.filter(recipient=admin2)
    
    print(f"\n  Notifications créées pour:")
    print(f"    - Agent: {agent_notifs.count()} notification(s)")
    print(f"    - Admin 1: {admin1_notifs.count()} notification(s)")
    print(f"    - Admin 2: {admin2_notifs.count()} notification(s)")
    
    for notif in agent_notifs:
        print(f"      [Agent] {notif.title}: {notif.message[:60]}...")
    
    for notif in admin1_notifs:
        print(f"      [Admin1] {notif.title}: {notif.message[:60]}...")
    
    for notif in admin2_notifs:
        print(f"      [Admin2] {notif.title}: {notif.message[:60]}...")
    
    if agent_notifs.exists() and admin1_notifs.exists() and admin2_notifs.exists():
        print("\n  ✅ TEST 1 RÉUSSI: Upload notifie l'agent et les admins")
    else:
        print("\n  ❌ TEST 1 ÉCHOUÉ: Des notifications manquent")
    
    # 5. Test 2: Admin approuve le document
    print("\n[5] TEST 2: Approbation du document par un admin")
    print("-" * 60)
    
    # Créer un résultat de validation PASSED pour que le document puisse être approuvé
    validation_result = DocumentValidationResult.objects.create(
        document=doc,
        status='PASSED',
        errors=[],
        warnings=[]
    )
    
    # Nettoyer les notifications précédentes
    Notification.objects.all().delete()
    
    # Approuver le document
    NotificationService.notify_on_document_approved(doc, admin1)
    
    # Vérifier que les notifications ont été créées
    admin1_notifs = Notification.objects.filter(recipient=admin1)
    admin2_notifs = Notification.objects.filter(recipient=admin2)
    agent_notifs = Notification.objects.filter(recipient=agent1)
    
    print(f"\n  Notifications créées pour:")
    print(f"    - Admin 1 (qui a approuvé): {admin1_notifs.count()} notification(s)")
    print(f"    - Admin 2 (autre admin): {admin2_notifs.count()} notification(s)")
    print(f"    - Agent: {agent_notifs.count()} notification(s)")
    
    for notif in admin1_notifs:
        print(f"      [Admin1] {notif.title}: {notif.message[:60]}...")
    
    for notif in admin2_notifs:
        print(f"      [Admin2] {notif.title}: {notif.message[:60]}...")
    
    for notif in agent_notifs:
        print(f"      [Agent] {notif.title}: {notif.message[:60]}...")
    
    if admin1_notifs.exists() and admin2_notifs.exists() and agent_notifs.exists():
        print("\n  ✅ TEST 2 RÉUSSI: Approbation notifie l'admin qui a approuvé, les autres admins et l'agent")
    else:
        print("\n  ❌ TEST 2 ÉCHOUÉ: Des notifications manquent")
        print(f"    Admin1: {admin1_notifs.count()}, Admin2: {admin2_notifs.count()}, Agent: {agent_notifs.count()}")
    
    # 6. Test 3: Admin rejette le document
    print("\n[6] TEST 3: Rejet du document par un admin")
    print("-" * 60)
    
    # Créer un nouveau document
    test_file2 = SimpleUploadedFile(
        "test_doc2.txt",
        b"Contenu du document de test 2",
        content_type="text/plain"
    )
    
    doc2 = Document.objects.create(
        agent=agent1,
        title='Document à Rejeter',
        document_type='TEST_DOC',
        file=test_file2,
        specification=spec
    )
    
    # Nettoyer les notifications
    Notification.objects.all().delete()
    
    # Rejeter le document
    NotificationService.notify_on_document_rejected(doc2, admin2, "Format incorrect")
    
    # Vérifier que les notifications ont été créées
    admin1_notifs = Notification.objects.filter(recipient=admin1)
    admin2_notifs = Notification.objects.filter(recipient=admin2)
    agent_notifs = Notification.objects.filter(recipient=agent1)
    
    print(f"\n  Notifications créées pour:")
    print(f"    - Admin 2 (qui a rejeté): {admin2_notifs.count()} notification(s)")
    print(f"    - Admin 1 (autre admin): {admin1_notifs.count()} notification(s)")
    print(f"    - Agent: {agent_notifs.count()} notification(s)")
    
    for notif in admin2_notifs:
        print(f"      [Admin2] {notif.title}: {notif.message[:60]}...")
    
    for notif in admin1_notifs:
        print(f"      [Admin1] {notif.title}: {notif.message[:60]}...")
    
    for notif in agent_notifs:
        print(f"      [Agent] {notif.title}: {notif.message[:60]}...")
    
    if admin2_notifs.exists() and admin1_notifs.exists() and agent_notifs.exists():
        print("\n  ✅ TEST 3 RÉUSSI: Rejet notifie l'admin qui a rejeté, les autres admins et l'agent")
    else:
        print("\n  ❌ TEST 3 ÉCHOUÉ: Des notifications manquent")
        print(f"    Admin2: {admin2_notifs.count()}, Admin1: {admin1_notifs.count()}, Agent: {agent_notifs.count()}")
    
    # 7. Test 4: Admin ouvre un document
    print("\n[7] TEST 4: Ouverture du document par un admin")
    print("-" * 60)
    
    # Nettoyer les notifications
    Notification.objects.all().delete()
    
    # Ouvrir le document
    NotificationService.notify_on_document_opened(doc, admin1)
    
    # Vérifier que la notification a été créée
    agent_notifs = Notification.objects.filter(recipient=agent1)
    
    print(f"\n  Notifications créées pour:")
    print(f"    - Agent: {agent_notifs.count()} notification(s)")
    
    for notif in agent_notifs:
        print(f"      [Agent] {notif.title}: {notif.message[:60]}...")
    
    if agent_notifs.exists():
        print("\n  ✅ TEST 4 RÉUSSI: L'agent est notifié quand un admin ouvre le document")
    else:
        print("\n  ❌ TEST 4 ÉCHOUÉ: Notification manquante")
    
    # 8. Résumé
    print_section("RÉSUMÉ DES TESTS")
    
    total_notifs = Notification.objects.count()
    agent_total = Notification.objects.filter(recipient=agent1).count()
    admin1_total = Notification.objects.filter(recipient=admin1).count()
    admin2_total = Notification.objects.filter(recipient=admin2).count()
    
    print(f"\nTotal de notifications créées: {total_notifs}")
    print(f"  - Agent 1: {agent_total}")
    print(f"  - Admin 1: {admin1_total}")
    print(f"  - Admin 2: {admin2_total}")
    
    print(f"\nTypes de notifications:")
    types = Notification.objects.values('notification_type').distinct()
    for type_obj in types:
        count = Notification.objects.filter(notification_type=type_obj['notification_type']).count()
        print(f"  - {type_obj['notification_type']}: {count}")
    
    print("\n✅ TOUS LES TESTS SONT TERMINÉS")


if __name__ == '__main__':
    test_notification_system()
