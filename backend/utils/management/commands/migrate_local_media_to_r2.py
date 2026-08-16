"""历史本地媒体 → R2 一次性迁移 + DB URL 回填。

背景：项目早期用本地磁盘（media_data 卷）存媒体，URL 存成相对 /media/... 或
api.ziggner.com/media/...；启用 R2 后新上传走 CDN（https://cdn.ziggner.com/...）。
两套并存虽然当前都能显示，但存在：
  1) 本地卷是宿主机绑定，换主机/不备份即丢失；
  2) 删除旧记录时按当前 settings 判定后端，会误删 R2 不存在对象导致本地文件泄漏；
  3) DB 里 URL 格式混合，脆弱。
本命令把「本地形态」的 URL 对应文件上传到 R2（保留原 key），并把 DB 字段回填为
绝对 CDN 地址，使 R2 成为唯一真相源。

运行（在 django-app 容器内，已挂载 media_data 卷且配好 R2 凭据）：
  python manage.py migrate_local_media_to_r2 --dry-run        # 先预览
  python manage.py migrate_local_media_to_r2                  # 执行
  python manage.py migrate_local_media_to_r2 --delete-local   # 迁移成功后清理本地文件

注意：--delete-local 默认关闭，建议先跑一次不带该参数、确认 R2 文件可访问后再清理。
"""
import os
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.core.management.base import BaseCommand

PRODUCT_MEDIA_FIELDS = [
    'thumb_url', 'list_url', 'large_url', 'original_url',
    'video_url', 'video_thumb_url', 'video_list_url', 'video_large_url',
]


def is_local_url(url, r2_base):
    """判断一个 URL 是否为「本地形态」（需要迁移到 R2）。"""
    if not url:
        return False
    if url.startswith('/media/'):
        return True
    parsed = urlparse(url)
    # 绝对 URL 但不在 R2 CDN 域名下（如 https://api.ziggner.com/media/...）
    if parsed.path.startswith('/media/') and not url.startswith(r2_base):
        return True
    return False


def local_key(url):
    if url.startswith('/media/'):
        return url[len('/media/'):]
    parsed = urlparse(url)
    path = parsed.path
    if path.startswith('/media/'):
        return path[len('/media/'):]
    return path.lstrip('/')


def migrate_file(url, delete_local):
    """读取本地文件 → 上传 R2（保留 key）→ 返回新 CDN URL。"""
    key = local_key(url)
    local_path = os.path.join(settings.MEDIA_ROOT, key)
    if not os.path.exists(local_path):
        return 'missing', url
    try:
        with open(local_path, 'rb') as fh:
            content = fh.read()
        saved = default_storage.save(key, ContentFile(content))
        new_url = default_storage.url(saved)
        if delete_local:
            try:
                os.remove(local_path)
            except OSError:
                pass
        return 'ok', new_url
    except Exception as e:  # noqa: BLE001
        return 'error', str(e)


class Command(BaseCommand):
    help = '将历史本地媒体文件迁移到 R2 并回填数据库中的 URL 为绝对 CDN 地址'

    def add_arguments(self, parser):
        parser.add_argument('--dry-run', action='store_true', help='只统计，不写库/不上传')
        parser.add_argument('--delete-local', action='store_true', help='迁移成功后删除本地文件（默认保留）')

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        delete_local = options['delete_local']
        r2_base = getattr(settings, 'R2_PUBLIC_URL', '') or ''
        storage_backend = default_storage.__class__.__name__
        self.stdout.write(
            f'storage backend = {storage_backend} | R2_PUBLIC_URL = {r2_base or "(未配置)"} | '
            f'dry_run = {dry_run} | delete_local = {delete_local}'
        )
        if not r2_base:
            self.stdout.write(self.style.WARNING('R2_PUBLIC_URL 未配置，迁移后 URL 可能无法访问，请确认 prod 环境。'))

        stats = {'ok': 0, 'missing': 0, 'error': 0, 'skip': 0}
        counts = {'ProductMedia': 0, 'Brand': 0, 'CSMessage': 0, 'SupportMessage': 0, 'UserProfile': 0}

        def migrate_url(url):
            if not is_local_url(url, r2_base):
                stats['skip'] += 1
                return url
            if dry_run:
                stats['ok'] += 1
                return url
            status, val = migrate_file(url, delete_local)
            stats[status] += 1
            if status == 'ok':
                return val
            return url

        # ── 1. ProductMedia（8 个 URL 字段）──────────────────────────────
        from apps.goods.models import ProductMedia
        for m in ProductMedia.objects.all().iterator(chunk_size=200):
            changed_fields = []
            for f in PRODUCT_MEDIA_FIELDS:
                url = getattr(m, f)
                if not url:
                    continue
                new_url = migrate_url(url)
                if new_url != url:
                    setattr(m, f, new_url)
                    changed_fields.append(f)
            if changed_fields:
                counts['ProductMedia'] += 1
                if not dry_run:
                    m.save(update_fields=changed_fields)

        # ── 2. Brand.logo_url ───────────────────────────────────────────
        from apps.goods.models import Brand
        for b in Brand.objects.exclude(logo_url='').iterator(chunk_size=200):
            new_url = migrate_url(b.logo_url)
            if new_url != b.logo_url:
                counts['Brand'] += 1
                if not dry_run:
                    b.logo_url = new_url
                    b.save(update_fields=['logo_url'])

        # ── 3. customer_service.Message.file_url ────────────────────────
        from apps.customer_service.models import Message as CSMessage
        for msg in CSMessage.objects.exclude(file_url='').iterator(chunk_size=200):
            new_url = migrate_url(msg.file_url)
            if new_url != msg.file_url:
                counts['CSMessage'] += 1
                if not dry_run:
                    msg.file_url = new_url
                    msg.save(update_fields=['file_url'])

        # ── 4. support.Message.attachments（JSON 列表，含 url）────────────
        from apps.support.models import Message as SupportMessage
        for msg in SupportMessage.objects.exclude(attachments=[]).iterator(chunk_size=200):
            attachments = msg.attachments or []
            if not attachments:
                continue
            changed = False
            for att in attachments:
                url = att.get('url') if isinstance(att, dict) else None
                if not url:
                    continue
                new_url = migrate_url(url)
                if new_url != url:
                    att['url'] = new_url
                    changed = True
            if changed:
                counts['SupportMessage'] += 1
                if not dry_run:
                    msg.save(update_fields=['attachments'])

        # ── 5. users.UserProfile.avatar ─────────────────────────────────
        from apps.users.models import UserProfile
        for p in UserProfile.objects.exclude(avatar='').iterator(chunk_size=200):
            new_url = migrate_url(p.avatar)
            if new_url != p.avatar:
                counts['UserProfile'] += 1
                if not dry_run:
                    p.avatar = new_url
                    p.save(update_fields=['avatar'])

        self.stdout.write(self.style.SUCCESS(
            '\n=== 迁移统计 ===\n'
            f'  成功(ok)   : {stats["ok"]}\n'
            f'  跳过(skip) : {stats["skip"]}  (已是 CDN/外部 URL)\n'
            f'  缺失(missing): {stats["missing"]}\n'
            f'  错误(error): {stats["error"]}\n'
            f'  涉及记录    : {counts}\n'
            + ('  [DRY-RUN] 未实际写入' if dry_run else '  [DONE] 已写入数据库')
        ))
        if stats['error']:
            self.stdout.write(self.style.ERROR('存在错误，请检查上方 [error] 日志；未迁移的记录保持原值，可重跑本命令补齐。'))
