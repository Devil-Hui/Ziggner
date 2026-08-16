"""媒体管理 API —— 列表 / 删除 / 排序 / 信息更新 / 编辑模式上传"""

import os
import uuid
import logging
from io import BytesIO
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from PIL import Image, ImageOps
from rest_framework.response import Response
from rest_framework import status
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes

from utils.api_base_view import BaseApiView
from utils.upload_security import (
    UploadValidationError,
    strip_exif,
    validate_image_upload,
)
from ..models import ProductMedia, SPU
from apps.rbac.permissions import HasPerm
from ..admin_permissions import can_operate_spu
from ..media_service import MediaService
from ..serializers import (
    ProductMediaSerializer,
    MediaUpdateRequestSerializer,
    MediaUpdateResponseSerializer,
    MediaReorderRequestSerializer,
)
from ..services import GoodsCacheService

_logger = logging.getLogger('biz')


def _serialize_media(m: ProductMedia) -> dict:
    """序列化单个 ProductMedia 为响应 dict（含 alt_text）。"""
    item = {
        'id': m.id,
        'media_type': m.media_type,
        'sort_order': m.sort_order,
        'status': m.status,
        'alt_text': m.alt_text,
        'file_size': m.file_size,
        'created_at': m.created_at.isoformat() if m.created_at else None,
    }
    if m.media_type == 'image':
        item.update({
            'thumb_url': m.thumb_url,
            'list_url': m.list_url,
            'large_url': m.large_url,
            'original_url': m.original_url,
        })
    else:
        item.update({
            'video_url': m.video_url,
            'video_thumb_url': m.video_thumb_url,
            'video_list_url': m.video_list_url,
            'video_large_url': m.video_large_url,
        })
    return item


def _delete_storage_file(url: str) -> None:
    """删除存储中的媒体文件（local / R2 通用，按 URL 自身形态判定后端）。

    - 绝对 URL（https://cdn.ziggner.com/... 或 https://api.ziggner.com/media/...）→ 远程 R2：
      剥掉域名与可选 /media/ 前缀得到对象 key，调 default_storage.delete(key)。
    - 相对路径 /media/... → 本地文件：MEDIA_ROOT 下删除。

    ⚠️ 必须以「URL 本身的形态」为准，而非当前 settings.FILE_STORAGE / MEDIA_URL。
    否则在 R2 模式下删除旧的「相对路径」记录时，会去 R2 删一个不存在的对象，
    导致本地卷里的文件永远删不掉（存储泄漏）。这是历史本地→R2 过渡期的典型坑。
    """
    if not url:
        return
    if url.startswith('http://') or url.startswith('https://'):
        path = urlparse(url).path  # /product_media/x.jpg 或 /media/product_media/x.jpg
        key = path.lstrip('/')
        if key.startswith('media/'):
            key = key[len('media/'):]
        try:
            default_storage.delete(key)
        except Exception as e:  # noqa: BLE001 - 删除失败仅告警，不影响主流程
            _logger.warning('删除远程文件失败 key=%s error=%s', key, e)
        return

    # 相对路径 /media/... → 本地文件
    key = url
    if key.startswith('/media/'):
        key = key[len('/media/'):]
    elif key.startswith('/'):
        key = key.lstrip('/')
    local_path = os.path.join(getattr(settings, 'MEDIA_ROOT', ''), key)
    if os.path.exists(local_path):
        try:
            os.remove(local_path)
        except OSError as e:
            _logger.warning('删除本地文件失败 path=%s error=%s', local_path, e)


class MediaListBySPUView(BaseApiView):
    """获取 SPU 的媒体列表（含审核状态、alt_text）"""
    permission_classes = [HasPerm('goods.media.write')]

    @extend_schema(responses={200: ProductMediaSerializer})
    def get(self, request, spu_id):
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU 不存在'}, status=status.HTTP_404_NOT_FOUND)
        if not can_operate_spu(request.user, spu):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)
        media_qs = ProductMedia.objects.filter(spu_id=spu_id).order_by('sort_order', 'id')
        data = [_serialize_media(m) for m in media_qs]
        return Response(data)


class MediaDeleteView(BaseApiView):
    """删除单个媒体（pending / rejected / active 均可删除，active 需前端二次确认）。

    删除时同步清理本地文件 + Redis 暂存 + 失效媒体列表缓存。
    """
    permission_classes = [HasPerm('goods.media.write')]

    @extend_schema(
        request=None,
        responses={200: OpenApiResponse(description='Media deleted')}
    )
    def delete(self, request, media_id):
        try:
            media = ProductMedia.objects.get(id=media_id)
        except ProductMedia.DoesNotExist:
            return Response({'detail': '媒体不存在'}, status=status.HTTP_404_NOT_FOUND)

        spu_id = media.spu_id
        if spu_id:
            try:
                spu = SPU.objects.get(id=spu_id)
            except SPU.DoesNotExist:
                return Response({'detail': 'SPU 不存在'}, status=status.HTTP_404_NOT_FOUND)
            if not can_operate_spu(request.user, spu):
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # 清理存储文件（thumb/list/large/original 或视频；支持 local/R2）
        if media.media_type == 'image':
            for url in (media.thumb_url, media.list_url, media.large_url, media.original_url):
                _delete_storage_file(url)
        else:
            for url in (media.video_url, media.video_thumb_url, media.video_list_url, media.video_large_url):
                _delete_storage_file(url)

        # 清理 Redis 暂存（创建模式遗留）
        if media.redis_key:
            MediaService.delete_media_from_redis(
                media.redis_key,
                is_video=(media.media_type == 'video'),
            )
        media.delete()

        # 失效媒体列表缓存
        if spu_id:
            GoodsCacheService.invalidate_media_list(spu_id)
            GoodsCacheService.invalidate_spu(spu_id)
            GoodsCacheService.invalidate_spu_list()
            # 同步 main_image
            MediaService.sync_main_image(spu_id)
        return Response({'detail': '已删除'})


class MediaReorderView(BaseApiView):
    """调整媒体排序"""
    permission_classes = [HasPerm('goods.media.write')]

    @extend_schema(
        request=MediaReorderRequestSerializer,
        responses={200: OpenApiResponse(description='Media reordered')}
    )
    def post(self, request):
        media_ids = request.data.get('media_ids', [])
        if not media_ids:
            return Response({'detail': 'media_ids 不能为空'}, status=status.HTTP_400_BAD_REQUEST)

        # 组隔离：验证所有媒体项所属 SPU 是否可操作
        media_map = {}  # media_id → ProductMedia（预取，后续排序时复用）
        for mid in media_ids:
            try:
                media = ProductMedia.objects.select_related('spu').get(id=mid)
                if not can_operate_spu(request.user, media.spu):
                    return Response({'detail': f'媒体 {mid} 所属 SPU 不在您的管理范围内'}, status=status.HTTP_403_FORBIDDEN)
                media_map[mid] = media
            except ProductMedia.DoesNotExist:
                return Response({'detail': f'媒体 {mid} 不存在'}, status=status.HTTP_404_NOT_FOUND)

        spu_ids = set()
        for idx, media_id in enumerate(media_ids):
            updated = ProductMedia.objects.filter(id=media_id).update(sort_order=idx)
            if updated:
                # 从已查询的 media 对象中获取 spu_id，避免重复查询
                for mid, m in media_map.items():
                    if mid == media_id:
                        spu_ids.add(m.spu_id)
                        break
        # 失效涉及的 SPU 媒体缓存
        for sid in spu_ids:
            if sid:
                GoodsCacheService.invalidate_media_list(sid)
                GoodsCacheService.invalidate_spu(sid)
                GoodsCacheService.invalidate_spu_list()
        return Response({'detail': '排序已更新', 'count': len(media_ids)})


class MediaUpdateView(BaseApiView):
    """更新媒体信息（alt_text / sort_order）"""
    permission_classes = [HasPerm('goods.media.write')]

    @extend_schema(
        request=MediaUpdateRequestSerializer,
        responses={200: MediaUpdateResponseSerializer}
    )
    def patch(self, request, media_id):
        try:
            media = ProductMedia.objects.get(id=media_id)
        except ProductMedia.DoesNotExist:
            return Response({'detail': '媒体不存在'}, status=status.HTTP_404_NOT_FOUND)

        if media.spu_id:
            try:
                spu = SPU.objects.get(id=media.spu_id)
            except SPU.DoesNotExist:
                return Response({'detail': 'SPU 不存在'}, status=status.HTTP_404_NOT_FOUND)
            if not can_operate_spu(request.user, spu):
                return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        update_fields = []
        if 'alt_text' in request.data:
            alt_text = str(request.data['alt_text'] or '')
            if len(alt_text) > 200:
                return Response({'detail': 'alt_text 长度不能超过 200'}, status=status.HTTP_400_BAD_REQUEST)
            media.alt_text = alt_text
            update_fields.append('alt_text')
        if 'sort_order' in request.data:
            try:
                sort_order = int(request.data['sort_order'])
            except (TypeError, ValueError):
                return Response({'detail': 'sort_order 必须为整数'}, status=status.HTTP_400_BAD_REQUEST)
            if sort_order < 0:
                return Response({'detail': 'sort_order 不能为负数'}, status=status.HTTP_400_BAD_REQUEST)
            media.sort_order = sort_order
            update_fields.append('sort_order')

        if update_fields:
            media.save(update_fields=update_fields)
            # 失效媒体列表缓存
            if media.spu_id:
                GoodsCacheService.invalidate_media_list(media.spu_id)
                GoodsCacheService.invalidate_spu(media.spu_id)
                GoodsCacheService.invalidate_spu_list()

        return Response({
            'id': media.id,
            'alt_text': media.alt_text,
            'sort_order': media.sort_order,
            'message': '更新成功',
        })


class MediaCreateView(BaseApiView):
    """编辑模式：向已有 SPU 上传图片。

    接收前端 ImageCropper 裁剪后的四尺寸图片（thumb/list/large/original），
    保存到本地存储并创建 ProductMedia 记录（status='active'）。
    路由: POST /goods/media/spu/<spu_id>/upload
    """
    permission_classes = [HasPerm('goods.media.write')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: ProductMediaSerializer}
    )
    def post(self, request, spu_id):
        try:
            spu = SPU.objects.get(id=spu_id, deleted_at__isnull=True)
        except SPU.DoesNotExist:
            return Response({'detail': 'SPU 不存在'}, status=status.HTTP_404_NOT_FOUND)

        if not can_operate_spu(request.user, spu):
            return Response({'detail': 'Permission denied.'}, status=status.HTTP_403_FORBIDDEN)

        # 数量校验
        if not MediaService.validate_media_count(spu_id, 'image'):
            return Response(
                {'detail': f'图片数量已达上限 ({settings.MEDIA_MAX_IMAGES_PER_SPU} 张)'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 读取四尺寸文件
        thumb = request.FILES.get('thumb')
        list_file = request.FILES.get('list')
        large = request.FILES.get('large')
        original = request.FILES.get('original')
        if not all([thumb, list_file, large, original]):
            return Response(
                {'detail': '请上传 thumb/list/large/original 四尺寸图片'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # 校验真实图片内容、扩展名、类型和大小；全部通过后才允许写存储。
        allowed = getattr(settings, 'FILE_STORAGE_ALLOWED_TYPES', [])
        max_size = getattr(settings, 'MEDIA_MAX_FILE_SIZE_MB', 10) * 1024 * 1024
        validated_extensions = {}
        for f in (thumb, list_file, large, original):
            try:
                extension, content_type = validate_image_upload(f, max_bytes=max_size)
            except UploadValidationError:
                return Response(
                    {'detail': '文件扩展名、真实图片内容或大小不符合要求'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if allowed and content_type not in allowed:
                return Response(
                    {'detail': f'不支持的文件类型: {content_type}'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            f.content_type = content_type
            validated_extensions[id(f)] = extension

        # 保存文件（剥离 EXIF 元数据）。URL 统一由 default_storage.url() 产生：
        #  - local：/media/{path}（相对 MEDIA_URL）
        #  - r2：  完整 CDN URL（S3Boto3Storage 用 AWS_S3_CUSTOM_DOMAIN 拼接）
        # ⚠️ 注意：prod.py 中 R2 的启用由「env 凭据齐全」触发，并不依赖 FILE_STORAGE 值，
        # 此处若再按 FILE_STORAGE=='r2' 分支返回相对路径，R2 模式下会返回错误地址导致前端 404。
        # 因此无条件走 default_storage.url()，两种后端行为天然正确。
        def _save_file(f):
            content_type = getattr(f, 'content_type', '') or ''
            ext = validated_extensions[id(f)]
            # 前端已直出 WebP（q90）或历史 WebP → 校验完整性后原样落盘：
            #   避免二次编码损耗，且保留透明通道（strip_exif 对 WEBP 会拍平 RGBA 致透明变黑）。
            if content_type == 'image/webp' or ext.lower() == '.webp':
                try:
                    f.seek(0)
                    with Image.open(f) as probe:
                        probe.load()  # 强制解码，校验文件完整可解码
                    f.seek(0)
                    raw = f.read()
                    safe_name = f'{uuid.uuid4().hex}.webp'
                    path = default_storage.save(
                        f'product_media/{safe_name}',
                        ContentFile(raw),
                    )
                    return default_storage.url(path)
                except Exception as exc:  # noqa: BLE001 - WebP 直存失败 → 落入下方重编码兜底
                    _logger.warning('WebP 直存校验失败，转 Pillow 重编码: %s', exc)

            # 其余格式（PNG/JPEG/...）→ Pillow 转「高质量 WebP」 q90（Google libwebp）：
            #   视觉近无损，体积比无损 WebP 再小 50–70%；EXIF 方向校正 + 重编码剥离元数据。
            try:
                f.seek(0)
                with Image.open(f) as img:
                    img = ImageOps.exif_transpose(img)  # 校正手机拍摄方向
                    img.load()
                    # 保留透明通道（WebP 支持带 alpha 的有损），否则转 RGB 减小体积
                    if img.mode in ('RGBA', 'LA', 'P', 'PA'):
                        img = img.convert('RGBA')
                    else:
                        img = img.convert('RGB')
                    buf = BytesIO()
                    # lossless=False + quality=90：视觉近无损；method=4 平衡压缩率与上传耗时
                    img.save(buf, 'WEBP', lossless=False, quality=90, method=4)
                buf.seek(0)
                safe_name = f'{uuid.uuid4().hex}.webp'
                path = default_storage.save(
                    f'product_media/{safe_name}',
                    ContentFile(buf.getvalue()),
                )
                return default_storage.url(path)
            except Exception as exc:  # noqa: BLE001 - 转码失败回退原格式，保证可用
                _logger.warning('WebP 转码失败，回退原格式保存: %s', exc)
                f.seek(0)
                safe_name = f'{uuid.uuid4().hex}{ext}'
                path = default_storage.save(f'product_media/{safe_name}', strip_exif(f))
                return default_storage.url(path)

        thumb_url = _save_file(thumb)
        list_url = _save_file(list_file)
        large_url = _save_file(large)
        original_url = _save_file(original)

        total_size = thumb.size + list_file.size + large.size + original.size
        sort_order = MediaService.get_next_sort_order(spu_id, 'image')
        alt_text = str(request.data.get('alt_text', '') or '')

        media = ProductMedia.objects.create(
            spu=spu,
            media_type='image',
            thumb_url=thumb_url,
            list_url=list_url,
            large_url=large_url,
            original_url=original_url,
            sort_order=sort_order,
            status='active',
            file_size=total_size,
            alt_text=alt_text,
        )

        # 同步 SPU main_image
        MediaService.sync_main_image(spu_id)
        # 失效媒体列表缓存
        GoodsCacheService.invalidate_media_list(spu_id)
        GoodsCacheService.invalidate_spu(spu_id)
        GoodsCacheService.invalidate_spu_list()

        return Response(_serialize_media(media), status=status.HTTP_201_CREATED)
