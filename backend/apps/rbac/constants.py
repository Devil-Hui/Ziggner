"""
RBAC 常量注册表 —— 角色与权限点的**唯一真源**。

设计约定：
  1. 角色固定，写死在 Role 枚举里，不入库。
  2. 权限点是代码语义，也不入库；DB 只存"哪个角色被授予哪个权限点"。
     这样不会长出"库里有、代码里没有"的幽灵权限。
  3. 新增权限点 = 在 PERMISSIONS 里加一行 + 在 DEFAULT_ROLE_PERMS 里决定默认授予谁。
     不需要改任何视图以外的地方。
"""
from __future__ import annotations

from typing import NamedTuple

from django.db import models


class Role(models.TextChoices):
    """全局角色。与 goods.AdminGroupMember.role（组内职责）是两个概念，勿混。"""

    SUPERADMIN = 'superadmin', '超级管理员'
    OPS = 'ops', '运维'
    ADMIN_LEADER = 'admin_leader', '管理组组长'
    ADMIN_MEMBER = 'admin_member', '管理组组员'
    CUSTOMER = 'customer', '普通用户'


#: 无任何 UserRole 记录时的兜底角色
DEFAULT_ROLE = Role.CUSTOMER


class Perm(NamedTuple):
    """一个权限点。domain 用于运维清单分组展示。"""

    code: str
    domain: str
    label: str


# ==================== 权限点注册表 ====================
# 命名规范：<域>.<资源>.<动作>，全小写，点分三段。
# 动作统一用 read / write / audit 等动词，避免 view/list/get 同义词泛滥。

PERMISSIONS: tuple[Perm, ...] = (
    # ── 商品域 ──
    Perm('goods.spu.read', 'goods', '查看商品'),
    Perm('goods.spu.write', 'goods', '编辑商品'),
    Perm('goods.spu.audit', 'goods', '审核商品'),
    Perm('goods.sku.write', 'goods', '编辑 SKU 与库存'),
    Perm('goods.category.write', 'goods', '管理分类'),
    Perm('goods.brand.write', 'goods', '管理品牌'),
    Perm('goods.tag.write', 'goods', '管理标签'),
    Perm('goods.media.write', 'goods', '管理商品媒体'),
    Perm('goods.import.execute', 'goods', '导入导出商品'),
    Perm('goods.recycle.restore', 'goods', '回收站恢复'),
    Perm('goods.stats.read', 'goods', '查看商品统计'),
    Perm('goods.group.write', 'goods', '管理商品审核组'),
    Perm('goods.application.review', 'goods', '审批入驻申请'),
    # ── 用户域 ──
    Perm('users.email_template.read', 'users', '查看邮件模板'),
    Perm('users.email_template.write', 'users', '编辑邮件模板'),
    # ── 订单域 ──
    Perm('order.read', 'order', '查看订单'),
    Perm('order.ship', 'order', '订单发货'),
    Perm('order.cancel', 'order', '取消订单'),
    Perm('order.aftersale.review', 'order', '审核售后'),
    # ── 营销域 ──
    Perm('promotion.coupon.write', 'promotion', '管理优惠券'),
    Perm('promotion.activity.write', 'promotion', '管理活动'),
    # ── 客服域 ──
    Perm('cs.conversation.read', 'cs', '查看会话'),
    Perm('cs.conversation.takeover', 'cs', '接管会话'),
    Perm('cs.conversation.close', 'cs', '关闭会话'),
    Perm('cs.message.write', 'cs', '发送客服消息'),
    # ── 工单域 ──
    Perm('support.ticket.read', 'support', '查看工单'),
    Perm('support.ticket.write', 'support', '处理工单'),
    # ── 通知域 ──
    # 注：users.read / users.write 为死权限（无对应视图，真实用户角色操作在 rbac 域），
    # 已于 D4 从注册表移除，避免矩阵出现永不授予的幽灵权限。
    Perm('notification.broadcast', 'notification', '发送站内通知'),
    # ── 权限域（运维核查用）──
    Perm('rbac.matrix.read', 'rbac', '查看角色权限矩阵'),
    Perm('rbac.matrix.write', 'rbac', '修改角色权限矩阵'),
    Perm('rbac.user.read', 'rbac', '查看用户角色'),
    Perm('rbac.user.assign', 'rbac', '分配用户角色'),
    Perm('rbac.audit.read', 'rbac', '查看审计日志'),
)

#: code → Perm，供 O(1) 校验
PERM_MAP: dict[str, Perm] = {p.code: p for p in PERMISSIONS}

#: 所有合法 code 集合
ALL_PERM_CODES: frozenset[str] = frozenset(PERM_MAP)


def is_valid_perm(code: str) -> bool:
    """code 是否为已注册权限点。写入 RolePermission 前必须校验。"""
    return code in ALL_PERM_CODES


# ==================== 默认授权 ====================
# 仅作为**首次初始化**的种子；之后以 DB 中的 RolePermission 为准，
# superadmin 可在界面上调整。

_ADMIN_MEMBER_PERMS = frozenset({
    'goods.spu.read',
    'goods.spu.write',
    'goods.sku.write',
    'goods.media.write',
    'goods.stats.read',
    'order.read',
    'cs.conversation.read',
    'cs.message.write',
    'support.ticket.read',
})

_ADMIN_LEADER_PERMS = _ADMIN_MEMBER_PERMS | {
    'goods.spu.audit',
    'goods.category.write',
    'goods.brand.write',
    'goods.tag.write',
    'goods.group.write',  # 管理审核组（admin_group 增删改视图均要求此权限）
    'goods.import.execute',
    'goods.recycle.restore',
    'goods.application.review',
    'order.ship',
    'order.cancel',
    'order.aftersale.review',
    'promotion.coupon.write',
    'promotion.activity.write',
    'cs.conversation.takeover',
    'cs.conversation.close',
    'support.ticket.write',
    'notification.broadcast',
}

#: 运维是**只读**角色：能看全站权限与用户，不能改任何业务数据。
#: D3 修复：授权邮件模板只读（邮件模板属系统配置，运维审计可见）
#: D4：移除死权限 users.read（无对应视图）
_OPS_PERMS = frozenset({
    'rbac.matrix.read',
    'rbac.user.read',
    'rbac.audit.read',
    'users.email_template.read',
    'goods.spu.read',
    'goods.stats.read',
    'order.read',
    'cs.conversation.read',
    'support.ticket.read',
})

DEFAULT_ROLE_PERMS: dict[str, frozenset[str]] = {
    # superadmin 不在此列：它在 has_perm 里短路放行，不依赖 DB 授权。
    Role.OPS.value: _OPS_PERMS,
    Role.ADMIN_LEADER.value: frozenset(_ADMIN_LEADER_PERMS),
    Role.ADMIN_MEMBER.value: _ADMIN_MEMBER_PERMS,
    Role.CUSTOMER.value: frozenset(),
}
