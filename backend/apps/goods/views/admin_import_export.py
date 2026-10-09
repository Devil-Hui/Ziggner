import csv
import io
import logging
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from django.http import StreamingHttpResponse
from ..models import SPU, SPUStatus, SKU, Brand, Category
from apps.rbac.permissions import HasPerm
from apps.rbac.services import has_role
from apps.rbac.constants import Role
from ..admin_permissions import get_group_managed_category_ids
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from utils.upload_security import UploadValidationError, escape_csv_cell, parse_csv_upload

_logger = logging.getLogger('biz')

# Excel 列名 → 内部字段映射（兼容中英文表头）
COLUMN_MAP = {
    'sku编码': 'sku_code', 'sku': 'sku_code', 'sku_code': 'sku_code',
    '产品型号': 'model', '型号': 'model', 'model': 'model',
    '原价': 'price', 'price': 'price',
    '现价': 'discount_price', 'discount_price': 'discount_price',
    '标题': 'name', '商品名': 'name', 'name': 'name',
    '详情描述': 'description', '描述': 'description', 'description': 'description',
    '服务': 'services', 'service': 'services',
}


def _parse_upload_rows(uploaded):
    """解析上传文件为行字典列表，支持 xlsx / csv。"""
    filename = (uploaded.name or '').lower()
    if filename.endswith('.xlsx') or filename.endswith('.xlsm'):
        return _parse_xlsx(uploaded)
    return parse_csv_upload(uploaded)


def _parse_xlsx(uploaded):
    """用 openpyxl 解析 xlsx，返回 [{列名: 值}]。"""
    import openpyxl
    uploaded.seek(0)
    wb = openpyxl.load_workbook(uploaded, data_only=True)
    ws = wb.active
    if ws.max_row < 2:
        return []
    headers = []
    for cell in ws[1]:
        headers.append(str(cell.value).strip() if cell.value is not None else '')
    rows = []
    for r in range(2, ws.max_row + 1):
        row = {}
        for c, header in enumerate(headers, start=1):
            if not header:
                continue
            val = ws.cell(r, c).value
            row[header] = '' if val is None else str(val)
        if any(v.strip() for v in row.values()):
            rows.append(row)
    return rows


def _normalize_row(row):
    """将原始行（任意表头）映射为内部字段。"""
    out = {}
    for raw_key, value in row.items():
        key = COLUMN_MAP.get((raw_key or '').strip().lower(), (raw_key or '').strip())
        if key not in out or not out[key]:
            out[key] = (value or '').strip()
    return out


def _split_services(services_text):
    """把服务列文本按换行拆成标签列表（忽略空行）。"""
    tags = []
    for line in (services_text or '').split('\n'):
        line = line.strip()
        if line:
            tags.append(line)
    return tags


def _save_image_to_spu(spu, upload_file, sort_order):
    """把单张原始图片转成四尺寸 WebP 并挂到 SPU 的 ProductMedia。

    复用 MediaCreateView 的转码逻辑（thumb/list/large/original 四尺寸）。
    返回 (ok, error)。
    """
    from io import BytesIO
    from django.core.files.base import ContentFile
    from django.core.files.storage import default_storage
    from PIL import Image, ImageOps
    from utils.storage import media_key
    from ..models import ProductMedia
    from ..media_service import MediaService
    from ..services import GoodsCacheService

    WEBP_QUALITY = 90
    try:
        upload_file.seek(0)
        with Image.open(upload_file) as img:
            img = ImageOps.exif_transpose(img)
            img.load()
            if img.mode in ('RGBA', 'LA', 'P', 'PA'):
                img = img.convert('RGBA')
            else:
                img = img.convert('RGB')

            def _save_size(size):
                buf = BytesIO()
                resized = img.copy()
                if size:
                    resized.thumbnail((size, size), Image.LANCZOS)
                resized.save(buf, 'WEBP', lossless=False, quality=WEBP_QUALITY, method=4)
                buf.seek(0)
                path = default_storage.save(media_key('products', '.webp'), ContentFile(buf.getvalue()))
                return default_storage.url(path)

            thumb_url = _save_size(200)
            list_url = _save_size(400)
            large_url = _save_size(800)
            original_url = _save_size(0)

        total_size = upload_file.size
        ProductMedia.objects.create(
            spu=spu,
            media_type='image',
            thumb_url=thumb_url,
            list_url=list_url,
            large_url=large_url,
            original_url=original_url,
            sort_order=sort_order,
            status='active',
            file_size=total_size,
        )
        MediaService.sync_main_image(spu.id)
        GoodsCacheService.invalidate_media_list(spu.id)
        GoodsCacheService.invalidate_spu(spu.id)
        GoodsCacheService.invalidate_spu_list()
        return True, ''
    except Exception as e:  # noqa: BLE001
        _logger.warning('导入图片处理失败 spu=%s: %s', spu.id, e)
        return False, str(e)


def _match_images_to_spu(images, spu_name):
    """按商品名匹配图片文件（文件名前缀包含商品名）。返回匹配的图片列表。"""
    name = (spu_name or '').strip().lower()
    if not name:
        return []
    matched = []
    for f in images:
        fname = (f.name or '').lower()
        # 文件名前缀匹配商品名（忽略扩展名）
        base = fname.rsplit('.', 1)[0] if '.' in fname else fname
        if name in base or base in name:
            matched.append(f)
    return matched


class ImportProductsView(BaseApiView):
    """Excel/CSV 导入商品 — 上传 → 预览 → 确认导入。

    支持列：sku编码、产品型号、原价、现价、标题、详情描述、服务。
    一行 = 一个 SPU + 一个 SKU；服务列按换行拆成标签；导入后创建草稿。
    """
    permission_classes = [HasPerm('goods.import.execute')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Import result')}
    )
    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': Messages.ADMIN_IMPORT_INVALID_FORMAT}, status=status.HTTP_400_BAD_REQUEST)

        try:
            raw_rows = _parse_upload_rows(uploaded)
        except UploadValidationError:
            return Response({'detail': Messages.ADMIN_IMPORT_PREVIEW_FAILED}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:  # noqa: BLE001
            _logger.warning('导入文件解析失败: %s', e)
            return Response({'detail': Messages.ADMIN_IMPORT_PREVIEW_FAILED}, status=status.HTTP_400_BAD_REQUEST)

        rows = [_normalize_row(r) for r in raw_rows]
        rows = [r for r in rows if r.get('name')]
        if not rows:
            return Response({'detail': Messages.ADMIN_IMPORT_NO_DATA}, status=status.HTTP_400_BAD_REQUEST)

        # 预览模式：返回解析结果
        if request.data.get('preview') == 'true':
            preview = []
            errors = []
            for i, row in enumerate(rows):
                row_errors = []
                if not row.get('name'):
                    row_errors.append('Name is required')
                preview.append({
                    'row': i + 1,
                    'name': row.get('name', ''),
                    'model': row.get('model', ''),
                    'price': row.get('price', ''),
                    'discount_price': row.get('discount_price', ''),
                    'sku_code': row.get('sku_code', ''),
                    'description': row.get('description', ''),
                    'tags': _split_services(row.get('services', '')),
                    'valid': len(row_errors) == 0,
                    'errors': row_errors,
                })
                if row_errors:
                    errors.extend([f'Row {i+1}: {e}' for e in row_errors])

            return Response({
                'preview': preview,
                'total_rows': len(rows),
                'valid_rows': sum(1 for r in preview if r['valid']),
                'error_count': len(errors),
                'errors': errors[:20],
            })

        # 确认导入模式
        brand_id = request.data.get('brand_id')
        category_id = request.data.get('category_id')
        brand = None
        category = None
        if brand_id:
            brand = Brand.objects.filter(id=brand_id, is_active=True).first()
        if category_id:
            category = Category.objects.filter(id=category_id, is_active=True).first()
        if not brand:
            brand = Brand.objects.filter(is_active=True).first()
        if not category:
            category = Category.objects.filter(is_active=True).first()

        # 图片文件夹：按商品名匹配（文件名前缀包含商品名）
        images = request.FILES.getlist('images')

        imported = 0
        errors = []
        for i, row in enumerate(rows):
            try:
                name = row.get('name', '')
                if not name:
                    continue
                if not brand or not category:
                    errors.append(f'Row {i+1}: 缺少品牌或分类')
                    continue

                spu = SPU.objects.create(
                    name=name,
                    brand=brand,
                    category=category,
                    description=row.get('description', ''),
                    tags=_split_services(row.get('services', '')),
                    status=SPUStatus.DRAFT,
                )

                # 创建 SKU：产品型号作为规格值，原价/现价映射 price/discount_price
                spec_values = {}
                if row.get('model'):
                    spec_values['型号'] = row['model']
                SKU.objects.create(
                    spu=spu,
                    spec_values=spec_values,
                    price=float(row['price']) if row.get('price') else 0,
                    discount_price=float(row['discount_price']) if row.get('discount_price') else None,
                    stock=0,
                    sku_code=row.get('sku_code', ''),
                    shelf_status='on',
                )

                # 按商品名匹配图片并上传（图片按文件名顺序，视频在前由前端控制）
                if images:
                    matched = _match_images_to_spu(images, name)
                    for sort_idx, img_file in enumerate(matched):
                        _save_image_to_spu(spu, img_file, sort_idx)

                imported += 1
            except Exception as e:  # noqa: BLE001
                errors.append(f'Row {i+1}: {str(e)}')

        return Response({
            'message': Messages.SUCCESS,
            'imported': imported,
            'errors': errors[:20],
        }, status=status.HTTP_201_CREATED)


class ExportProductsView(BaseApiView):
    """CSV 导出商品"""
    permission_classes = [HasPerm('goods.import.execute')]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='CSV file')}
    )
    def post(self, request):
        qs = (
            SPU.objects.filter(deleted_at__isnull=True)
            .select_related('brand', 'category')
        )
        # 数据权限：非超管仅能导出本组类目下的商品（DB 层行级过滤）
        if not has_role(request.user, Role.SUPERADMIN.value):
            managed_ids = get_group_managed_category_ids(request.user)
            qs = qs.filter(category_id__in=managed_ids) if managed_ids else qs.none()

        # 敏感操作审计：导出必须留痕（含行级范围）
        is_admin = has_role(request.user, Role.SUPERADMIN.value)
        from .admin_audit import create_audit_log
        create_audit_log(
            request.user, 'export_products', 'spu', 0,
            changes={'count': qs.count(), 'scope': 'managed' if not is_admin else 'all'},
            ip_address=request.META.get('REMOTE_ADDR'),
        )

        # 大数据量导出必须流式（StreamingHttpResponse + 分块迭代）：
        # 仅保留一个 chunk（默认 500 行）在内存，10 万条记录也不会 OOM，
        # 且 chunked Transfer-Encoding 交付，第一块数据即可开始传输。
        response = StreamingHttpResponse(
            self._stream_rows(qs), content_type='text/csv; charset=utf-8'
        )
        response['Content-Disposition'] = 'attachment; filename="products_export.csv"'
        return response

    # 每块最多物化多少条 SPU 到内存（内存上界 = chunk * 单行开销）
    EXPORT_CHUNK_SIZE = 500

    @classmethod
    def _csv_line(cls, row: list) -> str:
        """将一行 render 为合法 CSV 文本（含换行）。"""
        buf = io.StringIO()
        csv.writer(buf).writerow(row)
        return buf.getvalue()

    @classmethod
    def _stream_rows(cls, spu_qs):
        """惰性生成 CSV 文本，按块加载 SPD 及其 SKU，内存恒定。"""
        yield cls._csv_line(['Name', 'Brand', 'Category', 'Price', 'Stock', 'Status', 'Description', 'Main Image', 'Created At'])

        iterator = spu_qs.iterator(chunk_size=cls.EXPORT_CHUNK_SIZE)
        chunk = []
        for spu in iterator:
            chunk.append(spu)
            if len(chunk) >= cls.EXPORT_CHUNK_SIZE:
                yield from cls._render_chunk(chunk)
                chunk = []
        if chunk:
            yield from cls._render_chunk(chunk)

    @classmethod
    def _render_chunk(cls, chunk):
        """渲染一个 chunk：批量取 SKU（避免逐条 N+1），逐行输出。"""
        id_list = [s.id for s in chunk]
        sku_map = {
            sku.spu_id: sku
            for sku in SKU.objects.filter(spu_id__in=id_list)
        }
        for spu in chunk:
            sku = sku_map.get(spu.id)
            price = str(sku.price) if sku else ''
            stock = str(sku.stock) if sku else ''
            category_path = cls._get_category_path(spu.category)
            yield cls._csv_line([
                escape_csv_cell(spu.name), escape_csv_cell(spu.brand.name), escape_csv_cell(category_path),
                price, stock, spu.status,
                escape_csv_cell(spu.description), escape_csv_cell(spu.main_image or ''),
                spu.created_at.strftime('%Y-%m-%d %H:%M:%S') if spu.created_at else '',
            ])

    @staticmethod
    def _get_category_path(category):
        parts = []
        current = category
        while current:
            parts.insert(0, current.name)
            current = current.parent
        return ' / '.join(parts)
