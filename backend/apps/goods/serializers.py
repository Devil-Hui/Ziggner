from rest_framework import serializers
import re

from utils.json_validators import validate_spec_values


class BrandSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    logo_url = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField()


class SKUSimpleSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    spu_id = serializers.IntegerField()
    spec_values = serializers.JSONField(validators=[validate_spec_values])
    price = serializers.DecimalField(max_digits=10, decimal_places=2)
    discount_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    stock = serializers.IntegerField()
    shelf_status = serializers.CharField()
    sku_code = serializers.CharField(required=False, allow_blank=True)
    barcode = serializers.CharField(required=False, allow_blank=True)
    weight = serializers.DecimalField(max_digits=8, decimal_places=2, required=False)
    cost_price = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)
    image_url = serializers.CharField(required=False, allow_blank=True)
    track_inventory = serializers.BooleanField(required=False, default=True)


class ProductMediaSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    media_type = serializers.CharField()
    sort_order = serializers.IntegerField()
    status = serializers.CharField()
    alt_text = serializers.CharField(required=False, allow_blank=True)
    thumb_url = serializers.CharField(required=False, allow_blank=True)
    list_url = serializers.CharField(required=False, allow_blank=True)
    large_url = serializers.CharField(required=False, allow_blank=True)
    original_url = serializers.CharField(required=False, allow_blank=True)
    video_url = serializers.CharField(required=False, allow_blank=True)
    video_thumb_url = serializers.CharField(required=False, allow_blank=True)
    video_list_url = serializers.CharField(required=False, allow_blank=True)
    video_large_url = serializers.CharField(required=False, allow_blank=True)
    file_size = serializers.IntegerField(required=False)


class SPUDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    brand_id = serializers.IntegerField(required=False)
    brand_name = serializers.CharField(required=False, allow_blank=True)
    category_id = serializers.IntegerField(required=False)
    category_path = serializers.CharField(required=False, allow_blank=True)
    main_image = serializers.CharField(required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.CharField()
    skus = SKUSimpleSerializer(many=True, required=False)
    media = ProductMediaSerializer(many=True, required=False)
    tags = serializers.ListField(required=False)
    specs = serializers.ListField(required=False)                # 规格定义 [{"name":"Color","values":[...]}]
    attributes = serializers.ListField(required=False)           # 属性 [{"name":"Material","value":"Aluminum"}]
    meta_title = serializers.CharField(required=False, allow_blank=True)
    meta_description = serializers.CharField(required=False, allow_blank=True)
    product_type = serializers.CharField(required=False, allow_blank=True)
    requires_shipping = serializers.BooleanField(required=False)
    taxable = serializers.BooleanField(required=False)
    product_kind = serializers.CharField(required=False, default='physical')
    submitted_by_name = serializers.CharField(required=False, allow_blank=True)
    submitted_at = serializers.DateTimeField(required=False)


# ==================== Admin 请求/响应 Serializer（@extend_schema 用） ====================

class SPUCreateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=200)
    brand_id = serializers.IntegerField()
    category_id = serializers.IntegerField()
    description = serializers.CharField(required=False, allow_blank=True)
    main_image = serializers.CharField(required=False, allow_blank=True)
    specs = serializers.ListField(required=False)
    meta_title = serializers.CharField(required=False, allow_blank=True, max_length=120)
    meta_description = serializers.CharField(required=False, allow_blank=True, max_length=320)
    product_type = serializers.CharField(required=False, allow_blank=True, max_length=100)
    tags = serializers.ListField(required=False)
    requires_shipping = serializers.BooleanField(required=False, default=True)
    taxable = serializers.BooleanField(required=False, default=True)
    product_kind = serializers.ChoiceField(
        choices=['physical', 'virtual'], required=False, default='physical',
    )


class SPUUpdateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=200)
    brand_id = serializers.IntegerField(required=False)
    category_id = serializers.IntegerField(required=False)
    description = serializers.CharField(required=False, allow_blank=True)
    main_image = serializers.CharField(required=False, allow_blank=True)
    specs = serializers.ListField(required=False)
    meta_title = serializers.CharField(required=False, allow_blank=True, max_length=120)
    meta_description = serializers.CharField(required=False, allow_blank=True, max_length=320)
    product_type = serializers.CharField(required=False, allow_blank=True, max_length=100)
    tags = serializers.ListField(required=False)
    requires_shipping = serializers.BooleanField(required=False)
    taxable = serializers.BooleanField(required=False)
    product_kind = serializers.ChoiceField(
        choices=['physical', 'virtual'], required=False,
    )


class SPUAdminDetailSerializer(serializers.Serializer):
    """管理端 SPU 详情响应 schema"""
    id = serializers.IntegerField()
    name = serializers.CharField()
    brand_id = serializers.IntegerField()
    brand_name = serializers.CharField()
    category_id = serializers.IntegerField()
    category_path = serializers.CharField()
    description = serializers.CharField()
    main_image = serializers.CharField()
    specs = serializers.ListField()
    status = serializers.CharField()
    status_display = serializers.CharField()
    submitted_by = serializers.CharField(required=False)
    submitted_at = serializers.DateTimeField(required=False)
    reviewed_by = serializers.CharField(required=False)
    reviewed_at = serializers.DateTimeField(required=False)
    review_comment = serializers.CharField(required=False)
    scheduled_publish_at = serializers.DateTimeField(required=False)
    scheduled_unpublish_at = serializers.DateTimeField(required=False)
    skus = serializers.ListField()
    tags = serializers.ListField()
    media = serializers.ListField()
    product_kind = serializers.CharField()
    created_at = serializers.DateTimeField()
    updated_at = serializers.DateTimeField()


class TagCreateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(max_length=50)
    color = serializers.CharField(
        required=False, default='#e74c3c', max_length=7,
        help_text='HEX 色值，如 #e74c3c',
    )
    is_active = serializers.BooleanField(required=False, default=True)


class TagUpdateRequestSerializer(serializers.Serializer):
    name = serializers.CharField(required=False, max_length=50)
    color = serializers.CharField(required=False, max_length=7)
    is_active = serializers.BooleanField(required=False)


class TagResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    color = serializers.CharField()
    is_active = serializers.BooleanField()


class MediaUpdateRequestSerializer(serializers.Serializer):
    alt_text = serializers.CharField(required=False, allow_blank=True, max_length=200)
    sort_order = serializers.IntegerField(required=False, min_value=0)


class MediaUpdateResponseSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    alt_text = serializers.CharField()
    sort_order = serializers.IntegerField()
    message = serializers.CharField()


class MediaReorderRequestSerializer(serializers.Serializer):
    media_ids = serializers.ListField(child=serializers.IntegerField())


# ==================== Tag color 校验 ====================

TAG_COLOR_PATTERN = re.compile(r'^#[0-9A-Fa-f]{6}$')


def validate_tag_color(color: str) -> str:
    """校验 Tag color HEX 格式，非法抛出 ValidationError。

    Args:
        color: 待校验的 HEX 色值字符串，如 '#e74c3c'。

    Returns:
        校验通过的 color 原值。

    Raises:
        rest_framework.exceptions.ValidationError: 当 color 不匹配 ^#[0-9A-Fa-f]{6}$ 时。
    """
    if not TAG_COLOR_PATTERN.match(color or ''):
        from rest_framework.exceptions import ValidationError
        raise ValidationError({'color': f'无效的颜色值: {color}，需为 #RRGGBB 格式'})
    return color