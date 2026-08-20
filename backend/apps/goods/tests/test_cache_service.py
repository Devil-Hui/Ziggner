"""
商品缓存服务测试（GoodsCacheService）—— 缓存一致性核心。

覆盖：
  - invalidate_spu / invalidate_sku / invalidate_category_tree / invalidate_hot_products
  - clear_by_prefix 键前缀匹配（回归 §7 问题：KEY_PREFIX+version 匹配）
  - L1 LocMem + L2 Redis 两级读取

说明：GoodsCacheService 内部使用 `Cache('goods')`（utils.cache.Cache），
读写都带 `goods:` 业务前缀并写入 rw_default/rw_default_slave 后端。
因此本测试必须用同一个 `Cache('goods')` 包装器读写，才能命中相同的真实 Redis key。
"""
from __future__ import annotations

from django.test import TestCase

from apps.goods.models import Category
from apps.goods.services import GoodsCacheService
from apps.goods.tests.factories import CategoryFactory, SPUFactory
from utils.cache import Cache

import pytest

pytestmark = pytest.mark.integration

_goods = Cache('goods')


class GoodsCacheServiceTest(TestCase):
    def setUp(self):
        self.cat = CategoryFactory()
        self.spu = SPUFactory(category=self.cat)

    def _get(self, key):
        return _goods.get(key)

    def test_invalidate_spu_removes_cache(self):
        _goods.set(f"spu:{self.spu.id}", {"name": "x"}, 60)
        _goods.set(f"spu:{self.spu.id}:skus", [1, 2, 3], 60)
        GoodsCacheService.invalidate_spu(self.spu.id)
        self.assertIsNone(self._get(f"spu:{self.spu.id}"))
        self.assertIsNone(self._get(f"spu:{self.spu.id}:skus"))

    def test_invalidate_sku_invalidates_parent_spu(self):
        _goods.set("sku:99", {"stock": 5}, 60)
        _goods.set(f"spu:{self.spu.id}", {"name": "x"}, 60)
        GoodsCacheService.invalidate_sku(99, spu_id=self.spu.id)
        self.assertIsNone(self._get("sku:99"))
        self.assertIsNone(self._get(f"spu:{self.spu.id}"))

    def test_invalidate_category_tree(self):
        _goods.set("category:tree:active", [], 60)
        GoodsCacheService.invalidate_category_tree()
        self.assertIsNone(self._get("category:tree:active"))

    def test_invalidate_hot_products(self):
        _goods.set("hot:products", [], 60)
        _goods.set("hot:products:5", [], 60)
        GoodsCacheService.invalidate_hot_products()
        self.assertIsNone(self._get("hot:products"))
        self.assertIsNone(self._get("hot:products:5"))

    def test_two_level_cache_read_after_set(self):
        # L1 LocMem + L2 Redis：写入后读取应命中
        _goods.two_level_set("spu:demo", {"name": "t"}, 60)
        self.assertEqual(_goods.two_level_get("spu:demo"), {"name": "t"})

    def test_clear_by_prefix_removes_matching_keys(self):
        # clear_by_prefix 内部按 KEY_PREFIX(goods:) 匹配真实 key
        _goods.set("spu:list:page1", [1], 60)
        _goods.set("spu:other", [2], 60)
        _goods.clear_by_prefix("spu:list")
        self.assertIsNone(self._get("spu:list:page1"))
        # spu:other 不匹配 spu:list 前缀 → 保留
        self.assertEqual(self._get("spu:other"), [2])