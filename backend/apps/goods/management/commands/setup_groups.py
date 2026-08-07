"""
一键创建商品管理角色组，幂等（重复运行不会重复创建）。

用法:
    python manage.py setup_groups
"""

from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

from apps.goods.models import (
    Brand, Category,
    SpecName, SpecValue,
    Attribute, AttributeValue,
    SPU, SPUAttribute, SPUSpec, SPUSpecValue,
    SKU, SKUSpecValue,
)

# ── 主模型（在 Admin 中独立管理） ──
_MAIN_MODELS = [Brand, Category, SpecName, SpecValue, Attribute, AttributeValue, SPU, SKU]

# ── 中间模型（通过 Inline 管理） ──
_INLINE_MODELS = [SPUAttribute, SPUSpec, SPUSpecValue, SKUSpecValue]

ALL_MODELS = _MAIN_MODELS + _INLINE_MODELS

# ── 角色定义 ──
# 格式: {组名: {模型类列表: [权限action列表]}}
# action: add / change / delete / view

ROLE_DEFINITIONS = {
    '商品管理员': {
        'models': ALL_MODELS,
        'actions': ['add', 'change', 'delete', 'view'],
    },
    '商品编辑': {
        'models': ALL_MODELS,
        'actions': ['add', 'change', 'view'],
    },
    '商品只读': {
        'models': ALL_MODELS,
        'actions': ['view'],
    },
    '审批员': {
        'models': _MAIN_MODELS,
        'actions': ['change', 'view'],
    },
    '客服': {
        'models': [Brand, SPU, SKU],
        'actions': ['view'],
    },
}


class Command(BaseCommand):
    help = '创建角色组（管理员/编辑/只读/审批员/客服）'

    def _add_extra_perms(self, group):
        """给客服和审批员补充订单和售后权限"""
        from django.contrib.contenttypes.models import ContentType
        from apps.order.models import Order, AfterSale
        if group.name == '客服':
            for model_cls in [Order, AfterSale]:
                ct = ContentType.objects.get_for_model(model_cls)
                for action in ['view'] if model_cls == Order else ['view', 'change']:
                    codename = f'{action}_{model_cls._meta.model_name}'
                    perm = Permission.objects.filter(content_type=ct, codename=codename).first()
                    if perm:
                        group.permissions.add(perm)
                        self.stdout.write(f'       {model_cls._meta.verbose_name}: {action}')
        elif group.name == '审批员':
            ct = ContentType.objects.get_for_model(Order)
            perm = Permission.objects.filter(content_type=ct, codename='change_order').first()
            if perm:
                group.permissions.add(perm)
                self.stdout.write(f'       Order: change (approve ship/reject)')

    def handle(self, *args, **options):
        for group_name, config in ROLE_DEFINITIONS.items():
            group, created = Group.objects.get_or_create(name=group_name)

            if created:
                self.stdout.write(f'  [+] 创建角色组: {group_name}')
            else:
                self.stdout.write(f'  [=] 角色组已存在: {group_name}，更新权限…')
                group.permissions.clear()

            for model_cls in config['models']:
                ct = ContentType.objects.get_for_model(model_cls)
                codenames = [
                    f'{action}_{model_cls._meta.model_name}'
                    for action in config['actions']
                ]
                perms = Permission.objects.filter(content_type=ct, codename__in=codenames)
                group.permissions.add(*perms)

                if perms:
                    actions_str = ', '.join(config['actions'])
                    self.stdout.write(
                        f'       {model_cls._meta.verbose_name}: {actions_str}'
                    )

            self._add_extra_perms(group)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {group_name} ({group.permissions.count()} 个权限)'))
            self.stdout.write('')

        self.stdout.write(self.style.SUCCESS('角色组设置完成。'))
        self.stdout.write('在 /admin/auth/user/ 编辑用户 → "Groups" → 勾选对应角色即可。')
        self.stdout.write('在 /admin/auth/user/ 编辑用户 → "Groups" → 勾选对应角色即可。')
