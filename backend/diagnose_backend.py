#!/usr/bin/env python
"""
Script de diagnostic complet du backend SGDRA.
Vérifie la configuration, les logs, les base de données, etc.
"""
import os
import sys
import django
from pathlib import Path

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
sys.path.insert(0, os.path.dirname(__file__))

try:
    django.setup()
except Exception as e:
    print(f"❌ ERREUR Django Setup: {e}")
    sys.exit(1)

from django.conf import settings
from django.db import connection
import logging

print("\n" + "="*70)
print("🔍 DIAGNOSTIC COMPLET DU BACKEND SGDRA")
print("="*70)

# 1. Configuration Django
print("\n1️⃣  CONFIGURATION DJANGO")
print("-" * 70)
print(f"✓ DEBUG: {settings.DEBUG}")
print(f"✓ ENVIRONMENT: {settings.ENVIRONMENT}")
print(f"✓ SECRET_KEY: {'*' * 20}...{settings.SECRET_KEY[-10:]}")  
print(f"✓ ALLOWED_HOSTS: {settings.ALLOWED_HOSTS[:3]}")

# 2. Base de données
print("\n2️⃣  BASE DE DONNÉES")
print("-" * 70)
try:
    with connection.cursor() as cursor:
        cursor.execute("SELECT 1")
    print("✓ Connexion MySQL/MariaDB: OK ✅")
    db_config = settings.DATABASES['default']
    print(f"  - Engine: {db_config['ENGINE']}")
    print(f"  - Host: {db_config['HOST']}")
    print(f"  - Port: {db_config['PORT']}")
    print(f"  - Database: {db_config['NAME']}")
except Exception as e:
    print(f"❌ Connexion MySQL/MariaDB ÉCHOUÉE: {e}")

# 3. Configuration Logging
print("\n3️⃣  CONFIGURATION LOGGING")
print("-" * 70)
log_dir = getattr(settings, 'LOG_DIR', 'logs')
log_level = getattr(settings, 'LOG_LEVEL', 'INFO')
enable_file_logging = getattr(settings, 'ENABLE_FILE_LOGGING', True)

print(f"✓ LOG_DIR: {log_dir}")
print(f"✓ LOG_LEVEL: {log_level}")
print(f"✓ ENABLE_FILE_LOGGING: {enable_file_logging}")

# Vérifier les fichiers de logs
print("\n  📁 Fichiers de logs:")
if isinstance(log_dir, Path):
    log_dir = str(log_dir)
    
if os.path.exists(log_dir):
    log_files = os.listdir(log_dir)
    for f in log_files:
        fpath = os.path.join(log_dir, f)
        size = os.path.getsize(fpath)
        size_mb = size / (1024 * 1024)
        print(f"  - {f}: {size_mb:.2f} MB")
else:
    print(f"  ❌ Répertoire {log_dir} n'existe pas!")

# 4. Redis Configuration
print("\n4️⃣  REDIS CONFIGURATION")
print("-" * 70)
redis_url = settings.CELERY_BROKER_URL
print(f"✓ CELERY_BROKER_URL: {redis_url}")

try:
    import redis
    redis_host = redis_url.split('//')[1].split(':')[0]
    redis_port = int(redis_url.split(':')[-1].split('/')[0])
    r = redis.Redis(host=redis_host, port=redis_port, socket_connect_timeout=2)
    r.ping()
    print("✓ Connexion Redis: OK ✅")
except Exception as e:
    print(f"⚠️  Redis non accessible: {e}")

# 5. Email Configuration
print("\n5️⃣  EMAIL CONFIGURATION")
print("-" * 70)
print(f"✓ EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"✓ EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"✓ EMAIL_PORT: {settings.EMAIL_PORT}")

# 6. Celery Configuration
print("\n6️⃣  CELERY CONFIGURATION")
print("-" * 70)
print(f"✓ CELERY_BROKER_URL: {settings.CELERY_BROKER_URL}")
print(f"✓ CELERY_RESULT_BACKEND: {settings.CELERY_RESULT_BACKEND}")
print(f"✓ CELERY_TIMEZONE: {settings.CELERY_TIMEZONE}")

# 7. Applications installées
print("\n7️⃣  APPLICATIONS INSTALLÉES")
print("-" * 70)
for app in ['django', 'rest_framework', 'drf_spectacular', 'corsheaders']:
    print(f"✓ {app}")

print("\n✓ Apps SGDRA:")
for app in settings.INSTALLED_APPS:
    if app.startswith('apps'):
        print(f"  - {app}")

# 8. Fichiers statiques
print("\n8️⃣  FICHIERS STATIQUES")
print("-" * 70)
print(f"✓ STATIC_ROOT: {settings.STATIC_ROOT}")
print(f"✓ STATIC_URL: {settings.STATIC_URL}")

if os.path.exists(settings.STATIC_ROOT):
    static_files = len([f for f in os.listdir(settings.STATIC_ROOT) if os.path.isfile(os.path.join(settings.STATIC_ROOT, f))])
    print(f"  - Fichiers statiques trouvés: {static_files}")
else:
    print(f"  ⚠️  Répertoire STATIC_ROOT n'existe pas")

# 9. Media files
print("\n9️⃣  MEDIA FILES")
print("-" * 70)
print(f"✓ MEDIA_ROOT: {settings.MEDIA_ROOT}")
print(f"✓ MEDIA_URL: {settings.MEDIA_URL}")

if os.path.exists(settings.MEDIA_ROOT):
    media_files = len([f for f in os.listdir(settings.MEDIA_ROOT) if os.path.isfile(os.path.join(settings.MEDIA_ROOT, f))])
    print(f"  - Fichiers media trouvés: {media_files}")

# 10. Models et Migrations
print("\n🔟 MODÈLES ET MIGRATIONS")
print("-" * 70)
try:
    from django.core.management import call_command
    from django.db.migrations.loader import MigrationLoader
    
    loader = MigrationLoader(None, ignore_no_migrations=True)
    print(f"✓ Migrations chargées: {len(loader.migrated_apps)} apps avec migrations")
    
    # Vérifier les migrations non appliquées
    from django.db.migrations.executor import MigrationExecutor
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    
    if plan:
        print(f"⚠️  {len(plan)} migrations non appliquées!")
    else:
        print("✓ Toutes les migrations sont appliquées")
except Exception as e:
    print(f"⚠️  Erreur lors de la vérification des migrations: {e}")

# 11. Users et permissions
print("\n1️⃣1️⃣  UTILISATEURS ET PERMISSIONS")
print("-" * 70)
try:
    from apps.users.models import User
    user_count = User.objects.count()
    admin_count = User.objects.filter(is_staff=True).count()
    print(f"✓ Utilisateurs totaux: {user_count}")
    print(f"✓ Administrateurs: {admin_count}")
except Exception as e:
    print(f"❌ Erreur: {e}")

# 12. Résumé
print("\n" + "="*70)
print("✅ DIAGNOSTIC TERMINÉ")
print("="*70 + "\n")
