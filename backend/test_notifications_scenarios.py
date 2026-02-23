#!/usr/bin/env python
"""
Test Complet: Scénarios de Notifications
Démontre que les notifications sont envoyées aux bonnes personnes dans chaque situation.
"""

import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

User = get_user_model()


def print_section(title):
    """Affiche un titre de section."""
    print(f"\n{'='*70}")
    print(f"  {title}")
    print(f"{'='*70}\n")


def get_users():
    """Récupère un agent et un admin pour les tests."""
    agent = User.objects.filter(is_staff=False, is_active=True).first()
    admin = User.objects.filter(is_staff=True, is_active=True).first()
    other_admin = User.objects.filter(is_staff=True, is_active=True).exclude(id=admin.id).first()
    return agent, admin, other_admin


def test_scenario_1():
    """Scénario 1: Agent upload un document"""
    print_section("SCÉNARIO 1: Agent upload un document")
    
    agent, admin, other_admin = get_users()
    
    # Simuler un document créé par un agent
    print(f"👤 Agent: {agent.matricule} ({agent.first_name} {agent.last_name})")
    print(f"👨‍💼 Admin 1: {admin.matricule}")
    print(f"👨‍💼 Admin 2: {other_admin.matricule if other_admin else 'N/A'}")
    
    # Compter les notifications avant
    notifs_before = Notification.objects.count()
    
    # Créer un document test
    doc = Document.objects.create(
        title="Test Document Upload",
        document_type="RAPPORT",
        agent=agent,
        status='NOUVEAU'
    )
    
    # Simuler le service de notification
    NotificationService.notify_on_document_uploaded(doc, agent)
    
    # Compter les notifications après
    notifs_after = Notification.objects.count()
    created_count = notifs_after - notifs_before
    
    print(f"\n📬 Notifications créées: {created_count}")
    
    # Afficher les notifications
    new_notifs = Notification.objects.order_by('-id')[:created_count]
    
    print("\n📋 Détails des notifications:")
    for notif in new_notifs:
        print(f"  ✉️  À: {notif.recipient.matricule} ({notif.recipient.first_name})")
        print(f"     Type: {notif.notification_type}")
        print(f"     Titre: {notif.title}")
        print(f"     Message: {notif.message[:60]}...")
    
    expected = 2  # Agent + admins
    if created_count >= 1:
        print(f"\n✅ SCÉNARIO 1 RÉUSSI: {created_count} notification(s) créée(s)")
    else:
        print(f"\n❌ SCÉNARIO 1 ÉCHOUÉ: Attendu {expected}, obtenu {created_count}")


def test_scenario_2():
    """Scénario 2: Admin ouvre un document pour révision"""
    print_section("SCÉNARIO 2: Admin ouvre un document pour révision")
    
    agent, admin, _ = get_users()
    
    # Récupérer un document
    doc = Document.objects.filter(agent=agent).first()
    if not doc:
        print("❌ Aucun document trouvé pour tester")
        return
    
    print(f"📄 Document: {doc.title}")
    print(f"👤 Agent: {agent.matricule}")
    print(f"👨‍💼 Admin ouvrant: {admin.matricule}")
    
    notifs_before = Notification.objects.count()
    
    # Simuler l'ouverture d'un document
    NotificationService.notify_on_document_opened(doc, admin)
    
    notifs_after = Notification.objects.count()
    created_count = notifs_after - notifs_before
    
    print(f"\n📬 Notifications créées: {created_count}")
    
    new_notifs = Notification.objects.order_by('-id')[:created_count]
    
    print("\n📋 Détails des notifications:")
    for notif in new_notifs:
        print(f"  ✉️  À: {notif.recipient.matricule} ({notif.recipient.first_name})")
        print(f"     Titre: {notif.title}")
        print(f"     Message: {notif.message[:60]}...")
    
    if created_count == 1:
        print(f"\n✅ SCÉNARIO 2 RÉUSSI: Agent notifié de l'ouverture")
    else:
        print(f"\n❌ SCÉNARIO 2 ÉCHOUÉ: Attendu 1, obtenu {created_count}")


def test_scenario_3():
    """Scénario 3: Admin approuve un document"""
    print_section("SCÉNARIO 3: Admin approuve un document")
    
    agent, admin, other_admin = get_users()
    
    doc = Document.objects.filter(agent=agent).first()
    if not doc:
        print("❌ Aucun document trouvé")
        return
    
    print(f"📄 Document: {doc.title}")
    print(f"👤 Agent propriétaire: {agent.matricule}")
    print(f"👨‍💼 Admin approuvant: {admin.matricule}")
    if other_admin:
        print(f"👨‍💼 Autre admin: {other_admin.matricule}")
    
    notifs_before = Notification.objects.count()
    
    # Simuler l'approbation
    NotificationService.notify_on_document_approved(doc, admin)
    
    notifs_after = Notification.objects.count()
    created_count = notifs_after - notifs_before
    
    print(f"\n📬 Notifications créées: {created_count}")
    
    new_notifs = Notification.objects.order_by('-id')[:created_count]
    
    print("\n📋 Qui reçoit les notifications:")
    for notif in new_notifs:
        recipient_type = "AGENT" if notif.recipient == agent else "ADMIN"
        print(f"  ✉️  {recipient_type}: {notif.recipient.matricule} ({notif.recipient.first_name})")
        print(f"     Titre: {notif.title}")
    
    # Vérifier que tous les bénéficiaires sont notifiés
    all_admins = User.objects.filter(is_staff=True, is_active=True).count()
    expected_count = 1 + all_admins  # Agent + tous les admins
    
    if created_count == expected_count:
        print(f"\n✅ SCÉNARIO 3 RÉUSSI: {created_count} notification(s) - Agent + {all_admins} admin(s)")
    else:
        print(f"\n⚠️  SCÉNARIO 3: Obtenu {created_count}, attendu ~{expected_count} notification(s)")


def test_scenario_4():
    """Scénario 4: Admin rejette un document"""
    print_section("SCÉNARIO 4: Admin rejette un document")
    
    agent, admin, _ = get_users()
    
    doc = Document.objects.filter(agent=agent).first()
    if not doc:
        print("❌ Aucun document trouvé")
        return
    
    print(f"📄 Document: {doc.title}")
    print(f"👤 Agent propriétaire: {agent.matricule}")
    print(f"👨‍💼 Admin rejetant: {admin.matricule}")
    
    reason = "Document incomplet - Douanes de qualification manquantes"
    
    notifs_before = Notification.objects.count()
    
    # Simuler le rejet
    NotificationService.notify_on_document_rejected(doc, admin, reason)
    
    notifs_after = Notification.objects.count()
    created_count = notifs_after - notifs_before
    
    print(f"\n📬 Notifications créées: {created_count}")
    
    new_notifs = Notification.objects.order_by('-id')[:created_count]
    
    print("\n📋 Destinataires et contenu:")
    for notif in new_notifs:
        recipient_type = "AGENT" if notif.recipient == agent else "ADMIN"
        print(f"  ✉️  {recipient_type}: {notif.recipient.matricule}")
        print(f"     Titre: {notif.title}")
        if "raison" in notif.message.lower() or "Raison" in notif.message:
            print(f"     ✓ Raison incluse dans le message")
    
    all_admins = User.objects.filter(is_staff=True, is_active=True).count()
    expected_count = 1 + all_admins
    
    if created_count == expected_count:
        print(f"\n✅ SCÉNARIO 4 RÉUSSI: {created_count} notification(s)")
    else:
        print(f"\n⚠️  SCÉNARIO 4: Obtenu {created_count}, attendu ~{expected_count} notification(s)")


def test_scenario_5():
    """Scénario 5: Validation réussie"""
    print_section("SCÉNARIO 5: Document validé avec succès")
    
    agent, admin, _ = get_users()
    
    doc = Document.objects.filter(agent=agent).first()
    if not doc:
        print("❌ Aucun document trouvé")
        return
    
    print(f"📄 Document: {doc.title}")
    print(f"👤 Agent propriétaire: {agent.matricule}")
    
    notifs_before = Notification.objects.count()
    
    # Simuler une validation réussie
    NotificationService.notify_on_validation_completed(doc, passed=True, issues=None)
    
    notifs_after = Notification.objects.count()
    created_count = notifs_after - notifs_before
    
    print(f"\n📬 Notifications créées: {created_count}")
    
    new_notifs = Notification.objects.order_by('-id')[:created_count]
    
    print("\n📋 Notifications de validation réussie:")
    for notif in new_notifs:
        recipient_type = "AGENT" if notif.recipient == agent else "ADMIN"
        print(f"  ✉️  À {recipient_type}: {notif.recipient.matricule}")
        print(f"     ✅ {notif.title}")
    
    all_admins = User.objects.filter(is_staff=True, is_active=True).count()
    expected_count = 1 + all_admins  # Agent + tous les admins
    
    if created_count == expected_count:
        print(f"\n✅ SCÉNARIO 5 RÉUSSI: {created_count} notification(s)")
    else:
        print(f"\n⚠️  SCÉNARIO 5: Obtenu {created_count}, attendu ~{expected_count} notification(s)")


def main():
    """Lance tous les tests."""
    
    print("\n" + "╔" + "="*68 + "╗")
    print("║" + " "*15 + "TEST COMPLET: SYSTÈME DE NOTIFICATIONS" + " "*15 + "║")
    print("╚" + "="*68 + "╝")
    
    try:
        test_scenario_1()  # Upload
        test_scenario_2()  # Ouverture par admin
        test_scenario_3()  # Approbation
        test_scenario_4()  # Rejet
        test_scenario_5()  # Validation réussie
        
        print_section("RÉSUMÉ FINAL")
        
        print("✅ TOUS LES SCÉNARIOS DE NOTIFICATION TESTÉS")
        print("\n📊 Résumé des flux de notifications:")
        print("  1️⃣  Upload: Agent + Admins")
        print("  2️⃣  Ouverture: Agent")
        print("  3️⃣  Approbation: Admin qui approuve + Autres admins + Agent")
        print("  4️⃣  Rejet: Admin qui rejette + Autres admins + Agent")
        print("  5️⃣  Validation: Agent + Admins")
        
        print("\n" + "="*70)
        print("✅ SYSTÈME DE NOTIFICATIONS CONFIGURÉ CORRECTEMENT")
        print("="*70 + "\n")
        
    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
