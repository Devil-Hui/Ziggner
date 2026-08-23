from django.db.models import Exists, OuterRef

from .models import OrderItem
from apps.rbac.constants import Role
from apps.rbac.scopes import get_user_scope
from apps.rbac.services import has_role


class OrderAdminAccessPolicy:
    @staticmethod
    def is_superadmin(user):
        return has_role(user, Role.SUPERADMIN.value)

    @staticmethod
    def is_ops(user):
        return has_role(user, Role.OPS.value)

    @staticmethod
    def redact_sensitive(user):
        return (
            OrderAdminAccessPolicy.is_ops(user)
            and not OrderAdminAccessPolicy.is_superadmin(user)
        )

    @staticmethod
    def scope_orders(queryset, user):
        # 统一范围判定：超管/运维 → all；其余按管辖分类行级过滤（见 apps.rbac.scopes）
        scope = get_user_scope(user, category_field='order')
        if scope.is_all:
            return queryset

        category_ids = scope.managed_category_ids
        if not category_ids:
            return queryset.none()

        order_items = OrderItem.objects.filter(order_id=OuterRef('pk'))
        owned_items = order_items.filter(sku__spu__category_id__in=category_ids)
        outside_items = order_items.exclude(sku__spu__category_id__in=category_ids)
        return queryset.annotate(
            _scope_has_owned_items=Exists(owned_items),
            _scope_has_outside_items=Exists(outside_items),
        ).filter(
            _scope_has_owned_items=True,
            _scope_has_outside_items=False,
        )

    @staticmethod
    def get_order(order_no, user, queryset=None):
        from .models import Order

        base = queryset if queryset is not None else Order.objects.all()
        return OrderAdminAccessPolicy.scope_orders(base, user).filter(
            order_no=order_no,
        ).first()

    @staticmethod
    def scope_after_sales(queryset, user):
        from .models import Order

        order_ids = OrderAdminAccessPolicy.scope_orders(
            Order.objects.all(), user,
        ).values('id')
        return queryset.filter(order_id__in=order_ids)
