import csv
import io
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from django.http import StreamingHttpResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import SPU, SPUStatus, SKU, Brand, Category
from apps.rbac.permissions import HasPerm
from apps.rbac.services import has_role
from apps.rbac.constants import Role
from ..admin_permissions import get_group_managed_category_ids
from utils.upload_security import UploadValidationError, escape_csv_cell, parse_csv_upload


class ImportProductsView(BaseApiView):
    """CSV 导入商品 — 上传 → 预览 → 确认导入"""
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
            rows = parse_csv_upload(uploaded)
        except UploadValidationError:
            return Response({'detail': Messages.ADMIN_IMPORT_PREVIEW_FAILED}, status=status.HTTP_400_BAD_REQUEST)

        if not rows:
            return Response({'detail': Messages.ADMIN_IMPORT_NO_DATA}, status=status.HTTP_400_BAD_REQUEST)

        # 预览模式：返回解析结果
        if request.data.get('preview') == 'true':
            preview = []
            errors = []
            for i, row in enumerate(rows):
                name = row.get('name', '').strip()
                brand_name = row.get('brand', '').strip()
                category_path = row.get('category', '').strip()
                price = row.get('price', '0').strip()
                stock = row.get('stock', '0').strip()
                description = row.get('description', '').strip()

                row_errors = []
                if not name:
                    row_errors.append('Name is required')
                if not brand_name:
                    row_errors.append('Brand is required')
                if not category_path:
                    row_errors.append('Category is required')

                preview.append({
                    'row': i + 1, 'name': name, 'brand': brand_name,
                    'category': category_path, 'price': price, 'stock': stock,
                    'description': description,
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
        imported = 0
        errors = []
        for i, row in enumerate(rows):
            try:
                name = row.get('name', '').strip()
                brand_name = row.get('brand', '').strip()
                category_path = row.get('category', '').strip()
                price = row.get('price', '0').strip()
                stock = row.get('stock', '0').strip()
                description = row.get('description', '').strip()
                main_image = row.get('main_image', '').strip()

                if not name:
                    continue

                # 查找或创建品牌
                brand, _ = Brand.objects.get_or_create(
                    name=brand_name,
                    defaults={'is_active': True},
                )

                # 查找分类（按路径最后一段）
                category_name = category_path.split('/')[-1].strip() if '/' in category_path else category_path
                category = Category.objects.filter(name__iexact=category_name, is_active=True).first()
                if not category:
                    category = Category.objects.filter(is_active=True).first()
                if not category:
                    continue

                spu = SPU.objects.create(
                    name=name, brand=brand, category=category,
                    description=description or '',
                    main_image=main_image or '',
                    status=SPUStatus.DRAFT,
                )

                # 创建默认 SKU
                SKU.objects.create(
                    spu=spu,
                    spec_values={},
                    price=float(price) if price else 0,
                    stock=int(stock) if stock else 0,
                    shelf_status='on',
                )
                imported += 1
            except Exception as e:
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
