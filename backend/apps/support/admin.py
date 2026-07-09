from django.contrib import admin
from django.utils.html import format_html
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    fields = ('sender', 'content', 'attachments', 'product_snapshot', 'created_at')
    readonly_fields = ('sender', 'content', 'attachments', 'product_snapshot', 'created_at')
    extra = 0
    can_delete = False
    ordering = ('created_at',)


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_info', 'subject', 'status', 'spu_link', 'admin', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'subject')
    readonly_fields = ('user', 'created_at', 'updated_at')
    inlines = [MessageInline]
    actions = ['close_conversations']

    def user_info(self, obj):
        return f'{obj.user.username} ({obj.user.email})'
    user_info.short_description = '用户'

    def spu_link(self, obj):
        if obj.spu:
            return format_html('<a href="/admin/goods/spu/{}/change/">{}</a>', obj.spu.id, obj.spu.name)
        return '-'
    spu_link.short_description = '关联商品'

    def close_conversations(self, request, queryset):
        for conv in queryset:
            conv.status = 'closed'
            conv.save(update_fields=['status'])
            Message.objects.create(
                conversation=conv,
                sender='admin',
                content='客服已关闭此对话。',
                is_system=True,
            )
        self.message_user(request, f'已关闭 {queryset.count()} 个对话')
    close_conversations.short_description = '关闭选中的对话'