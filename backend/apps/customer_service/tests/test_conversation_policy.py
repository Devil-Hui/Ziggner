"""
客户服务子系统 —— 客服分组隔离与访问策略测试（大厂规范重点）。

对应需求：
  - 「工单流转（客服分组隔离）」：客服仅能查看/处理本组客户会话
  - 「客服仅能查看本组客户订单」：ConversationAccessPolicy.scope_queryset 的组级 DB 隔离
  - 超管 / 运维视全量（只读）；普通用户仅见自己发起的会话

覆盖 ConversationAccessPolicy：
  - is_agent / is_ops / is_superadmin 身份判断
  - can_send_as_agent（需 cs.message.write）
  - scope_queryset 行级隔离：组长→仅本组成员所在的会话；ops→全量；customer→仅自己的

说明：策略为纯查询语义，标 integration（依赖 DB 落库构造身份与会话）。
"""
from __future__ import annotations

import pytest

from apps.customer_service.models import Conversation
from apps.customer_service.policies import ConversationAccessPolicy
from apps.goods.models import AdminGroupMember
from apps.goods.tests.factories import AdminGroupFactory, AdminGroupMemberFactory
from apps.rbac.constants import Role
from apps.rbac.models import UserRole
from apps.users.tests.factories import UserFactory

pytestmark = [pytest.mark.integration]


@pytest.fixture
def cs_tree(db):
    """组 G1/G2 各有一名客服 member；构造两个归属不同组的会话。"""
    g1 = AdminGroupFactory()
    g2 = AdminGroupFactory()

    agent1 = UserFactory()
    agent2 = UserFactory()
    AdminGroupMemberFactory(
        user=agent1, group=g1,
        role=AdminGroupMember.Role.MEMBER,
        status=AdminGroupMember.Status.ACTIVE,
    )
    AdminGroupMemberFactory(
        user=agent2, group=g2,
        role=AdminGroupMember.Role.MEMBER,
        status=AdminGroupMember.Status.ACTIVE,
    )

    buyer = UserFactory()
    conv1 = Conversation.objects.create(user=buyer, group=g1, subject="g1 咨询")
    conv2 = Conversation.objects.create(user=buyer, group=g2, subject="g2 咨询")

    return {
        "g1": g1, "g2": g2,
        "agent1": agent1, "agent2": agent2,
        "buyer": buyer, "conv1": conv1, "conv2": conv2,
    }


def _scoped(conv_qs, user):
    return list(ConversationAccessPolicy.scope_queryset(conv_qs, user).values_list("id", flat=True))


class TestIdentity:
    @pytest.mark.django_db
    def test_agent_needs_cs_perm(self, cs_tree):
        # 组员身份 + cs.conversation.read 权限 → 是客服
        from apps.rbac.services import has_perm
        assert ConversationAccessPolicy.is_agent(cs_tree["agent1"]) is True
        # 当前 member 默认授予 cs.conversation.read（见 DEFAULT_ROLE_PERMS 的 ADMIN_MEMBER）
        assert has_perm(cs_tree["agent1"], "cs.conversation.read") is True

    @pytest.mark.django_db
    def test_ops_is_agent_false_but_read_all(self, cs_tree):
        ops = UserFactory()
        UserRole.objects.create(user=ops, role=Role.OPS.value)
        assert ConversationAccessPolicy.is_ops(ops) is True
        assert ConversationAccessPolicy.is_agent(ops) is False
        assert ConversationAccessPolicy.redact_sensitive(ops) is True

    @pytest.mark.django_db
    def test_can_send_as_agent_requires_message_write(self, cs_tree):
        # member 拥有 cs.message.write → 可发
        assert ConversationAccessPolicy.can_send_as_agent(cs_tree["agent1"]) is True
        # customer 无客服权限 → 不能作为客服发消息
        assert ConversationAccessPolicy.can_send_as_agent(cs_tree["buyer"]) is False


class TestGroupIsolation:
    """客服分组隔离：agent1 仅见本组会话，跨组不可见。"""

    @pytest.mark.django_db
    def test_agent1_only_own_group(self, cs_tree):
        visible = _scoped(Conversation.objects.all(), cs_tree["agent1"])
        assert cs_tree["conv1"].pk in visible
        assert cs_tree["conv2"].pk not in visible  # 跨组会话不可见

    @pytest.mark.django_db
    def test_agent2_only_own_group(self, cs_tree):
        visible = _scoped(Conversation.objects.all(), cs_tree["agent2"])
        assert cs_tree["conv2"].pk in visible
        assert cs_tree["conv1"].pk not in visible

    @pytest.mark.django_db
    def test_superadmin_sees_all(self, cs_tree):
        superadmin = UserFactory(is_superuser=True)
        visible = _scoped(Conversation.objects.all(), superadmin)
        assert cs_tree["conv1"].pk in visible
        assert cs_tree["conv2"].pk in visible

    @pytest.mark.django_db
    def test_ops_sees_all_read_only(self, cs_tree):
        ops = UserFactory()
        UserRole.objects.create(user=ops, role=Role.OPS.value)
        visible = _scoped(Conversation.objects.all(), ops)
        assert cs_tree["conv1"].pk in visible
        assert cs_tree["conv2"].pk in visible

    @pytest.mark.django_db
    def test_buyer_sees_only_own_conversations(self, cs_tree):
        other = UserFactory()
        visible = _scoped(Conversation.objects.all(), cs_tree["buyer"])
        assert cs_tree["conv1"].pk in visible
        assert cs_tree["conv2"].pk in visible  # 自己发起的两个会话均可见
        assert _scoped(Conversation.objects.all(), other) == []


class TestWSGroupIsolation:
    """模拟 WS 连接时的 get_conversation 组级校验（对应消费者 _can_access_conversation）。"""

    @pytest.mark.django_db
    def test_agent_cannot_access_other_group_conversation(self, cs_tree):
        got = ConversationAccessPolicy.get_conversation(cs_tree["conv2"].id, cs_tree["agent1"])
        assert got is None  # agent1 访问 conv2（跨组）→ 拒绝

    @pytest.mark.django_db
    def test_agent_can_access_own_group_conversation(self, cs_tree):
        got = ConversationAccessPolicy.get_conversation(cs_tree["conv1"].id, cs_tree["agent1"])
        assert got is not None