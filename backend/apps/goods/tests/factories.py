"""
商品运营子系统测试数据工厂。
"""
from __future__ import annotations

import factory
from factory.django import DjangoModelFactory

from apps.goods.models import (
    AdminGroup, AdminGroupMember, Brand, Category, ProductMedia, SPU, SPUStatus, SKU, Tag,
)
from apps.users.tests.factories import UserFactory


class BrandFactory(DjangoModelFactory):
    class Meta:
        model = Brand
        django_get_or_create = ("name",)

    name = factory.Sequence(lambda n: "Brand_%03d" % n)
    is_active = True


class CategoryFactory(DjangoModelFactory):
    class Meta:
        model = Category

    name = factory.Sequence(lambda n: "Cat_%03d" % n)
    parent = None
    admin_group = None
    is_active = True


class AdminGroupFactory(DjangoModelFactory):
    class Meta:
        model = AdminGroup

    name = factory.Sequence(lambda n: "Group_%03d" % n)
    slug = factory.Sequence(lambda n: "group_%03d" % n)
    is_active = True


class AdminGroupMemberFactory(DjangoModelFactory):
    class Meta:
        model = AdminGroupMember

    user = factory.SubFactory(UserFactory)
    group = factory.SubFactory(AdminGroupFactory)
    role = "member"
    # status 为 IntegerChoices（ACTIVE=1）；不可用字符串
    status = AdminGroupMember.Status.ACTIVE


class SPUFactory(DjangoModelFactory):
    class Meta:
        model = SPU

    name = factory.Sequence(lambda n: "SPU_%03d" % n)
    category = factory.SubFactory(CategoryFactory)
    brand = factory.SubFactory(BrandFactory)
    status = SPUStatus.DRAFT
    submitted_by = None


class SKUFactory(DjangoModelFactory):
    class Meta:
        model = SKU

    spu = factory.SubFactory(SPUFactory)
    sku_code = factory.Sequence(lambda n: "SKU_%06d" % n)
    price = factory.Faker("pydecimal", left_digits=3, right_digits=2, positive=True)
    discount_price = None
    stock = 100
    # 注意：SKU.is_active 是只读 property（由 shelf_status/spu.is_active/stock 推导），不可赋值
    shelf_status = "on"


class ProductMediaFactory(DjangoModelFactory):
    class Meta:
        model = ProductMedia

    spu = factory.SubFactory(SPUFactory)
    media_type = "image"
    sort_order = factory.Sequence(lambda n: n)
    status = "active"
    alt_text = factory.Faker("sentence", nb_words=3)


class TagFactory(DjangoModelFactory):
    class Meta:
        model = Tag

    name = factory.Sequence(lambda n: "Tag_%03d" % n)
