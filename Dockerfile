# Dockerfile - SGDRA Backend (Frontend pré-compilé)

# === Stage 1: Backend Builder ===
FROM python:3.11-slim AS backend-builder

WORKDIR /app/backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    default-libmysqlclient-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Copy backend requirements
COPY backend/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# === Stage 2: Production ===
FROM python:3.11-slim

LABEL maintainer="SGDRA Team"
LABEL description="SGDRA Backend + Frontend Production Server"

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y \
    libmariadb3 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN useradd -m -u 1000 appuser

# Copy Python dependencies from builder
COPY --from=backend-builder /usr/local/lib/python3.11/site-packages /usr/local/lib/python3.11/site-packages
COPY --from=backend-builder /usr/local/bin /usr/local/bin

# Copy backend code
COPY backend/ ./backend/

# Copy pre-built frontend (from local build script)
COPY backend/static/frontend ./backend/static/frontend/

# Create necessary directories
RUN mkdir -p /app/backend/logs \
    && mkdir -p /app/backend/staticfiles \
    && mkdir -p /app/backend/media \
    && chown -R appuser:appuser /app

# Set user
USER appuser

WORKDIR /app/backend

# Collect Django static files
RUN python manage.py collectstatic --noinput --clear 2>/dev/null || true

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health/ || exit 1

# Expose port
EXPOSE 8000

# Run gunicorn
CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4", "--timeout", "120", "--access-logfile", "-", "--error-logfile", "-"]
