"""
WebSocket Integration Test - Notifications & Audit Logs
========================================================

This script verifies that the WebSocket infrastructure is properly configured.

Requirements:
- Backend running on http://localhost:8000 (with Daphne/Channels)
- Redis running and accessible (for channel layer)
- Django apps initialized

Usage:
  python test_websocket.py
"""

import os
import django

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from django.conf import settings
from config.consumers import NotificationConsumer, AuditLogConsumer
from apps.notifications.models import Notification
from apps.common.audit import AuditLog
from django.contrib.auth import get_user_model

User = get_user_model()


def test_imports():
    """Test that all imports work correctly"""
    print("\n🧪 Testing Imports...")
    
    try:
        # Verify consumers
        print(f"✅ NotificationConsumer: {NotificationConsumer.__name__}")
        print(f"✅ AuditLogConsumer: {AuditLogConsumer.__name__}")
        
        # Verify models
        print(f"✅ Notification model: {Notification.__name__}")
        print(f"✅ AuditLog model: {AuditLog.__name__}")
        
        return True
    except Exception as e:
        print(f"❌ Import error: {e}")
        return False


def test_channel_layers_config():
    """Test that CHANNEL_LAYERS is properly configured"""
    print("\n🧪 Testing CHANNEL_LAYERS Configuration...")
    
    try:
        if not hasattr(settings, 'CHANNEL_LAYERS'):
            print("❌ CHANNEL_LAYERS not configured")
            return False
        
        config = settings.CHANNEL_LAYERS
        backend = config.get('default', {}).get('BACKEND', '')
        
        if 'redis' not in backend.lower():
            print(f"⚠️  Backend is {backend}, expected Redis")
            return False
        
        print(f"✅ CHANNEL_LAYERS Backend: {backend}")
        
        hosts = config.get('default', {}).get('CONFIG', {}).get('hosts', [])
        if hosts:
            print(f"✅ Redis hosts configured: {hosts}")
        else:
            print("⚠️  No Redis hosts configured")
        
        return True
    except Exception as e:
        print(f"❌ Configuration error: {e}")
        return False


def test_routing_config():
    """Test that WebSocket routing is properly configured"""
    print("\n🧪 Testing WebSocket Routing...")
    
    try:
        from config.routing import get_websocket_urlpatterns
        
        patterns = get_websocket_urlpatterns()
        
        if not patterns:
            print("❌ No WebSocket patterns configured")
            return False
        
        print(f"✅ Found {len(patterns)} WebSocket routes:")
        for pattern in patterns:
            print(f"   - {pattern.pattern}")
        
        return True
    except Exception as e:
        print(f"❌ Routing configuration error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_asgi_config():
    """Test that ASGI is properly configured"""
    print("\n🧪 Testing ASGI Configuration...")
    
    try:
        from config.asgi import application
        
        if not hasattr(application, '__call__'):
            print("❌ ASGI application is not callable")
            return False
        
        print(f"✅ ASGI application: {application}")
        print(f"✅ ASGI app type: {type(application).__name__}")
        
        return True
    except Exception as e:
        print(f"❌ ASGI configuration error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_signals_registered():
    """Test that signal receivers are properly registered"""
    print("\n🧪 Testing Signal Registration...")
    
    try:
        from django.db.models.signals import post_save
        from apps.notifications.models import Notification
        from apps.common.audit import AuditLog
        
        # Check notification signals
        notification_receivers = post_save._live_receivers(Notification)
        print(f"✅ Notification post_save receivers: {len(notification_receivers)}")
        for receiver in notification_receivers:
            print(f"   - {receiver.__name__ if hasattr(receiver, '__name__') else receiver}")
        
        # Check audit log signals
        auditlog_receivers = post_save._live_receivers(AuditLog)
        print(f"✅ AuditLog post_save receivers: {len(auditlog_receivers)}")
        for receiver in auditlog_receivers:
            print(f"   - {receiver.__name__ if hasattr(receiver, '__name__') else receiver}")
        
        return True
    except Exception as e:
        print(f"❌ Signal registration error: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_test_user_exists():
    """Test that test user exists in database"""
    print("\n🧪 Testing Test User...")
    
    try:
        user = User.objects.filter(matricule='TESTADMIN').first()
        
        if not user:
            print("ℹ️  TESTADMIN user not found - creating it...")
            user = User.objects.create_user(
                matricule='TESTADMIN',
                email='testadmin@example.com',
                password='test123',
                is_staff=True,
                is_active=True,
                first_name='Test',
                last_name='Admin'
            )
            print(f"✅ Created TESTADMIN user (ID: {user.id})")
        else:
            print(f"✅ Found TESTADMIN user (ID: {user.id})")
            print(f"   - is_staff: {user.is_staff}")
            print(f"   - is_active: {user.is_active}")
            print(f"   - email: {user.email}")
        
        return True
    except Exception as e:
        print(f"❌ Test user error: {e}")
        import traceback
        traceback.print_exc()
        return False


def main():
    """Run all configuration tests"""
    print("=" * 60)
    print("WebSocket Configuration Test Suite")
    print("=" * 60)
    
    results = []
    
    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("CHANNEL_LAYERS", test_channel_layers_config()))
    results.append(("WebSocket Routing", test_routing_config()))
    results.append(("ASGI Configuration", test_asgi_config()))
    results.append(("Signal Registration", test_signals_registered()))
    results.append(("Test User", test_test_user_exists()))
    
    # Summary
    print("\n" + "=" * 60)
    print("📊 Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All configuration tests passed!")
        print("\n📝 Next steps:")
        print("   1. Start the backend: daphne -b 0.0.0.0 -p 8000 config.asgi:application")
        print("   2. Start the frontend: cd frontend && yarn dev")
        print("   3. Open http://localhost:5174 in your browser")
        print("   4. Login with TESTADMIN / test123")
        print("   5. Check browser console for WebSocket connections")
    else:
        print(f"\n⚠️  {total - passed} test(s) failed - fix these issues before running")
    
    return passed == total


if __name__ == '__main__':
    success = main()
    exit(0 if success else 1)

