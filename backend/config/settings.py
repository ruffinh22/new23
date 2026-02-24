# ========================================
# JOUR 1 - CONFIGURATION DJANGO COMPLÈTE
# ========================================

# ============================================================
# FILE: backend/config/settings.py
# ============================================================
"""
Django settings for SGDRA project.
Charges les variables d'environnement depuis .env
"""
from pathlib import Path
from datetime import timedelta
import os
import logging.config
from dotenv import load_dotenv
import dj_database_url
from apps.common.logging_config import get_logging_config
import sentry_sdk
from sentry_sdk.integrations.django import DjangoIntegration
from sentry_sdk.integrations.celery import CeleryIntegration

# Charger les variables d'environnement depuis .env
load_dotenv()

# ============================================================
# PROFESSIONAL FIX: Patch Django's register_converter to handle "already registered" gracefully
# This prevents ValueError when multiple DRF routers use format_suffix_patterns
# ============================================================
from django.urls import converters as django_converters
_original_register_converter = django_converters.register_converter

def safe_register_converter(converter, type_name):
    """
    Wrapper around register_converter that gracefully handles already-registered converters.
    Multiple DRF routers calling format_suffix_patterns cause this, which is expected.
    """
    try:
        return _original_register_converter(converter, type_name)
    except ValueError as e:
        if "already registered" in str(e):
            # This converter was already registered - this is fine for format_suffix_patterns
            # Just return without error
            pass
        else:
            raise

# Apply the patch
django_converters.register_converter = safe_register_converter

# Use native mysqlclient only - DO NOT install pymysql to avoid version conflicts with Anaconda

# Build paths inside the project
BASE_DIR = Path(__file__).resolve().parent.parent

# ==========================================
# CONFIGURATION DE BASE - SÉCURITÉ
# ==========================================

# SECURITY WARNING: keep the secret key used in production secret!
SECRET_KEY = os.getenv('SECRET_KEY', 'django-insecure-dev-key-change-in-production')

# SECURITY WARNING: don't run with debug turned on in production!
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'  # Default: False (production-safe)

ENVIRONMENT = os.getenv('ENVIRONMENT', 'development')

# Liste des hosts autorisés
_default_hosts = 'localhost,127.0.0.1,0.0.0.0,testserver,10.0.5.18,10.0.5.18:8443,172.20.0.5,172.20.0.5:8000,localhost:8000,backend,backend:8000'
_env_hosts = os.getenv('ALLOWED_HOSTS', '').strip()
_all_hosts = ','.join(filter(None, [_env_hosts, _default_hosts]))
ALLOWED_HOSTS = [h.strip() for h in _all_hosts.split(',') if h.strip()]

# Application definition
INSTALLED_APPS = [
    # WebSocket support
    'channels',
    
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    
    # Third party apps
    'rest_framework',
    'rest_framework_simplejwt',
    'corsheaders',
    'drf_spectacular',
    'import_export',
    'django_celery_beat',
    'django_celery_results',
    
    # Local apps
    'apps.users.apps.UsersConfig',
    'apps.common',
    'apps.documents',
    'apps.folders',
    'apps.routing_rules',
    'apps.notifications',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'apps.common.static_middleware.SimpleStaticFilesMiddleware',  # Serve static files (must be early)
    'whitenoise.middleware.WhiteNoiseMiddleware',  # Fallback for production
    'corsheaders.middleware.CorsMiddleware',  # CORS doit être avant CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'apps.common.exceptions.ErrorLoggingMiddleware',  # Custom error logging and slow request detection
    'apps.common.middleware.AuditMiddleware',  # Logging for logout and 403 errors
    'apps.common.audit_middleware.AuditLoggingMiddleware',  # Audit logging for all actions
]

ROOT_URLCONF = 'config.urls'

# Disable automatic slash appending to avoid 301 redirects
APPEND_SLASH = False
USE_X_FORWARDED_HOST = True

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ==========================================
# ASGI CONFIGURATION (WebSocket Support)
# ==========================================
ASGI_APPLICATION = 'config.asgi.application'

# Channel Layers Configuration (using Redis)
# For development: Redis should be running on localhost:6379
# For Docker: Redis runs on sgdra-redis:6379
import socket

def is_redis_available(host, port):
    """Check if Redis is accessible"""
    try:
        socket.create_connection((host, port), timeout=1)
        return True
    except (socket.timeout, socket.error, OSError):
        return False

# Try localhost first for development, then Docker hostname
REDIS_HOST = 'localhost' if is_redis_available('localhost', 6379) else 'sgdra-redis'
REDIS_PORT = 6379

CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [(REDIS_HOST, REDIS_PORT)],
            "capacity": 1500,
            "expiry": 10,
        },
    },
}

print(f"🔌 Redis configured for {REDIS_HOST}:{REDIS_PORT}")

# ==========================================
# DATABASE CONFIGURATION
# ==========================================
# Support pour DATABASE_URL (production) ou config séparée (dev)

if os.getenv('DATABASE_URL'):
    db_config = dj_database_url.config(
        default=os.getenv('DATABASE_URL'),
        conn_max_age=600,
        conn_health_checks=True,
    )
    # Add MySQL options for authentication compatibility
    db_config['OPTIONS'] = {
        'charset': 'utf8mb4',
        'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
    }
    DATABASES = {'default': db_config}
else:
    DATABASES = {
        'default': {
            'ENGINE': os.getenv('DB_ENGINE', 'django.db.backends.mysql'),
            'NAME': os.getenv('DB_NAME', 'sgdra_db'),
            'USER': os.getenv('DB_USER', 'root'),
            'PASSWORD': os.getenv('DB_PASSWORD', 'root'),
            'HOST': os.getenv('DB_HOST', 'localhost'),
            'PORT': os.getenv('DB_PORT', '3306'),
            'CONN_MAX_AGE': 600,
            'CONN_HEALTH_CHECKS': True,
            'OPTIONS': {
                'connect_timeout': 10,
            }
        }
    }

# Custom User Model
AUTH_USER_MODEL = 'users.User'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 8}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Custom authentication backend for matricule field
AUTHENTICATION_BACKENDS = [
    'apps.users.backends.MatriculeBackend',
    'django.contrib.auth.backends.ModelBackend',  # Fallback for django admin
]

# Internationalization
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Porto-Novo'  # Benin timezone
USE_I18N = True
USE_TZ = True  # Réactiver pour Celery

# Static files (CSS, JavaScript, Images)
STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
STATICFILES_DIRS = [
    BASE_DIR / 'static',  # Contains frontend builds
]

# Storage configuration
# In development: use default filesystem storage
# In production: use WhiteNoise compressed storage
if DEBUG:
    # Development: no special storage needed
    # SimpleStaticFilesMiddleware + WhiteNoiseMiddleware handle serving
    pass
else:
    # Production: use WhiteNoise with compression
    STATICFILES_STORAGE = 'whitenoise.storage.CompressedManifestStaticFilesStorage'

# Media files (uploads)
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

# Default primary key field type
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ==========================================
# LOGGING CONFIGURATION
# ==========================================
LOG_DIR = BASE_DIR / 'logs'  # Absolute path to logs directory
LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')  # INFO, DEBUG, WARNING, ERROR
ENABLE_FILE_LOGGING = os.getenv('ENABLE_FILE_LOGGING', 'True').lower() == 'true'  # Enable file logging in production

# REST Framework configuration
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'EXCEPTION_HANDLER': 'apps.common.exceptions.custom_exception_handler',
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': int(os.getenv('DEFAULT_PAGE_SIZE') or '25'),
    'MAX_PAGE_SIZE': int(os.getenv('MAX_PAGE_SIZE') or '100'),
    'DEFAULT_FILTER_BACKENDS': (
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ),
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        'anon': os.getenv('ANON_THROTTLE_RATE') or '100/hour',
        'user': os.getenv('USER_THROTTLE_RATE') or '1000/hour',
    },
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',
    'DATETIME_FORMAT': '%Y-%m-%d %H:%M:%S',
    'DATE_FORMAT': '%Y-%m-%d',
}

# JWT Settings
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=int(os.getenv('JWT_ACCESS_TOKEN_LIFETIME') or '15')),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=int(os.getenv('JWT_REFRESH_TOKEN_LIFETIME') or '7')),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
}

# CORS Settings
CORS_ALLOWED_ORIGINS = [
    h.strip() for h in os.getenv(
        'CORS_ALLOWED_ORIGINS',
        'http://localhost:5173,http://127.0.0.1:5173'
    ).split(',')
]

CORS_ALLOW_CREDENTIALS = os.getenv('CORS_ALLOW_CREDENTIALS', 'True').lower() == 'true'

CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]

CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Security Headers
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.getenv('SECURE_SSL_REDIRECT', 'False').lower() == 'true'
SECURE_HSTS_SECONDS = int(os.getenv('SECURE_HSTS_SECONDS') or '0')
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv('SECURE_HSTS_INCLUDE_SUBDOMAINS', 'False').lower() == 'true'
SECURE_HSTS_PRELOAD = os.getenv('SECURE_HSTS_PRELOAD', 'False').lower() == 'true'

# Session and Cookie Security
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() == 'true'
SESSION_COOKIE_HTTPONLY = True  # Always True for security
SESSION_COOKIE_SAMESITE = 'Lax'

CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() == 'true'
CSRF_COOKIE_HTTPONLY = True  # Always True for security
CSRF_COOKIE_SAMESITE = 'Lax'

# Content Security Policy
SECURE_CONTENT_SECURITY_POLICY = {
    'default-src': ("'self'",),
    'script-src': ("'self'", "'unsafe-inline'"),
    'style-src': ("'self'", "'unsafe-inline'"),
    'img-src': ("'self'", 'data:', 'https:'),
}

# API Documentation (Swagger)
SPECTACULAR_SETTINGS = {
    'TITLE': 'SGDRA API',
    'DESCRIPTION': 'Système de Gestion Documentaire avec Routage Automatique',
    'VERSION': '1.0.0',
    'SERVE_INCLUDE_SCHEMA': False,
    'COMPONENT_SPLIT_REQUEST': True,
}

# File Upload Settings
FILE_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB
DATA_UPLOAD_MAX_MEMORY_SIZE = 10485760  # 10 MB

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/jpeg',
    'image/png',
    'text/plain',
    'text/csv',
]

# Email Configuration
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', 'django.core.mail.backends.console.EmailBackend')
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', '587'))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() == 'true'
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '')
DEFAULT_FROM_EMAIL = os.getenv('DEFAULT_FROM_EMAIL', 'noreply@sgdra.com')

# Celery Configuration
CELERY_BROKER_URL = os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0')
CELERY_RESULT_BACKEND = os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = 'UTC'
CELERY_TASK_TRACK_STARTED = True
CELERY_TASK_TIME_LIMIT = 30 * 60  # 30 minutes

# Django-Celery-Beat configuration
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

# Security Settings (Production)
if not DEBUG:
    # SECURE_SSL_REDIRECT disabled - Nginx reverse proxy handles HTTPS
    # Django trusts X-Forwarded-Proto header from Nginx (via SECURE_PROXY_SSL_HEADER)
    # Port 8081 used instead of 443, so SSL redirect not needed
    SECURE_SSL_REDIRECT = False
    SESSION_COOKIE_SECURE = False  # Temporarily disabled for HTTP on port 9000
    CSRF_COOKIE_SECURE = False  # Temporarily disabled for HTTP on port 9000
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    SECURE_HSTS_SECONDS = 0  # Disable HSTS for now
    SECURE_HSTS_INCLUDE_SUBDOMAINS = False
    SECURE_HSTS_PRELOAD = False

# Logging Configuration - Import from logging_config.py
LOGGING = get_logging_config()

# ==========================================
# SENTRY CONFIGURATION - MONITORING & ALERTES
# ==========================================
SENTRY_DSN = os.getenv('SENTRY_DSN', '')

if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[
            DjangoIntegration(),
            CeleryIntegration(),
        ],
        traces_sample_rate=float(os.getenv('SENTRY_TRACE_SAMPLE_RATE', '0.1')),
        send_default_pii=False,  # Ne pas envoyer d'infos personnelles à Sentry
        environment=ENVIRONMENT,
        release=os.getenv('APP_VERSION', '1.0.0'),
        before_send=lambda event, hint: event if ENVIRONMENT == 'production' else None,  # Seulement en prod
    )








# ============================================================
# INSTRUCTIONS DE CRÉATION DES FICHIERS
# ============================================================
"""
1. Créer le dossier logs:
   mkdir backend/logs

2. Créer settings.py:
   Copier le contenu ci-dessus dans backend/config/settings.py

3. Créer urls.py:
   Copier le contenu dans backend/config/urls.py

4. Créer wsgi.py:
   Copier le contenu dans backend/config/wsgi.py

5. Créer asgi.py:
   Copier le contenu dans backend/config/asgi.py

6. Vérifier la configuration:
   cd backend
   source venv/bin/activate
   python manage.py check

7. Si tout est OK, vous verrez:
   System check identified no issues (0 silenced).
"""