# =============================================================================
# Gunicorn Production Config — 2 vCPU / 4GB RAM (host budget ≤ ~60% RAM)
# Target: storefront + admin concurrent; prioritize stability over peak RPS
# =============================================================================

import os

_port = os.getenv("PORT", "8000")
bind = f"0.0.0.0:{_port}"
backlog = int(os.getenv("GUNICORN_BACKLOG", "512"))

# 2C4G 约束：固定 2 个 gevent 协程 worker（协程而非线程承载高并发 I/O），
# 配合 DJANGO_DB_DRIVER=pymysql 纯 Python 驱动以兼容 gevent 协作式调度。
# 单进程内存预算见 docker-compose.prod.yml（mem_limit 544m）。
workers = int(os.getenv("GUNICORN_WORKERS", "2"))
threads = int(os.getenv("GUNICORN_THREADS", "1"))
worker_class = os.getenv("GUNICORN_WORKER_CLASS", "gevent")

# preload_app 必须为 False（gevent worker 关键）：
# preload=True 时 master 在 fork 前加载 Django app（会导入 boto3/urllib3 → ssl），
# 随后 gevent worker 的 monkey.patch_all() 在 ssl 已导入后才执行，
# 触发 gevent SSLContext.options setter 无限递归（RecursionError），
# 上传视频（boto3 构建 ssl_context）时 worker 崩溃 → 502 / ERR_CONNECTION_CLOSED。
# False 时每个 worker 先 patch_all() 再加载 app，patch 顺序正确。
preload_app = False
# 每个 worker 处理 1000 请求后平滑重启，防止内存泄漏累积
max_requests = int(os.getenv("GUNICORN_MAX_REQUESTS", "1000"))
max_requests_jitter = int(os.getenv("GUNICORN_MAX_REQUESTS_JITTER", "100"))

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
