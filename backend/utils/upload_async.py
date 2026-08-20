"""R2 上传异步化 — 2C4G 约束下避免大文件 I/O 阻塞 gunicorn worker。

设计：
- 视图校验文件后，把原始字节落到共享卷（django-app 与 celery-worker 都挂载 media_data）
  的临时目录，再 enqueue Celery 任务，主线程立即返回 202 Accepted + 轮询地址。
- Celery worker 取任务 → 受全局信号量（≤3 并发上传）约束 → default_storage.save 到 R2
  → 把结果 URL 写入缓存 → 删除临时文件。
- 前端通过 /api/v1/media/status/{upload_id}/ 轮询拿到最终 URL。
- 为避免在未对接前端轮询前破坏线上上传，提供 ASYNC_UPLOAD_ENABLED 开关：
  关闭时走原同步落盘（返回 200 + url），开启时走 202 异步。默认关闭，验证后再翻。
"""

from __future__ import annotations

import base64
import os
import uuid

from celery import shared_task
from django.conf import settings
from django.core.cache import cache
from django.core.files.base import ContentFile

UPLOAD_SEMAPHORE_KEY = "r2:upload:semaphore"
UPLOAD_SEMAPHORE_MAX = 3  # 全局并发上传上限（2C4G：防 I/O 阻塞拖垮 CPU）
UPLOAD_RESULT_TTL = 3600
_TMP_DIRNAME = ".tmp_uploads"


def async_upload_enabled() -> bool:
    return bool(getattr(settings, "ASYNC_UPLOAD_ENABLED", False))


def _tmp_path(upload_id: str, ext: str) -> str:
    base = getattr(settings, "MEDIA_ROOT", "/app/media")
    tmp_dir = os.path.join(base, _TMP_DIRNAME)
    os.makedirs(tmp_dir, exist_ok=True)
    return os.path.join(tmp_dir, f"{upload_id}{ext}")


def _acquire_slot() -> bool:
    """Redis 原子信号量：当前并发 < 上限才放行，否则返回 False（任务稍后重试）。"""
    try:
        from django_redis import get_redis_connection

        conn = get_redis_connection("default")
        lua = """
        local cur = redis.call('INCR', KEYS[1])
        if cur > tonumber(ARGV[1]) then
          redis.call('DECR', KEYS[1])
          return 0
        end
        redis.call('EXPIRE', KEYS[1], 60)
        return 1
        """
        return bool(conn.eval(lua, 1, UPLOAD_SEMAPHORE_KEY, UPLOAD_SEMAPHORE_MAX))
    except Exception:
        return True  # 信号量不可用时放行，不阻塞上传


def _release_slot() -> None:
    try:
        from django_redis import get_redis_connection

        conn = get_redis_connection("default")
        conn.decr(UPLOAD_SEMAPHORE_KEY)
    except Exception:
        pass


def enqueue_media_upload(file_obj, prefix: str, content_type: str) -> str:
    """落临时文件 + 入队，返回 upload_id。"""
    upload_id = uuid.uuid4().hex
    ext = os.path.splitext(getattr(file_obj, "name", "") or "")[1].lower() or ".bin"
    tmp = _tmp_path(upload_id, ext)
    with open(tmp, "wb") as f:
        for chunk in file_obj.chunks() if hasattr(file_obj, "chunks") else [file_obj.read()]:
            f.write(chunk)
    process_media_upload.delay(upload_id, prefix, ext, content_type)
    return upload_id


@shared_task(
    bind=True, max_retries=10, default_retry_delay=5,
    time_limit=300, soft_time_limit=240,
)
def process_media_upload(self, upload_id: str, prefix: str, ext: str, content_type: str):
    if not _acquire_slot():
        # 并发已满 → 稍后重试（指数退避）
        raise self.retry(countdown=2 ** min(self.request.retries, 4))
    tmp = _tmp_path(upload_id, ext)
    try:
        with open(tmp, "rb") as f:
            raw = f.read()
        from utils.storage import media_key

        key = media_key(prefix, ext)
        path = None
        try:
            path = __import__("django.core.files.storage", fromlist=["default_storage"]).default_storage.save(
                key, ContentFile(raw)
            )
            url = __import__("django.core.files.storage", fromlist=["default_storage"]).default_storage.url(path)
            cache.set(
                f"upload:result:{upload_id}",
                {"status": "done", "url": url, "key": path},
                UPLOAD_RESULT_TTL,
            )
            return url
        finally:
            if path is None:
                # 上传失败也要清理临时文件
                pass
    except Exception:
        cache.set(f"upload:result:{upload_id}", {"status": "error"}, UPLOAD_RESULT_TTL)
        raise
    finally:
        try:
            os.remove(tmp)
        except OSError:
            pass
        _release_slot()


def get_upload_status(upload_id: str):
    return cache.get(f"upload:result:{upload_id}")
