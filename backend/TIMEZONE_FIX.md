# Correction du Problème de Fuseau Horaire MySQL

## Problème Identifié

```
ValueError: Database returned an invalid datetime value. 
Are time zone definitions for your database installed?
```

## Causes

1. **USE_TZ = True** : Django tentait de convertir les heures en UTC
2. **MySQL sans fuseaux horaires** : La base de données n'avait pas les définitions de fuseau horaire
3. **Données invalides dans django_celery_beat** : Certaines entrées avaient des datetime NULL ou '0000-00-00'

## Solutions Appliquées

### 1. Désactiver USE_TZ dans Django

**Fichier**: `backend/config/settings.py`

```python
# Avant:
USE_TZ = True

# Après:
USE_TZ = False  # Désactiver USE_TZ pour éviter les problèmes de fuseau horaire MySQL
```

**Raison**: Avec MySQL et les configurations de fuseaux horaires limitées, il est plus simple de gérer les heures en local sans conversion UTC.

### 2. Nettoyer les Données Problématiques

```bash
# Supprimer les entrées avec datetime invalides
mysql -u root -proot sgdra_db -e "
DELETE FROM django_celery_beat_periodictask 
WHERE last_run_at IS NULL OR last_run_at = '0000-00-00 00:00:00';
"
```

### 3. Configuration de Connexion MySQL Optimisée

**Fichier**: `backend/config/settings.py`

```python
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.mysql',
        'OPTIONS': {
            'charset': 'utf8mb4',
            'init_command': "SET sql_mode='STRICT_TRANS_TABLES'",
            'unix_socket': '/run/mysqld/mysqld.sock',
        },
        'CONN_MAX_AGE': 600,  # Réutiliser les connexions
    }
}
```

## Résultat

✅ Erreur corrigée
✅ Page admin `/admin/django_celery_beat/periodictask/` fonctionne
✅ Pas de conversion de fuseau horaire problématique

## Paramètres Actuels

```python
LANGUAGE_CODE = 'fr-fr'
TIME_ZONE = 'Africa/Porto-Novo'  # Fuseau horaire du serveur
USE_I18N = True                   # Internationalisation activée
USE_TZ = False                    # Fuseaux horaires désactivés
```

## Notes Importantes

- Les timestamps sont stockés en heure locale (Africa/Porto-Novo)
- Pas de conversion UTC automatique
- Compatible avec MySQL sans installation de fuseaux horaires
- Si vous avez besoin de fuseaux horaires multiples plus tard, installez `mysql_tzinfo_to_sql`:

```bash
# Installation des tables de fuseau horaire MySQL (Linux)
sudo mysql_tzinfo_to_sql /usr/share/zoneinfo | mysql -u root mysql
```

Puis réactivez `USE_TZ = True` dans settings.

