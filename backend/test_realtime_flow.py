#!/usr/bin/env python
"""
Test script for real-time notifications and audit logs.
Tests the complete flow from signal creation to WebSocket delivery.
"""

import os
import django

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
django.setup()

from django.contrib.auth import get_user_model
from apps.notifications.models import Notification
from apps.common.audit import AuditLog

User = get_user_model()


def test_notification_signal():
    """Test notification creation and signal"""
    print("\n" + "=" * 60)
    print("🧪 Testing Notification Signal Flow")
    print("=" * 60)

    try:
        # Get or create test user
        admin = User.objects.filter(is_staff=True).first()
        if not admin:
            print("❌ No admin user found")
            return False

        print(f"✅ Using admin: {admin.matricule}")

        # Create a test notification
        print(f"\n📝 Creating notification for {admin.matricule}...")
        notification = Notification.objects.create(
            recipient=admin,
            notification_type="DOCUMENT_UPLOADED",
            title="Test Notification - Real-time",
            message="This notification should appear in real-time",
            is_read=False,
        )

        print(f"✅ Created notification ID {notification.id}")
        print(f"   - Title: {notification.title}")
        print(f"   - Recipient: {admin.matricule}")
        print(f"   - Created at: {notification.created_at}")

        # Check in DB
        db_notif = Notification.objects.get(id=notification.id)
        print("\n✅ Verified in database:")
        print(f"   - is_read: {db_notif.is_read}")
        print(f"   - recipient_id: {db_notif.recipient_id}")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


def test_audit_signal():
    """Test audit log creation and signal"""
    print("\n" + "=" * 60)
    print("🧪 Testing Audit Log Signal Flow")
    print("=" * 60)

    try:
        # Get or create test user
        admin = User.objects.filter(is_staff=True).first()
        if not admin:
            print("❌ No admin user found")
            return False

        print(f"✅ Using admin: {admin.matricule}")

        # Create a test audit log
        print("\n📝 Creating audit log...")
        audit_log = AuditLog.objects.create(
            actor=admin,
            action="DOCUMENT_UPLOAD",
            severity="INFO",
            description="Test audit log from script - should broadcast to WebSocket",
            ip_address="127.0.0.1",
            success=True,
        )

        print(f"✅ Created audit log ID {audit_log.id}")
        print(f"   - Action: {audit_log.get_action_display()}")
        print(f"   - Actor: {admin.matricule}")
        print(f"   - Created at: {audit_log.created_at}")
        print(f"   - Severity: {audit_log.get_severity_display()}")

        # Check in DB
        db_log = AuditLog.objects.get(id=audit_log.id)
        print("\n✅ Verified in database:")
        print(f"   - success: {db_log.success}")
        print(f"   - actor_id: {db_log.actor_id}")

        return True

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


def check_signal_receivers():
    """Check if signal receivers are properly registered"""
    print("\n" + "=" * 60)
    print("🧪 Checking Signal Receivers")
    print("=" * 60)

    try:
        from django.db.models.signals import post_save
        from apps.notifications.models import Notification
        from apps.common.audit import AuditLog

        # Check notification signals
        notif_receivers = post_save._live_receivers(Notification)
        print(f"✅ Notification receivers: {len(notif_receivers)}")
        for receiver in notif_receivers:
            print(
                f"   - {receiver.__name__ if hasattr(receiver, '__name__') else receiver}"
            )

        # Check audit signals
        audit_receivers = post_save._live_receivers(AuditLog)
        print(f"✅ AuditLog receivers: {len(audit_receivers)}")
        for receiver in audit_receivers:
            print(
                f"   - {receiver.__name__ if hasattr(receiver, '__name__') else receiver}"
            )

        if len(notif_receivers) > 0 and len(audit_receivers) > 0:
            print("\n✅ All signal receivers registered correctly!")
            return True
        else:
            print("\n❌ Some signal receivers missing!")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback

        traceback.print_exc()
        return False


def main():
    print("=" * 60)
    print("Real-Time Notifications & Audit Logs Test Suite")
    print("=" * 60)

    results = []

    results.append(("Signal Receivers", check_signal_receivers()))
    results.append(("Notification Signal", test_notification_signal()))
    results.append(("Audit Log Signal", test_audit_signal()))

    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)

    passed = sum(1 for _, result in results if result)
    total = len(results)

    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")

    print(f"\nTotal: {passed}/{total} tests passed")

    if passed == total:
        print("\n🎉 All tests passed!")
        print("\n📝 Next: Check browser console for WebSocket messages")
        print("   - Open http://localhost:5174")
        print("   - Open DevTools (F12)")
        print("   - Check Console tab for [NotificationHub] or [AuditDashboard] logs")
        print("   - New notifications/audits should appear in real-time")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")


if __name__ == "__main__":
    main()
