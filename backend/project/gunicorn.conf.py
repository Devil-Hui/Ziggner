# =============================================================================
# Gunicorn Production Config — 2 vCPU / 4GB RAM (host budget ≤ ~60% RAM)
# Target: storefront + admin concurrent; prioritize stability over peak RPS
# =============================================================================

import os

_port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{_port}"
backlog = int(os.getenv("GUNICORN_BACKLOG", "512"))

# One process keeps Django's shared imports within the 2C4G memory envelope;
# four bounded threads cover the storefront/admin concurrency target.
workers = int(os.getenv("GUNICORN_WORKERS", "1"))
threads = int(os.getenv("GUNICORN_THREADS", "4"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gthread")

preload_app = True
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "800"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "40"))

timeout = int(os.getenv("GUNICORN_TIMEOUT", "60"))
graceful_timeout = int(os.getenv("GUNICORN_GRACEFUL_TIMEOUT", "20"))
keepalive = int(os.getenv("GUNICORN_KEEPALIVE", "5"))

proc_name = "ziggner-gunicorn"
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")
access_log_format = (
    '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(L)sms'
)
worker_tmp_dir = os.getenv("GUNICORN_WORKER_TMP_DIR", "/dev/shm")  # nosec B108
