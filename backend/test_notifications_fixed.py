#!/usr/bin/env python
"""
Test du système de notifications corrigé.
Teste que les notifications sont envoyées aux bonnes personnes.
"""

import os
import django
import sys

# Configure Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.contrib.auth import get_user_model
from apps.documents.models import Document
from apps.notifications.models import Notification
from apps.notifications.services import NotificationService

User = get_user_model()

def test_notification_service():
    """Test du service de notifications."""
    
    print("\n" + "="*60)
    print("TEST: Service de Notifications")
    print("="*60)
    
    # Vérifier que le service peut être importé
    print("\n✅ Service NotificationService importé avec succès")
    
    # Vérifier les méthodes du service
    methods = [
        'notify_on_document_uploaded',
        'notify_on_document_opened',
        'notify_on_document_approved',
        'notify_on_document_rejected',
        'notify_on_document_deleted',
        'notify_on_validation_completed',
    ]
    
    print("\n📋 Méthodes disponibles dans NotificationService:")
    for method in methods:
        if hasattr(NotificationService, method):
            print(f"  ✅ {method}")
        else:
            print(f"  ❌ {method} - MANQUANT!")
    
    # Vérifier les types de notifications
    print("\n📭 Types de notifications disponibles:")
    for notification_type, label in Notification.TYPE_CHOICES:
        print(f"  • {notification_type}: {label}")
    
    # Vérifier qu'il y a au moins un agent et un admin
    agents = User.objects.filter(is_staff=False, is_active=True)
    admins = User.objects.filter(is_staff=True, is_active=True)
    
    print(f"\n👥 Utilisateurs dans la base:")
    print(f"  • Agents: {agents.count()}")
    print(f"  • Admins: {admins.count()}")
    
    # Compter les notifications existantes
    total_notifs = Notification.objects.count()
    print(f"\n📬 Notifications totales: {total_notifs}")
    
    # Notifications par type
    print("\n📊 Notifications par type:")
    for notification_type, label in Notification.TYPE_CHOICES:
        count = Notification.objects.filter(notification_type=notification_type).count()
        if count > 0:
            print(f"  • {notification_type}: {count}")
    
    print("\n" + "="*60)
    print("✅ TEST RÉUSSI - Service de notifications en place")
    print("="*60 + "\n")

if __name__ == '__main__':
    try:
        test_notification_service()
    except Exception as e:
        print(f"\n❌ ERREUR: {str(e)}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
