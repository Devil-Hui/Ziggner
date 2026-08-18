"""商品信号 —— 同步缓存、布隆过滤器、main_image、审核组角色"""
import logging
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from django.db import transaction

from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.rbac.services import invalidate_user
from apps.users.tokens import rotate_user_stamp

from .models import AdminGroupMember, ProductMedia, SPU, SKU
from .services import GoodsCacheService

logger = logging.getLogger(__name__)


# ── SPU 信号：创建/更新时自动同步布隆过滤器 + 清除缓存 ──

@receiver(post_save, sender=SPU)
def on_spu_saved(sender, instance, created, **kwargs):
    """SPU 保存后：同步布隆过滤器并清除相关缓存"""
    if created:
        GoodsCacheService.add_spu_to_bloom(instance.id)
        logger.info(f'信号: SPU#{instance.id} 已加入布隆过滤器')
    # 清除 SPU 详情缓存 & 列表缓存（确保下次请求拿到最新数据）
    transaction.on_commit(lambda: GoodsCacheService.invalidate_spu(instance.id))
    transaction.on_commit(lambda: GoodsCacheService.invalidate_spu_list())


# ── SKU 信号：创建/更新时自动同步布隆过滤器 + 清除缓存 ──

@receiver(post_save, sender=SKU)
def on_sku_saved(sender, instance, created, **kwargs):
    """SKU 保存后：同步布隆过滤器并清除相关缓存"""
    if created:
        GoodsCacheService.add_sku_to_bloom(instance.id)
        logger.info(f'信号: SKU#{instance.id} 已加入布隆过滤器')
    # 清除所属 SPU 详情缓存 & 热销缓存
    if instance.spu_id:
        transaction.on_commit(lambda: GoodsCacheService.invalidate_spu(instance.spu_id))
        transaction.on_commit(lambda: GoodsCacheService.invalidate_hot_products())


# ── ProductMedia 信号：同步 main_image ──

@receiver(post_save, sender=ProductMedia)
def sync_main_image_on_media_active(sender, instance, **kwargs):
    """当图片媒体变为 active 且 sort_order=0 时，同步 SPU.main_image"""
    if instance.media_type != 'image':
        return
    if instance.sort_order != 0:
        return
    if instance.status != 'active':
        return
    if not instance.spu_id:
        return
    if not instance.large_url:
        return

    spu = SPU.objects.filter(id=instance.spu_id).first()
    if spu and spu.main_image != instance.large_url:
        SPU.objects.filter(id=instance.spu_id).update(main_image=instance.large_url)
        logger.info(f'信号: 已同步 SPU#{instance.spu_id} main_image: {instance.large_url}')

# ── AdminGroupMember 信号：审核组成员身份 → RBAC 全局角色 ──
#
# 审核组（业务分组）与全局角色是两个概念，但组员身份天然蕴含管理权限。
# 这里做单向派生：组成员变动 → 重算该用户的 admin_leader / admin_member 角色。
# 反向不成立 —— 手工授予的角色不会凭空造出组成员身份。

_GROUP_ROLE_MAP = {
    AdminGroupMember.Role.LEADER: Role.ADMIN_LEADER.value,
    AdminGroupMember.Role.MEMBER: Role.ADMIN_MEMBER.value,
}
_DERIVED_ROLES = list(_GROUP_ROLE_MAP.values())


def _resync_admin_roles(user_id: int) -> None:
    """按该用户当前的全部活跃组成员身份，重算其派生角色。"""
    if not user_id:
        return

    active_roles = AdminGroupMember.objects.filter(
        user_id=user_id, status=AdminGroupMember.Status.ACTIVE
    ).values_list('role', flat=True)
    wanted = {_GROUP_ROLE_MAP[r] for r in active_roles if r in _GROUP_ROLE_MAP}

    current = set(
        UserRole.objects.filter(
            user_id=user_id, role__in=_DERIVED_ROLES
        ).values_list('role', flat=True)
    )

    stale = current - wanted
    if stale:
        UserRole.objects.filter(user_id=user_id, role__in=list(stale)).delete()

    for role in sorted(wanted - current):
        UserRole.objects.get_or_create(user_id=user_id, role=role)

    invalidate_user(user_id)
    # 旋转安全戳：组员身份变更使该用户所有旧会话立即失效，必须重新登录以获取新角色
    rotate_user_stamp(user_id)


@receiver([post_save, post_delete], sender=AdminGroupMember)
def sync_admin_group_role(sender, instance, **kwargs):
    _resync_admin_roles(instance.user_id)
