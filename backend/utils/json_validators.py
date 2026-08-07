"""
JSONField 校验工具 — 提供通用的 JSONField 格式校验函数。
用于 DRF Serializer 的 validators 参数或 validate_<field> 方法。
"""
from __future__ import annotations

from rest_framework import serializers


def validate_specs(value):
    """SPU.specs 格式校验: [{"name": "颜色", "values": ["红","蓝"]}, ...]"""
    if not isinstance(value, list):
        raise serializers.ValidationError("规格定义必须是列表")
    for i, item in enumerate(value):
        if not isinstance(item, dict):
            raise serializers.ValidationError(f"规格[{i}]必须是对象")
        if 'name' not in item or not isinstance(item['name'], str):
            raise serializers.ValidationError(f"规格[{i}]缺少名称 (name)")
        if 'values' not in item or not isinstance(item['values'], list):
            raise serializers.ValidationError(f"规格[{i}]缺少值列表 (values)")
        if not item['values']:
            raise serializers.ValidationError(f"规格[{i}]值列表不能为空")
        if not all(isinstance(v, str) for v in item['values']):
            raise serializers.ValidationError(f"规格[{i}]值列表必须全部为字符串")
    return value


def validate_spec_values(value):
    """SKU.spec_values 格式校验: {"颜色": "红色", "尺寸": "M"}"""
    if not isinstance(value, dict):
        raise serializers.ValidationError("规格值必须是字典")
    for k, v in value.items():
        if not isinstance(k, str) or not isinstance(v, str):
            raise serializers.ValidationError("规格值的键和值必须是字符串")
    return value


def validate_shipping_address(value):
    """Order.shipping_address 格式校验"""
    required_fields = {'name', 'phone', 'city', 'state', 'zip_code', 'address'}
    if not isinstance(value, dict):
        raise serializers.ValidationError("收货地址必须是字典")
    missing = required_fields - set(value.keys())
    if missing:
        raise serializers.ValidationError(f"收货地址缺少必要字段: {', '.join(sorted(missing))}")
    return value


def validate_tags(value):
    """SPU.tags 格式校验: ["标签1", "标签2"]"""
    if not isinstance(value, list):
        raise serializers.ValidationError("标签必须是列表")
    if not all(isinstance(t, str) for t in value):
        raise serializers.ValidationError("标签列表必须全部为字符串")
    if len(value) > 20:
        raise serializers.ValidationError("标签数量不能超过 20 个")
    return value


def validate_evidence(value):
    """AfterSale.evidence 凭证图片校验"""
    if not isinstance(value, list):
        raise serializers.ValidationError("凭证必须是列表")
    if not all(isinstance(v, str) for v in value):
        raise serializers.ValidationError("凭证列表必须全部为 URL 字符串")
    return value
