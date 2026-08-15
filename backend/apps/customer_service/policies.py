from apps.rbac.constants import Role
from apps.rbac.services import has_perm, has_role


class ConversationAccessPolicy:
    @staticmethod
    def is_superadmin(user):
        return has_role(user, Role.SUPERADMIN.value)

    @staticmethod
    def is_ops(user):
        # 超管（含同时拥有 ops 角色）永远是客服/管理员，不被视为纯只读运维；
        # 与 is_agent 的修复保持一致，避免超管被 ops 角色误伤导致 WS 403。
        if ConversationAccessPolicy.is_superadmin(user):
            return False
        return has_role(user, Role.OPS.value)

    @staticmethod
    def is_agent(user):
        # 超管（含同时拥有 ops 角色）永远视为客服，可接管；
        # 只有「非超管」的纯只读运维才被排除，避免超管被 ops 角色误伤导致 403。
        if ConversationAccessPolicy.is_superadmin(user):
            return True
        return (
            not ConversationAccessPolicy.is_ops(user)
            and has_perm(user, 'cs.conversation.read')
        )

    @staticmethod
    def can_send_as_agent(user):
        return (
            ConversationAccessPolicy.is_agent(user)
            and has_perm(user, 'cs.message.write')
        )

    @staticmethod
    def redact_sensitive(user):
        return ConversationAccessPolicy.is_ops(user)

    @staticmethod
    def scope_queryset(queryset, user):
        if ConversationAccessPolicy.is_superadmin(user) or ConversationAccessPolicy.is_ops(user):
            return queryset
        if ConversationAccessPolicy.is_agent(user):
            return queryset.filter(
                group__members__user=user,
                group__members__status=1,
            ).distinct()
        return queryset.filter(user=user)

    @staticmethod
    def get_conversation(conversation_id, user):
        from .models import Conversation

        return ConversationAccessPolicy.scope_queryset(
            Conversation.objects.all(), user,
        ).filter(id=conversation_id).first()
