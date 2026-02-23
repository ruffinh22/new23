#!/bin/bash

# Start Django backend with Gunicorn
# This is the production-grade server (also works for development)

set -e

cd "$(dirname "$0")/backend"

# Activate virtual environment
source venv/bin/activate

# Ensure gunicorn is installed
pip install gunicorn -q

# Start gunicorn
echo "Starting SGDRA Backend with Gunicorn..."
gunicorn config.wsgi:application \
    --bind 0.0.0.0:8000 \
    --workers 4 \
    --worker-class sync \
    --timeout 120 \
    --access-logfile - \
    --error-logfile - \
    --log-level info
