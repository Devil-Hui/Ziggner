#!/bin/bash
set -e

# =============================================================================
# Ziggner Setup & Entrypoint Script
# Supports: django | celery_worker | celery_beat
# =============================================================================

# ── Determine service type ────────────────────────────────────────────────────
if [ -n "$1" ]; then
    SERVICE_TYPE=$1
elif [ -z "$SERVICE_TYPE" ]; then
    echo "[ERROR] No service type specified"
    echo "Usage: ./setup.sh [django|celery_worker|celery_beat]"
    echo "Or set SERVICE_TYPE environment variable"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting service: $SERVICE_TYPE"

# ── Validate environment variables (production) ───────────────────────────────
if [ "$DJANGO_ENV" = "prod" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Validating environment variables..."
    python scripts/validate_env.py --env prod
fi

# ── Graceful shutdown handler ─────────────────────────────────────────────────
shutdown() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Received SIGTERM, shutting down gracefully..."
    if [ -n "$CHILD_PID" ]; then
        kill -TERM "$CHILD_PID" 2>/dev/null || true
        wait "$CHILD_PID" 2>/dev/null || true
    fi
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Shutdown complete."
    exit 0
}
trap shutdown SIGTERM SIGINT SIGQUIT

# ── Wait for dependent services ───────────────────────────────────────────────
wait_for_service() {
    local host=$1 port=$2 name=$3 max_retries=${4:-30}
    echo "[INFO] Waiting for $name ($host:$port)..."
    for i in $(seq 1 $max_retries); do
        if curl -s "http://$host:$port" >/dev/null 2>&1 || \
           timeout 1 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            echo "[INFO] $name is ready!"
            return 0
        fi
        sleep 2
    done
    echo "[WARN] $name did not become ready in time, proceeding anyway..."
}

wait_for_db() {
    local max_retries=${1:-30}
    echo "[INFO] Waiting for MySQL ($DB_HOST:$DB_PORT)..."
    for i in $(seq 1 $max_retries); do
        if python -c "
import MySQLdb
try:
    conn = MySQLdb.connect(
        host='$DB_HOST', port=$DB_PORT,
        user='$DB_USER', passwd='$DB_PASSWORD', db='$DB_NAME'
    )
    conn.close()
    print('OK')
except Exception:
    pass
" 2>/dev/null | grep -q OK; then
            echo "[INFO] MySQL is ready!"
            return 0
        fi
        sleep 2
    done
    echo "[WARN] MySQL did not become ready in time, proceeding anyway..."
}

# ── Database migration ────────────────────────────────────────────────────────
migrate() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running database migrations..."
    wait_for_db 60
    python manage.py migrate --noinput
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Migrations complete."
}

# ── Static files ──────────────────────────────────────────────────────────────
collectstatic() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Collecting static files..."
    python manage.py collectstatic --noinput --clear
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Static files collected."
}

# ── Start Django (Gunicorn) ───────────────────────────────────────────────────
start_django() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Gunicorn..."
    exec gunicorn -c project/gunicorn.conf.py project.wsgi:application
}

# ── Start Celery Worker ───────────────────────────────────────────────────────
# Memory: concurrency=1, max 50 tasks/child, max 200MB/child → prevents leaks
start_celery_worker() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Celery worker..."
    exec celery -A project worker \
        --loglevel=info \
        --concurrency=1 \
        --max-tasks-per-child=50 \
        --max-memory-per-child=200000 \
        --without-gossip \
        --without-mingle \
        --without-heartbeat
}

# ── Start Celery Beat ─────────────────────────────────────────────────────────
start_celery_beat() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Celery beat..."
    exec celery -A project beat \
        --loglevel=info \
        --scheduler django_celery_beat.schedulers:DatabaseScheduler
}

# ── Main ──────────────────────────────────────────────────────────────────────
case $SERVICE_TYPE in
    "django")
        migrate
        collectstatic
        start_django
        ;;
    "celery_worker")
        start_celery_worker
        ;;
    "celery_beat")
        start_celery_beat
        ;;
    *)
        echo "[ERROR] Unknown service type: $SERVICE_TYPE"
        echo "Valid: django, celery_worker, celery_beat"
        exit 1
        ;;
esac
