"""
RBAC 数据模型 —— 只有两张表。

  UserRole        用户 ↔ 角色
  RolePermission  角色 ↔ 权限点（可由 superadmin 在界面上调整）

角色枚举与权限点清单都在 constants.py，不入库。
"""
from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import models

from apps.rbac.constants import Role, is_valid_perm


class UserRole(models.Model):
    """用户的全局角色。一个用户可有多个角色，权限取并集。"""

    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='rbac_roles',
        verbose_name='用户',
    )
    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        verbose_name='角色',
    )
    granted_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='rbac_granted_roles',
        verbose_name='授予人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='授予时间')

    class Meta:
        db_table = 'rbac_user_role'
        verbose_name = '用户角色'
        verbose_name_plural = verbose_name
        unique_together = [('user', 'role')]
        indexes = [
            models.Index(fields=['user'], name='idx_rbac_ur_user'),
            models.Index(fields=['role'], name='idx_rbac_ur_role'),
        ]
        ordering = ['user_id', 'role']

    def __str__(self) -> str:
        return f'{self.user_id} → {self.role}'


class RolePermission(models.Model):
    """角色被授予的权限点。perm_code 必须存在于 constants.PERMISSIONS。"""

    role = models.CharField(
        max_length=32,
        choices=Role.choices,
        verbose_name='角色',
    )
    perm_code = models.CharField(max_length=64, verbose_name='权限点')
    granted_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='rbac_granted_perms',
        verbose_name='授予人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='授予时间')

    class Meta:
        db_table = 'rbac_role_permission'
        verbose_name = '角色权限'
        verbose_name_plural = verbose_name
        unique_together = [('role', 'perm_code')]
        indexes = [
            models.Index(fields=['role'], name='idx_rbac_rp_role'),
        ]
        ordering = ['role', 'perm_code']

    def clean(self) -> None:
        if not is_valid_perm(self.perm_code):
            raise ValidationError({'perm_code': f'未注册的权限点: {self.perm_code}'})

    def save(self, *args, **kwargs):
        # 在 save 层校验，保证无论从 admin、API 还是脚本写入都不会落入非法 code
        self.clean()
        return super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f'{self.role} → {self.perm_code}'
