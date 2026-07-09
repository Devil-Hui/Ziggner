import csv
import io
from rest_framework import status
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse, OpenApiTypes
from django.http import HttpResponse
from utils.api_base_view import BaseApiView
from utils.response_codes import Messages
from ..models import SPU, SPUStatus, SKU, Brand, Category
from ..admin_permissions import IsStaffOrAbove


class ImportProductsView(BaseApiView):
    """CSV 导入商品 — 上传 → 预览 → 确认导入"""
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={201: OpenApiResponse(description='Import result')}
    )
    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': Messages.ADMIN_IMPORT_INVALID_FORMAT}, status=status.HTTP_400_BAD_REQUEST)

        # 解析 CSV
        try:
            content = uploaded.read().decode('utf-8-sig')
            reader = csv.DictReader(io.StringIO(content))
            rows = list(reader)
        except Exception:
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
    permission_classes = [IsStaffOrAbove]

    @extend_schema(
        request=OpenApiTypes.OBJECT,
        responses={200: OpenApiResponse(description='CSV file')}
    )
    def post(self, request):
        spus = SPU.objects.filter(deleted_at__isnull=True).select_related('brand', 'category').prefetch_related('skus')

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(['Name', 'Brand', 'Category', 'Price', 'Stock', 'Status', 'Description', 'Main Image', 'Created At'])

        for spu in spus:
            sku = spu.skus.first()
            price = str(sku.price) if sku else ''
            stock = str(sku.stock) if sku else ''
            category_path = self._get_category_path(spu.category)
            writer.writerow([
                spu.name, spu.brand.name, category_path,
                price, stock, spu.status,
                spu.description, spu.main_image or '',
                spu.created_at.strftime('%Y-%m-%d %H:%M:%S') if spu.created_at else '',
            ])

        response = HttpResponse(output.getvalue(), content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="products_export.csv"'
        return response

    @staticmethod
    def _get_category_path(category):
        parts = []
        current = category
        while current:
            parts.insert(0, current.name)
            current = current.parent
        return ' / '.join(parts)