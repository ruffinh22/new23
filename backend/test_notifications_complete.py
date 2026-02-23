#!/usr/bin/env python
"""
Test complet du système de notifications corrigé.

Ce script teste les scénarios suivants:
1. Upload d'un document: agent notifié + tous les admins notifiés
2. Approbation d'un document: admin qui approuve notifié + autres admins notifiés + agent notifié
3. Rejet d'un document: admin qui rejette notifié + autres admins notifiés + agent notifié
4. Ouverture d'un document: agent notifié
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, '/home/lidruf/sgdra-project/backend')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from django.core.files.uploadedfile import SimpleUploadedFile
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService
from apps.documents.models import Document, DocumentSpecification
from apps.users.models import User as CustomUser

User = get_user_model()


def create_test_users():
    """Crée des utilisateurs de test."""
    print("\n📝 Création des utilisateurs de test...")
    
    # Supprimer les anciens utilisateurs de test
    User.objects.filter(matricule__startswith='TEST_').delete()
    Notification.objects.all().delete()
    
    # Créer un agent
    agent = User.objects.create_user(
        matricule='TEST_AGENT_001',
        email='agent@test.com',
        password='testpass123',
        first_name='Jean',
        last_name='Agent',
        is_staff=False,
        is_superuser=False,
    )
    print(f"✅ Agent créé: {agent.matricule}")
    
    # Créer des admins
    admin1 = User.objects.create_user(
        matricule='TEST_ADMIN_001',
        email='admin1@test.com',
        password='testpass123',
        first_name='Alice',
        last_name='Admin',
        is_staff=True,
        is_superuser=True,
    )
    print(f"✅ Admin 1 créé: {admin1.matricule}")
    
    admin2 = User.objects.create_user(
        matricule='TEST_ADMIN_002',
        email='admin2@test.com',
        password='testpass123',
        first_name='Bob',
        last_name='Admin',
        is_staff=True,
        is_superuser=True,
    )
    print(f"✅ Admin 2 créé: {admin2.matricule}")
    
    return agent, admin1, admin2


def create_test_document(agent):
    """Crée un document de test."""
    print("\n📄 Création d'un document de test...")
    
    # Créer une spécification
    spec, _ = DocumentSpecification.objects.get_or_create(
        document_type='TEST_PDF',
        defaults={
            'display_name': 'Document Test PDF',
            'allowed_formats': 'pdf',
            'requires_excel': False,
            'max_file_size_mb': 50,
            'is_active': True,
        }
    )
    
    # Créer un document
    file = SimpleUploadedFile(
        'test.pdf',
        b'test content',
        content_type='application/pdf'
    )
    
    document = Document.objects.create(
        agent=agent,
        title='Document de Test',
        document_type='TEST_PDF',
        specification=spec,
        file=file,
        status='EN_ATTENTE',
    )
    
    print(f"✅ Document créé: {document.id} - {document.title}")
    return document


def test_upload_notification(agent, admin1, admin2):
    """Test 1: Notifications lors de l'upload."""
    print("\n" + "="*60)
    print("TEST 1: Notifications lors de l'upload d'un document")
    print("="*60)
    
    # Créer le document
    document = create_test_document(agent)
    
    # Simuler les notifications d'upload
    NotificationService.notify_on_document_uploaded(document, agent)
    
    # Vérifier les notifications
    agent_notifs = Notification.objects.filter(recipient=agent, document=document)
    admin1_notifs = Notification.objects.filter(recipient=admin1, document=document)
    admin2_notifs = Notification.objects.filter(recipient=admin2, document=document)
    
    print(f"\n📬 Notifications de l'agent: {agent_notifs.count()}")
    for notif in agent_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications de Admin 1: {admin1_notifs.count()}")
    for notif in admin1_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications de Admin 2: {admin2_notifs.count()}")
    for notif in admin2_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    assert agent_notifs.count() == 1, "L'agent doit recevoir 1 notification"
    assert admin1_notifs.count() == 1, "Admin 1 doit recevoir 1 notification"
    assert admin2_notifs.count() == 1, "Admin 2 doit recevoir 1 notification"
    
    print("\n✅ TEST 1 PASSÉ: Upload notifications confirmées")
    return document


def test_approve_notification(document, admin1, agent):
    """Test 2: Notifications lors de l'approbation."""
    print("\n" + "="*60)
    print("TEST 2: Notifications lors de l'approbation")
    print("="*60)
    
    # Nettoyer les anciennes notifications
    Notification.objects.filter(document=document).delete()
    
    # Simuler l'approbation
    NotificationService.notify_on_document_approved(document, admin1)
    
    # Vérifier les notifications
    admin1_notifs = Notification.objects.filter(recipient=admin1, document=document)
    admin2_notifs = Notification.objects.filter(
        recipient__matricule='TEST_ADMIN_002',
        document=document
    )
    agent_notifs = Notification.objects.filter(recipient=agent, document=document)
    
    print(f"\n📬 Notifications d'Admin 1 (qui a approuvé): {admin1_notifs.count()}")
    for notif in admin1_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications d'Admin 2 (autre admin): {admin2_notifs.count()}")
    for notif in admin2_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications de l'agent: {agent_notifs.count()}")
    for notif in agent_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    assert admin1_notifs.count() == 1, "Admin 1 doit recevoir 1 notification"
    assert admin2_notifs.count() == 1, "Admin 2 doit recevoir 1 notification"
    assert agent_notifs.count() == 1, "L'agent doit recevoir 1 notification"
    
    print("\n✅ TEST 2 PASSÉ: Approve notifications confirmées")


def test_reject_notification(document, admin1, admin2, agent):
    """Test 3: Notifications lors du rejet."""
    print("\n" + "="*60)
    print("TEST 3: Notifications lors du rejet")
    print("="*60)
    
    # Nettoyer les anciennes notifications
    Notification.objects.filter(document=document).delete()
    
    # Simuler le rejet
    reason = "Document non conforme au format requis"
    NotificationService.notify_on_document_rejected(document, admin1, reason)
    
    # Vérifier les notifications
    admin1_notifs = Notification.objects.filter(recipient=admin1, document=document)
    admin2_notifs = Notification.objects.filter(recipient=admin2, document=document)
    agent_notifs = Notification.objects.filter(recipient=agent, document=document)
    
    print(f"\n📬 Notifications d'Admin 1 (qui a rejeté): {admin1_notifs.count()}")
    for notif in admin1_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications d'Admin 2 (autre admin): {admin2_notifs.count()}")
    for notif in admin2_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    print(f"\n📬 Notifications de l'agent: {agent_notifs.count()}")
    for notif in agent_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    assert admin1_notifs.count() == 1, "Admin 1 doit recevoir 1 notification"
    assert admin2_notifs.count() == 1, "Admin 2 doit recevoir 1 notification"
    assert agent_notifs.count() == 1, "L'agent doit recevoir 1 notification"
    
    print("\n✅ TEST 3 PASSÉ: Reject notifications confirmées")


def test_open_notification(document, agent, admin1):
    """Test 4: Notifications lors de l'ouverture."""
    print("\n" + "="*60)
    print("TEST 4: Notifications lors de l'ouverture du document")
    print("="*60)
    
    # Nettoyer les anciennes notifications
    Notification.objects.filter(document=document, notification_type='DOCUMENT_OPENED').delete()
    
    # Simuler l'ouverture
    NotificationService.notify_on_document_opened(document, admin1)
    
    # Vérifier les notifications
    agent_notifs = Notification.objects.filter(
        recipient=agent,
        document=document,
        notification_type='DOCUMENT_OPENED'
    )
    
    print(f"\n📬 Notifications de l'agent: {agent_notifs.count()}")
    for notif in agent_notifs:
        print(f"  - [{notif.notification_type}] {notif.title}")
        print(f"    Message: {notif.message}")
    
    assert agent_notifs.count() == 1, "L'agent doit recevoir 1 notification DOCUMENT_OPENED"
    
    print("\n✅ TEST 4 PASSÉ: Open notifications confirmées")


def print_summary():
    """Affiche un résumé du système de notifications."""
    print("\n" + "="*60)
    print("RÉSUMÉ DU SYSTÈME DE NOTIFICATIONS")
    print("="*60)
    
    print("\n📋 Types de notifications disponibles:")
    for type_choice, type_name in Notification.TYPE_CHOICES:
        count = Notification.objects.filter(notification_type=type_choice).count()
        print(f"  - {type_choice}: {type_name} ({count} notifications)")
    
    print(f"\n📊 Total de notifications: {Notification.objects.count()}")
    
    print("\n✅ Le système de notifications est maintenant correctement configuré!")
    print("\nFlux de notifications:")
    print("  1. UPLOAD: Agent notifié + Tous les admins notifiés")
    print("  2. APPROVE: Admin qui approuve notifié + Autres admins notifiés + Agent notifié")
    print("  3. REJECT: Admin qui rejette notifié + Autres admins notifiés + Agent notifié")
    print("  4. OPEN: Agent notifié quand un admin ouvre son document")
    print("  5. VALIDATION: Agent notifié du résultat de validation + Admins si validation réussie")


def main():
    """Exécute tous les tests."""
    print("\n" + "🔧 "*15)
    print("TEST COMPLET DU SYSTÈME DE NOTIFICATIONS")
    print("🔧 "*15)
    
    try:
        # Créer les utilisateurs de test
        agent, admin1, admin2 = create_test_users()
        
        # Test 1: Upload
        document = test_upload_notification(agent, admin1, admin2)
        
        # Test 2: Approbation
        test_approve_notification(document, admin1, agent)
        
        # Test 3: Rejet
        test_reject_notification(document, admin1, admin2, agent)
        
        # Test 4: Ouverture
        test_open_notification(document, agent, admin1)
        
        # Résumé
        print_summary()
        
        print("\n" + "✅ "*15)
        print("TOUS LES TESTS SONT PASSÉS!")
        print("✅ "*15)
        
    except AssertionError as e:
        print(f"\n❌ ERREUR: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERREUR INATTENDUE: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == '__main__':
    main()
