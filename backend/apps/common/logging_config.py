"""
Configuration du logging structuré pour SGDRA.
"""

import os
from django.conf import settings


def get_logging_config():
    """
    Retourne la configuration de logging basée sur les paramètres Django.
    """
    
    log_dir = getattr(settings, 'LOG_DIR', 'logs')
    log_level = getattr(settings, 'LOG_LEVEL', 'INFO')
    enable_file_logging = getattr(settings, 'ENABLE_FILE_LOGGING', True)
    
    # Créer le répertoire logs s'il n'existe pas
    if enable_file_logging and not os.path.exists(log_dir):
        os.makedirs(log_dir, exist_ok=True)
    
    logging_config = {
        'version': 1,
        'disable_existing_loggers': False,
        
        'formatters': {
            'verbose': {
                'format': '{levelname} {asctime} {name} {funcName}:{lineno:d} {message}',
                'style': '{',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
            'simple': {
                'format': '{levelname} {asctime} {message}',
                'style': '{',
                'datefmt': '%Y-%m-%d %H:%M:%S',
            },
        },
        
        'handlers': {
            'console': {
                'level': log_level,
                'class': 'logging.StreamHandler',
                'formatter': 'simple',
            },
        },
        
        'loggers': {
            'django': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False,
            },
            'apps': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False,
            },
            'apps.documents': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False,
            },
            'apps.users': {
                'level': log_level,
                'handlers': ['console'],
                'propagate': False,
            },
        },
        
        'root': {
            'level': log_level,
            'handlers': ['console'],
        }
    }
    
    # Ajouter les handlers fichier si activé
    if enable_file_logging:
        logging_config['handlers'].update({
            'file_all': {
                'level': log_level,
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(log_dir, 'app.log'),
                'maxBytes': 10 * 1024 * 1024,  # 10MB
                'backupCount': 5,
                'formatter': 'verbose',
            },
            'file_errors': {
                'level': 'ERROR',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(log_dir, 'errors.log'),
                'maxBytes': 10 * 1024 * 1024,
                'backupCount': 10,
                'formatter': 'verbose',
            },
            'file_audit': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(log_dir, 'audit.log'),
                'maxBytes': 50 * 1024 * 1024,  # 50MB
                'backupCount': 20,
                'formatter': 'verbose',
            },
            'file_auth': {
                'level': 'INFO',
                'class': 'logging.handlers.RotatingFileHandler',
                'filename': os.path.join(log_dir, 'auth.log'),
                'maxBytes': 20 * 1024 * 1024,  # 20MB
                'backupCount': 10,
                'formatter': 'verbose',
            },
        })
        
        # Mettre à jour les handlers pour les loggers
        logging_config['loggers']['django']['handlers'].extend(['file_all', 'file_errors'])
        logging_config['loggers']['apps']['handlers'].extend(['file_all', 'file_errors', 'file_audit'])
        logging_config['loggers']['apps.documents']['handlers'].extend(['file_all', 'file_errors', 'file_audit'])
        logging_config['loggers']['apps.users']['handlers'].extend(['file_all', 'file_errors', 'file_audit', 'file_auth'])
        logging_config['root']['handlers'].extend(['file_all', 'file_errors'])
    
    return logging_config
