#!/bin/bash
set -e

CHILD_PIDS=()

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
    python scripts/validate_env.py prod
fi

# ── Graceful shutdown handler ─────────────────────────────────────────────────
stop_children() {
    for child_pid in "${CHILD_PIDS[@]}"; do
        kill -TERM "$child_pid" 2>/dev/null || true
    done
    for child_pid in "${CHILD_PIDS[@]}"; do
        wait "$child_pid" 2>/dev/null || true
    done
}

shutdown() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Received SIGTERM, shutting down gracefully..."
    stop_children
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
    # MySQL-only DatabaseCache 表（幂等）
    python manage.py createcachetable 2>/dev/null || true
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Migrations complete."
}

# ── 全量初始化（幂等，仅 django 服务在启动时执行一次）──
# 顺序约束（重要）：
#   1) 先建表（migrate）
#   2) 再手动创建超级管理员：docker compose exec web python manage.py createsuperuser
#   3) 播种 RBAC 角色权限矩阵 + 同步审核组角色
#   4) 创建 Django 角色组
#   5) 收集静态资源
init_system() {
    mkdir -p logs  # dev compose 卷挂载会覆写容器内的 logs/, 需重建
    migrate
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Bootstrapping RBAC role-permission matrix..."
    python manage.py rbac_bootstrap
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Syncing admin-group roles to RBAC..."
    python manage.py sync_admin_group_roles
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Setting up Django role groups..."
    python manage.py setup_groups || echo "[WARN] setup_groups 执行失败，请检查"
    collectstatic
}

# ── Static files ──────────────────────────────────────────────────────────────
collectstatic() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Collecting static files..."
    python manage.py collectstatic --noinput --clear
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Static files collected."
}

# ── Start Django (Gunicorn) ───────────────────────────────────────────────────
start_django() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Gunicorn and Daphne..."
    gunicorn -c project/gunicorn.conf.py project.wsgi:application &
    gunicorn_pid=$!
    daphne -b 0.0.0.0 -p "${DAPHNE_PORT:-8001}" project.asgi:application &
    daphne_pid=$!
    CHILD_PIDS=("${gunicorn_pid}" "${daphne_pid}")

    set +e
    wait -n "${gunicorn_pid}" "${daphne_pid}"
    runtime_status=$?
    set -e
    stop_children
    exit "${runtime_status}"
}

# ── Start Celery Worker ───────────────────────────────────────────────────────
# 2C4G: concurrency=1, 更低 max-memory-per-child，避免与 Gunicorn/MySQL 抢内存
start_celery_worker() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Celery worker..."
    CONC="${CELERY_CONCURRENCY:-1}"
    MAX_TASKS="${CELERY_MAX_TASKS_PER_CHILD:-40}"
    # KiB: 120MB default (was 200MB)
    MAX_MEM="${CELERY_MAX_MEMORY_PER_CHILD:-120000}"
    # embedded beat: dev 环境 worker + beat 合并运行，省一个容器
    EXTRA=()
    if [ "${CELERY_BEAT_ENABLED:-false}" = "true" ]; then
        EXTRA=(-B --scheduler "${CELERY_BEAT_SCHEDULER:-django_celery_beat.schedulers:DatabaseScheduler}")
    fi
    exec celery -A project worker \
        --loglevel="${CELERY_LOG_LEVEL:-info}" \
        --concurrency="$CONC" \
        --queues="${CELERY_QUEUE:-default,image_process,batch_import,ranking}" \
        --hostname="${CELERY_NODENAME:-celery@%h}" \
        --max-tasks-per-child="$MAX_TASKS" \
        --max-memory-per-child="$MAX_MEM" \
        --without-gossip \
        --without-mingle \
        --without-heartbeat \
        "${EXTRA[@]}"
}

# ── Start Celery Beat ─────────────────────────────────────────────────────────
start_celery_beat() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting Celery beat..."
    exec celery -A project beat \
        --loglevel=info \
        --scheduler "${CELERY_BEAT_SCHEDULER:-django_celery_beat.schedulers:DatabaseScheduler}" \
        --schedule "${CELERY_BEAT_SCHEDULE_FILE:-/tmp/celerybeat-schedule}"
}

# ── Main ──────────────────────────────────────────────────────────────────────
case $SERVICE_TYPE in
    "django")
        init_system
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
