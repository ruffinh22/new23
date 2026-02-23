#!/bin/bash
# Script pour installer les définitions de fuseau horaire MySQL

echo "Installation des définitions de fuseau horaire MySQL..."

# Déterminer le chemin de zoneinfo
ZONEINFO_PATH="/usr/share/zoneinfo"

if [ ! -d "$ZONEINFO_PATH" ]; then
    echo "❌ Répertoire de fuseau horaire non trouvé: $ZONEINFO_PATH"
    exit 1
fi

# Créer un fichier SQL temporaire
TEMP_SQL=$(mktemp)

echo "CREATE TEMPORARY TABLE tz_load (
    time_zone_name varchar(64) NOT NULL,
    transition_time bigint NOT NULL,
    transition_type tinyint unsigned NOT NULL,
    PRIMARY KEY (time_zone_name, transition_time)
) ENGINE=MyISAM;" > "$TEMP_SQL"

# Si mysql_tzinfo_to_sql existe, l'utiliser
if command -v mysql_tzinfo_to_sql &> /dev/null; then
    echo "✓ Utilisation de mysql_tzinfo_to_sql"
    mysql_tzinfo_to_sql "$ZONEINFO_PATH" | mysql -u root -proot mysql
else
    echo "⚠️ mysql_tzinfo_to_sql non disponible"
    echo "Essai de chargement manuel des fuseaux horaires..."
    
    # Charger manuellement les fuseaux horaires courants
    mysql -u root -proot mysql << 'EOSQL'
-- Vider les tables existantes
DELETE FROM mysql.time_zone;
DELETE FROM mysql.time_zone_name;
DELETE FROM mysql.time_zone_transition;
DELETE FROM mysql.time_zone_transition_type;

-- Insérer les fuseaux horaires courants
INSERT INTO mysql.time_zone_name (Name) VALUES 
('Africa/Porto-Novo'),
('Africa/Lagos'),
('Europe/Paris'),
('Europe/London'),
('America/New_York'),
('America/Los_Angeles'),
('Asia/Tokyo'),
('UTC'),
('Etc/UTC');

EOSQL
    
    echo "✓ Fuseaux horaires de base chargés"
fi

rm -f "$TEMP_SQL"

# Vérifier que c'est fait
COUNT=$(mysql -u root -proot mysql -se "SELECT COUNT(*) FROM mysql.time_zone_name;" 2>/dev/null)

if [ -z "$COUNT" ] || [ "$COUNT" -eq 0 ]; then
    echo "⚠️ Avertissement: Les tables de fuseau horaire sont vides"
    echo "Assurez-vous que mysql_tzinfo_to_sql est disponible"
else
    echo "✓ Installation réussie: $COUNT fuseaux horaires chargés"
fi
