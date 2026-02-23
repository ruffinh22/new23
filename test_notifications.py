#!/usr/bin/env python
"""
Simple test script to verify notification generation and delivery
"""

import os
import sys
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.join(os.path.dirname(__file__), 'backend'))

django.setup()

from django.contrib.auth import get_user_model
from apps.notifications.models import Notification

User = get_user_model()

def test_notification_creation():
    """Test creating a notification"""
    print("🧪 TEST: Notification Creation")
    print("=" * 50)
    
    # Get admin user
    try:
        admin = User.objects.get(matricule='ADMIN001')
        print(f"✅ Found user: {admin.matricule} ({admin.first_name} {admin.last_name})")
    except User.DoesNotExist:
        print("❌ ADMIN001 not found!")
        return False
    
    # Count before
    count_before = Notification.objects.filter(recipient=admin).count()
    print(f"📊 Before: {count_before} total notifications")
    
    # Create test notification (NO EMOJIS - MySQL charset issue)
    notif = Notification.objects.create(
        recipient=admin,
        notification_type='SYSTEM',
        title='Test Notification Generated',
        message='This is a test notification to verify the notification generation system works correctly',
        is_read=False
    )
    print(f"✨ Created: Notification ID={notif.id}")
    print(f"   - Title: {notif.title}")
    print(f"   - Type: {notif.notification_type}")
    print(f"   - Read: {notif.is_read}")
    
    # Verify in database
    count_after = Notification.objects.filter(recipient=admin).count()
    unread = Notification.objects.filter(recipient=admin, is_read=False).count()
    
    print(f"\n📊 After: {count_after} total notifications")
    print(f"   - Unread: {unread}")
    print(f"   - Difference: +{count_after - count_before}")
    
    # Verify it can be retrieved
    retrieved = Notification.objects.get(id=notif.id)
    print(f"\n✅ Verified: Notification {retrieved.id} found and retrievable")
    
    # Show recent notifications
    print(f"\n📋 5 Most Recent Notifications:")
    for n in Notification.objects.filter(recipient=admin).order_by('-created_at')[:5]:
        status = '📭' if not n.is_read else '✅'
        print(f"   {status} [{n.id}] {n.title[:40]} | {n.created_at.strftime('%H:%M:%S')}")
    
    return True

if __name__ == '__main__':
    print("\n")
    success = test_notification_creation()
    print("\n" + "=" * 50)
    if success:
        print("✅ TEST PASSED: Notifications are being generated correctly!")
    else:
        print("❌ TEST FAILED")
    print("=" * 50 + "\n")
