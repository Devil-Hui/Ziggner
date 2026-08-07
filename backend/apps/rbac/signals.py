"""权限数据变更后立即失效本进程缓存。跨进程一致性靠 TTL 兜底。"""
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver

from apps.rbac.models import RolePermission, UserRole
from apps.rbac.services import invalidate_role_perms, invalidate_user


@receiver([post_save, post_delete], sender=RolePermission)
def _on_role_permission_changed(sender, **kwargs):
    invalidate_role_perms()


@receiver([post_save, post_delete], sender=UserRole)
def _on_user_role_changed(sender, instance, **kwargs):
    invalidate_user(instance.user_id)
