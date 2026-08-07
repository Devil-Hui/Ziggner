from apps.rbac.constants import Role
from apps.rbac.services import has_perm, has_role


class SupportConversationAccessPolicy:
    @staticmethod
    def is_superadmin(user):
        return has_role(user, Role.SUPERADMIN.value)

    @staticmethod
    def is_ops(user):
        return has_role(user, Role.OPS.value)

    @staticmethod
    def is_agent(user):
        return (
            not SupportConversationAccessPolicy.is_ops(user)
            and has_perm(user, "cs.conversation.read")
        )

    @staticmethod
    def redact_sensitive(user):
        return SupportConversationAccessPolicy.is_ops(user)

    @staticmethod
    def scope_queryset(queryset, user):
        if (
            SupportConversationAccessPolicy.is_superadmin(user)
            or SupportConversationAccessPolicy.is_ops(user)
        ):
            return queryset
        if SupportConversationAccessPolicy.is_agent(user):
            return queryset.filter(
                admin__admin_group_memberships__status=1,
                admin__admin_group_memberships__group__members__user=user,
                admin__admin_group_memberships__group__members__status=1,
            ).distinct()
        return queryset.filter(user=user)

    @staticmethod
    def get_conversation(conversation_id, user):
        from .models import Conversation

        return SupportConversationAccessPolicy.scope_queryset(
            Conversation.objects.all(), user,
        ).filter(id=conversation_id).first()
