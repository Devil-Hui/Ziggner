# =============================================================================
# Gunicorn Production Config — 2 vCPU / 4GB RAM Server
# Target: ~100 concurrent users, Django REST API
# =============================================================================

import multiprocessing
import os

# ── Bind ──────────────────────────────────────────────────────────────────────
bind = "0.0.0.0:8000"
backlog = 2048

# ── Workers (CPU-bound formula with memory cap) ───────────────────────────────
# 2 vCPU → 2 workers with threads for I/O concurrency
# workers=2, threads=4 → 8 concurrent connections per instance
# Single worker memory: ~120-150MB (Django with preload)
workers = 2
threads = 4
worker_class = "gthread"

# ── Memory optimization ───────────────────────────────────────────────────────
# Preload app before forking → shared memory for code segment (~30MB savings)
preload_app = True

# Restart worker after 1000 requests → prevents slow memory leaks
max_requests = 1000
max_requests_jitter = 50

# ── Timeouts ──────────────────────────────────────────────────────────────────
# 120s to handle slow requests (batch import, image processing, ES rebuild)
timeout = 120
graceful_timeout = 30
keepalive = 5

# ── Worker naming ─────────────────────────────────────────────────────────────
proc_name = "ziggner-gunicorn"

# ── Logging ───────────────────────────────────────────────────────────────────
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("GUNICORN_LOG_LEVEL", "info")

# Access log format: method path status response_time_ms
access_log_format = '%(h)s %(l)s %(u)s %(t)s "%(r)s" %(s)s %(b)s "%(f)s" "%(a)s" %(L)sms'

# ── Graceful restart ──────────────────────────────────────────────────────────
# Send TERM → graceful shutdown → start new worker
# Avoids dropping connections during rolling updates
worker_tmp_dir = "/dev/shm"  # Use RAM for heartbeat files (faster, no disk I/O)
