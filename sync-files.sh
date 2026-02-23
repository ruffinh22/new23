#!/bin/bash

# Simple file sync to server - no Docker rebuild needed
# Just copies compiled frontend files

rsync -avz --delete /home/lidruf/sgdra/sgdra/backend/static/frontend/ erpgmc@10.0.5.18:/srv/sgdra/backend/static/frontend/

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Files synced successfully"
    echo ""
    # Restart nginx to clear cache
    ssh erpgmc@10.0.5.18 "cd /srv/sgdra && docker-compose -f docker-compose.prod.yml restart nginx > /dev/null 2>&1"
    echo "✅ Nginx restarted"
else
    echo "❌ Sync failed"
    exit 1
fi
