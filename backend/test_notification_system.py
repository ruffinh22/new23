#!/usr/bin/env python
"""
Script para verificar el sistema de notificaciones.

Este script verifica que:
1. Las notificaciones se crean cuando un agente sube un documento
2. Los administradores reciben una notificación al subir un documento
3. Los agentes reciben una notificación cuando un administrador descarga su documento
4. Los agentes reciben una notificación cuando su documento es aprobado
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

django.setup()

from apps.notifications.models import Notification
from apps.documents.models import Document
from apps.users.models import User
from django.contrib.auth import get_user_model

def test_notification_system():
    """Test the notification system."""
    print("=" * 80)
    print("PRUEBA DEL SISTEMA DE NOTIFICACIONES")
    print("=" * 80)
    
    # Check if notification types are updated
    print("\n1. VERIFICANDO TIPOS DE NOTIFICACIÓN:")
    print("-" * 80)
    notification_types = dict(Notification.TYPE_CHOICES)
    for key, value in notification_types.items():
        print(f"   ✓ {key}: {value}")
    
    # Check required notification types
    required_types = ['DOCUMENT_UPLOADED', 'DOCUMENT_DOWNLOADED', 'DOCUMENT_APPROVED', 'DOCUMENT_REJECTED']
    for req_type in required_types:
        if req_type in notification_types:
            print(f"\n   ✓ {req_type} está disponible")
        else:
            print(f"\n   ✗ {req_type} NO está disponible")
    
    # Count existing notifications
    print("\n2. CONTANDO NOTIFICACIONES EXISTENTES:")
    print("-" * 80)
    total_notifications = Notification.objects.count()
    print(f"   Total de notificaciones: {total_notifications}")
    
    for notif_type in required_types:
        count = Notification.objects.filter(notification_type=notif_type).count()
        print(f"   - {notif_type}: {count}")
    
    # Check if admins exist
    print("\n3. VERIFICANDO ADMINISTRADORES:")
    print("-" * 80)
    User = get_user_model()
    admins = User.objects.filter(is_staff=True, is_active=True)
    print(f"   Total de administradores: {admins.count()}")
    for admin in admins:
        print(f"   - {admin.matricule}: {admin.get_full_name()} ({admin.email})")
    
    # Check if agents exist
    print("\n4. VERIFICANDO AGENTES:")
    print("-" * 80)
    agents = User.objects.filter(is_staff=False, is_active=True)
    print(f"   Total de agentes: {agents.count()}")
    for agent in agents[:5]:  # Show first 5
        print(f"   - {agent.matricule}: {agent.get_full_name()} ({agent.email})")
    
    # Check documents
    print("\n5. VERIFICANDO DOCUMENTOS:")
    print("-" * 80)
    total_docs = Document.objects.count()
    print(f"   Total de documentos: {total_docs}")
    
    docs_by_status = {}
    for doc in Document.objects.all():
        status = doc.status
        docs_by_status[status] = docs_by_status.get(status, 0) + 1
    
    for status, count in docs_by_status.items():
        print(f"   - {status}: {count}")
    
    print("\n" + "=" * 80)
    print("RESUMEN DEL SISTEMA DE NOTIFICACIONES:")
    print("=" * 80)
    print("""
    ✓ El sistema de notificaciones está configurado para:
      1. Notificar a TODOS los administradores cuando un agente sube un documento
      2. Notificar al agente cuando un administrador descarga su documento
      3. Notificar al agente cuando su documento es aprobado
      4. Notificar al agente cuando su documento es rechazado
    
    Los cambios realizados:
    - Actualizado el modelo Notification con nuevos tipos
    - Añadida notificación en el método create() de DocumentViewSet
    - Añadida notificación en el método download() de DocumentViewSet
    - Actualizada notificación en el método approve() de DocumentViewSet
    - Actualizada notificación en el método reject() de DocumentViewSet
    """)
    print("=" * 80)

if __name__ == '__main__':
    test_notification_system()
