"""媒体暂存服务 —— Redis 暂存 + 校验 + 同步

Redis DB 4, key prefix: media:img: / media:vid:, TTL 3600s
"""
import json
import logging
import uuid
import redis
from django.conf import settings

logger = logging.getLogger(__name__)

REDIS_DB = 4
KEY_PREFIX_IMG = 'media:img:'
KEY_PREFIX_VID = 'media:vid:'
REDIS_TTL = 3600  # 1 小时

# 模块级 Redis 客户端（连接池复用，避免 raw 连接泄漏）
_redis_client = None


def _get_redis() -> redis.Redis:
    """获取 Redis 连接（DB 4），使用连接池管理，不泄漏连接"""
    global _redis_client
    if _redis_client is not None:
        return _redis_client
    try:
        redis_url = getattr(settings, 'REDIS_MASTER_URL', 'redis://redis:6379')
        _redis_client = redis.Redis.from_url(
            redis_url, db=REDIS_DB, decode_responses=True,
            socket_connect_timeout=5, socket_timeout=5,
            max_connections=10,
        )
    except Exception as e:
        logger.error(f'Redis 连接失败 (DB {REDIS_DB}): {e}')
        raise
    return _redis_client


class MediaService:
    """媒体暂存与同步服务"""

    # ── Redis 暂存 ──

    @classmethod
    def store_image_to_redis(cls, sizes: dict) -> str:
        """存入图片 4 尺寸 Base64 到 Redis，返回 redis_key"""
        redis_key = str(uuid.uuid4())
        full_key = f'{KEY_PREFIX_IMG}{redis_key}'
        data = {
            'thumb': sizes.get('thumb', ''),
            'list': sizes.get('list', ''),
            'large': sizes.get('large', ''),
            'original': sizes.get('original', ''),
        }
        r = _get_redis()
        r.set(full_key, json.dumps(data), ex=REDIS_TTL)
        logger.info(f'图片已暂存 Redis: {full_key}')
        return redis_key

    @classmethod
    def store_video_to_redis(cls, video_b64: str, frames: dict) -> str:
        """存入视频 Base64 + 头帧到 Redis，返回 redis_key"""
        redis_key = str(uuid.uuid4())
        full_key = f'{KEY_PREFIX_VID}{redis_key}'
        data = {
            'video': video_b64,
            'frames': {
                'thumb': frames.get('thumb', ''),
                'list': frames.get('list', ''),
                'large': frames.get('large', ''),
            },
        }
        r = _get_redis()
        r.set(full_key, json.dumps(data), ex=REDIS_TTL)
        logger.info(f'视频已暂存 Redis: {full_key}')
        return redis_key

    @classmethod
    def get_media_from_redis(cls, redis_key: str, is_video: bool = False) -> dict | None:
        """从 Redis 读取媒体数据"""
        prefix = KEY_PREFIX_VID if is_video else KEY_PREFIX_IMG
        full_key = f'{prefix}{redis_key}'
        r = _get_redis()
        raw = r.get(full_key)
        if raw is None:
            return None
        return json.loads(raw)

    @classmethod
    def delete_media_from_redis(cls, redis_key: str, is_video: bool = False):
        """清理 Redis 暂存"""
        prefix = KEY_PREFIX_VID if is_video else KEY_PREFIX_IMG
        full_key = f'{prefix}{redis_key}'
        r = _get_redis()
        r.delete(full_key)
        logger.info(f'已清理 Redis 暂存: {full_key}')

    @classmethod
    def refresh_ttl(cls, redis_key: str, is_video: bool = False):
        """刷新 Redis 过期时间（审核期间延长保留）"""
        prefix = KEY_PREFIX_VID if is_video else KEY_PREFIX_IMG
        full_key = f'{prefix}{redis_key}'
        r = _get_redis()
        r.expire(full_key, REDIS_TTL)

    # ── 数量校验 ──

    @classmethod
    def validate_media_count(cls, spu_id: int, media_type: str) -> bool:
        """校验数量限制"""
        from .models import ProductMedia
        max_count = (
            settings.MEDIA_MAX_IMAGES_PER_SPU
            if media_type == 'image'
            else settings.MEDIA_MAX_VIDEOS_PER_SPU
        )
        current = ProductMedia.objects.filter(
            spu_id=spu_id, media_type=media_type
        ).exclude(status='rejected').count()
        return current < max_count

    @classmethod
    def get_next_sort_order(cls, spu_id: int, media_type: str) -> int:
        """获取下一个排序编号（头插 = 0，已有媒体往后排）"""
        from .models import ProductMedia
        last = ProductMedia.objects.filter(
            spu_id=spu_id, media_type=media_type
        ).exclude(status='rejected').order_by('-sort_order').first()
        if last is None:
            return 0
        return last.sort_order + 1

    # ── 同步 main_image ──

    @classmethod
    def sync_main_image(cls, spu_id: int):
        """同步 SPU.main_image = sort_order=0 的图片大图 URL"""
        from .models import ProductMedia, SPU
        first_image = ProductMedia.objects.filter(
            spu_id=spu_id, media_type='image', status='active'
        ).order_by('sort_order').first()
        if first_image and first_image.large_url:
            SPU.objects.filter(id=spu_id).update(main_image=first_image.large_url)
            logger.info(f'已同步 SPU#{spu_id} main_image: {first_image.large_url}')

    # ── 清理过期 ──

    @classmethod
    def clean_expired(cls):
        """清理所有超过 TTL 的 rejected 媒体记录"""
        from .models import ProductMedia
        from django.utils import timezone
        from datetime import timedelta

        cutoff = timezone.now() - timedelta(seconds=REDIS_TTL)
        expired = ProductMedia.objects.filter(
            status='rejected', updated_at__lt=cutoff
        )
        for m in expired:
            if m.redis_key:
                cls.delete_media_from_redis(m.redis_key, is_video=(m.media_type == 'video'))
        count = expired.count()
        expired.delete()
        if count:
            logger.info(f'已清理 {count} 条过期 rejected 媒体')
        return count