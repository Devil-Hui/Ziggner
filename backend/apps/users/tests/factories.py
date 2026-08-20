"""
users 子系统测试数据工厂。

遵循「TestCase 事务自动回滚」决策：Factory 只构造数据，用例结束由 TestCase 回滚清理。
"""
from __future__ import annotations

import factory
from django.contrib.auth import get_user_model
from factory.django import DjangoModelFactory

from apps.users.models import UserProfile

User = get_user_model()


class UserFactory(DjangoModelFactory):
    class Meta:
        model = User
        django_get_or_create = ("username",)

    username = factory.Sequence(lambda n: "tu_%05d" % n)
    email = factory.Sequence(lambda n: "tu_%05d@example.com" % n)
    password = factory.PostGenerationMethodCall("set_password", "Str0ng!Pass123")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    is_active = True

    @classmethod
    def _after_postgeneration(cls, obj, create, *args, **kwargs):
        # 首次写 avatar 惰性建 profile（与生产逻辑一致）
        if create and not hasattr(obj, "profile"):
            profile = UserProfile.objects.get_or_create(user=obj)[0]
            # account_no 为 unique + NOT NULL 字段，不填充则多用户创建时 '' 冲突
            if not profile.account_no:
                from apps.users.models import generate_account_no
                profile.account_no = generate_account_no()
                profile.save(update_fields=["account_no"])
        return obj


class UserProfileFactory(DjangoModelFactory):
    class Meta:
        model = UserProfile

    user = factory.SubFactory(UserFactory)
    avatar = ""
    email_verified = False
