import logging

from celery import shared_task

from utils.celery_task import CeleryTask

logger = logging.getLogger(__name__)


# ==================== 图片处理任务 ====================

class ProcessProductImageTask(CeleryTask):
    task_name = 'goods.process_product_image'
    queue = 'image_process'
    default_soft_time_limit = 60
    default_time_limit = 120
    max_retries = 2

    def exec(self, task_self, image_path: str, sizes: list = None):
        """异步生成缩略图"""
        if sizes is None:
            sizes = [(200, 200), (400, 400), (800, 800)]

        from PIL import Image
        import os

        if not os.path.exists(image_path):
            logger.warning(f'Image not found: {image_path}')
            return {'status': 'skipped', 'path': image_path}

        results = []
        base, ext = os.path.splitext(image_path)
        with Image.open(image_path) as img:
            for w, h in sizes:
                thumb = img.copy()
                thumb.thumbnail((w, h), Image.LANCZOS)
                thumb_path = f'{base}_{w}x{h}{ext}'
                thumb.save(thumb_path, quality=85)
                results.append(thumb_path)

        logger.info(f'Generated {len(results)} thumbnails for {image_path}')
        return {'status': 'done', 'thumbnails': results}


# ==================== 批量导入 ====================

class BatchImportProductsTask(CeleryTask):
    task_name = 'goods.batch_import_products'
    queue = 'batch_import'
    default_soft_time_limit = 1800
    default_time_limit = 3600
    max_retries = 1

    def exec(self, task_self, file_path: str):
        """从 CSV 批量导入商品"""
        import csv
        if not file_path.endswith('.csv'):
            raise ValueError('仅支持 CSV 格式')

        success = 0
        failed = 0
        with open(file_path, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    success += 1
                except Exception as e:
                    failed += 1
                    logger.error(f'Import failed for row: {row.get("name", "")}: {e}')

        logger.info(f'Batch import: {success} success, {failed} failed')
        return {'success': success, 'failed': failed}


# ==================== 排行任务 ====================

class RecalcSalesRankingTask(CeleryTask):
    task_name = 'goods.recalc_sales_ranking'
    queue = 'ranking'
    default_soft_time_limit = 300
    default_time_limit = 600

    def exec(self, task_self):
        """销量排行写入 Django cache（DatabaseCache 兼容，不再依赖 Redis ZSET）。"""
        from django.core.cache import cache
        from .models import SKU

        ranking = []
        qs = (
            SKU.objects.filter(shelf_status='on', stock__gt=0)
            .order_by('-sales')
            .values('id', 'sales')[:500]
        )
        for sku in qs:
            ranking.append({'id': sku['id'], 'sales': sku['sales']})

        cache.set('goods:ranking:sales', ranking, timeout=3600 * 2)
        logger.info('Sales ranking recalculated (%s skus)', len(ranking))
        return {'count': len(ranking)}


# ==================== 定时上下架任务 ====================

class ExecuteScheduledPublishTask(CeleryTask):
    """每分钟执行一次：检查定时上下架时间，自动执行"""
    task_name = 'goods.execute_scheduled_publish'
    queue = 'default'
    default_soft_time_limit = 120
    default_time_limit = 180

    def exec(self, task_self):
        from .models import SPU, SPUStatus
        from .services import SPUStatusCache
        from django.utils import timezone

        now = timezone.now()
        published = 0
        unpublished = 0

        # 🔼 定时上架：scheduled_publish_at <= now 且 status == approved
        to_publish = SPU.objects.filter(
            deleted_at__isnull=True,
            status=SPUStatus.APPROVED,
            scheduled_publish_at__lte=now,
        )
        for spu in to_publish:
            try:
                spu.put_on_sale()
                SPUStatusCache.set(spu.id, spu.status)
                published += 1
                logger.info(f'Scheduled publish: SPU {spu.id} → ON_SALE')
            except Exception as e:
                logger.error(f'Scheduled publish failed for SPU {spu.id}: {e}')

        # 🔽 定时下架：scheduled_unpublish_at <= now 且 status in (on_sale, suspended)
        to_unpublish = SPU.objects.filter(
            deleted_at__isnull=True,
            status__in=[SPUStatus.ON_SALE, SPUStatus.SUSPENDED],
            scheduled_unpublish_at__lte=now,
        )
        for spu in to_unpublish:
            try:
                spu.put_off_sale()
                SPUStatusCache.set(spu.id, spu.status)
                unpublished += 1
                logger.info(f'Scheduled unpublish: SPU {spu.id} → OFF_SALE')
            except Exception as e:
                logger.error(f'Scheduled unpublish failed for SPU {spu.id}: {e}')

        return {'published': published, 'unpublished': unpublished}


# ==================== 缓存预热（shared_task）====================

@shared_task(
    bind=True,
    max_retries=2,
    default_retry_delay=30,
    queue='ranking',
)
def warm_hot_product_cache(self):
    from .services import GoodsCacheService
    GoodsCacheService.warm_hot_products()


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=10,
    queue='default',
)
def warm_category_cache(self):
    from .services import GoodsCacheService
    GoodsCacheService.warm_category_tree()


@shared_task(
    bind=True,
    max_retries=1,
    default_retry_delay=10,
    queue='default',
)
def warm_bloom_filter_task(self):
    """预热布隆过滤器 — 加载所有活跃 SPU/SKU ID"""
    from .services import GoodsCacheService
    GoodsCacheService.warm_bloom_filters()


# ==================== 媒体上传任务 ====================

class UploadMediaToCloudTask(CeleryTask):
    """审核通过后: Redis → 云存储"""
    task_name = 'goods.upload_media_to_cloud'
    queue = 'image_process'
    default_soft_time_limit = 300
    default_time_limit = 600
    max_retries = 2

    def exec(self, task_self, media_ids: list):
        from .models import ProductMedia
        from .media_service import MediaService
        from utils.storage import get_storage
        import base64

        storage = get_storage()
        results = {'success': 0, 'failed': 0, 'details': []}

        for media_id in media_ids:
            try:
                media = ProductMedia.objects.get(id=media_id, status='pending')
                if not media.redis_key:
                    results['failed'] += 1
                    results['details'].append({'id': media_id, 'error': 'no redis_key'})
                    continue

                is_video = (media.media_type == 'video')
                data = MediaService.get_media_from_redis(media.redis_key, is_video=is_video)
                if not data:
                    results['failed'] += 1
                    results['details'].append({'id': media_id, 'error': 'redis data not found'})
                    continue

                spu_id = media.spu_id or 0
                base_path = f'products/{spu_id}'

                if is_video:
                    video_b64 = data.get('video', '')
                    if video_b64:
                        video_bytes = base64.b64decode(video_b64.split(',')[-1] if ',' in video_b64 else video_b64)
                        video_key = f'{base_path}/video/{media.redis_key}.mp4'
                        result = storage.upload(video_key, video_bytes, 'video/mp4')
                        if result['url']:
                            media.video_url = result['url']

                    frames = data.get('frames', {})
                    for size_key, url_field in [
                        ('thumb', 'video_thumb_url'),
                        ('list', 'video_list_url'),
                        ('large', 'video_large_url'),
                    ]:
                        frame_b64 = frames.get(size_key, '')
                        if frame_b64:
                            frame_bytes = base64.b64decode(frame_b64.split(',')[-1] if ',' in frame_b64 else frame_b64)
                            frame_key = f'{base_path}/video/{media.redis_key}_frame/{size_key}.jpg'
                            frame_result = storage.upload(frame_key, frame_bytes, 'image/jpeg')
                            if frame_result['url']:
                                setattr(media, url_field, frame_result['url'])
                else:
                    for size_key, url_field in [
                        ('thumb', 'thumb_url'),
                        ('list', 'list_url'),
                        ('large', 'large_url'),
                        ('original', 'original_url'),
                    ]:
                        img_b64 = data.get(size_key, '')
                        if img_b64:
                            img_bytes = base64.b64decode(img_b64.split(',')[-1] if ',' in img_b64 else img_b64)
                            img_key = f'{base_path}/{size_key}/{media.redis_key}.jpg'
                            img_result = storage.upload(img_key, img_bytes, 'image/jpeg')
                            if img_result['url']:
                                setattr(media, url_field, img_result['url'])

                media.status = 'active'
                media.save(update_fields=[
                    'status', 'thumb_url', 'list_url', 'large_url', 'original_url',
                    'video_url', 'video_thumb_url', 'video_list_url', 'video_large_url',
                ])

                # 清理 Redis
                MediaService.delete_media_from_redis(media.redis_key, is_video=is_video)

                results['success'] += 1
                results['details'].append({'id': media_id, 'status': 'active'})
            except Exception as e:
                logger.exception(f'媒体上传失败 media_id={media_id}: {e}')
                results['failed'] += 1
                results['details'].append({'id': media_id, 'error': str(e)})

        # 同步 main_image
        if results['success'] > 0:
            first_media = ProductMedia.objects.filter(id__in=media_ids, media_type='image').first()
            if first_media:
                MediaService.sync_main_image(first_media.spu_id)

        return results

    def on_failure(self, task_self, exc, *args, **kwargs):
        logger.error(f'UploadMediaToCloudTask 失败: {exc}')


class CleanExpiredMediaTask(CeleryTask):
    """定时清理过期 Redis 暂存 + rejected 媒体"""
    task_name = 'goods.clean_expired_media'
    queue = 'default'
    default_soft_time_limit = 60
    default_time_limit = 120

    def exec(self, task_self):
        from .media_service import MediaService
        count = MediaService.clean_expired()
        return {'cleaned': count}


# ==================== 注册 Celery 任务 ====================
ProcessProductImageTask.register()
BatchImportProductsTask.register()
UploadMediaToCloudTask.register()
CleanExpiredMediaTask.register()
RecalcSalesRankingTask.register()
ExecuteScheduledPublishTask.register()


# ==================== 数据库自动备份 ====================

class DatabaseBackupTask(CeleryTask):
    """每日凌晨 4:00 自动备份数据库到宿主机目录。"""

    name = 'database-backup-daily'
    queue = 'celery'

    def run(self):
        import gzip
        import subprocess
        import os
        from datetime import datetime

        backup_dir = os.environ.get('BACKUP_DIR', '/backups')
        os.makedirs(backup_dir, exist_ok=True)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M')
        filename = f'ziggner_{timestamp}.sql.gz'
        filepath = os.path.join(backup_dir, filename)

        db_password = os.environ.get('DB_PASSWORD', '')
        db_host = os.environ.get('DB_HOST', 'db')
        db_name = os.environ.get('DB_NAME', 'ziggner')

        command = [
            'mysqldump',
            '--host', db_host,
            '--user', os.environ.get('DB_USER', 'root'),
            '--single-transaction',
            '--routines',
            '--triggers',
            '--events',
            '--', db_name,
        ]
        command_env = os.environ.copy()
        command_env['MYSQL_PWD'] = db_password
        with gzip.open(filepath, 'wb', compresslevel=6) as archive:
            result = subprocess.run(
                command,
                stdout=archive,
                stderr=subprocess.PIPE,
                env=command_env,
                check=False,
            )
        if result.returncode != 0:
            stderr = result.stderr.decode('utf-8', errors='replace')[-2000:]
            logger.error('DB backup failed: %s', stderr)
            raise RuntimeError(f'Backup failed: {stderr}')

        # 检查文件大小（拒绝空备份）
        size = os.path.getsize(filepath)
        if size < 1024:
            logger.error(f'DB backup SUSPICIOUS: {filepath} only {size} bytes')
            raise RuntimeError(f'Backup too small: {size} bytes')

        # 滚动清理：保留最近 7 天
        cutoff = datetime.now().timestamp() - 7 * 86400
        for f in os.listdir(backup_dir):
            fp = os.path.join(backup_dir, f)
            if f.startswith('ziggner_') and os.path.getmtime(fp) < cutoff:
                os.remove(fp)
                logger.info(f'Removed old backup: {f}')

        logger.info(f'DB backup OK: {filepath} ({size:,} bytes)')


DatabaseBackupTask.register()
