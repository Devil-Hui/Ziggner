from django.contrib import admin
from .models import Conversation, Message


class MessageInline(admin.TabularInline):
    model = Message
    fields = ('sender', 'sender_type', 'msg_type', 'content', 'card_data_preview',
              'file_url', 'is_read', 'created_at')
    readonly_fields = ('sender', 'sender_type', 'msg_type', 'content',
                       'card_data_preview', 'file_url', 'is_read', 'created_at')
    extra = 0
    can_delete = False
    ordering = ('created_at',)

    @admin.display(description='卡片数据')
    def card_data_preview(self, obj):
        if obj.card_data:
            name = obj.card_data.get('product_name', '')
            price = obj.card_data.get('price', '')
            return f'{name} (${price})' if name else str(obj.card_data)[:80]
        return '-'


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user_info', 'subject', 'status', 'user_msg_count', 'admin', 'updated_at')
    list_filter = ('status', 'created_at')
    search_fields = ('user__username', 'user__email', 'subject')
    readonly_fields = ('user', 'user_msg_count', 'created_at', 'updated_at')
    inlines = [MessageInline]
    actions = ['close_conversations']

    def user_info(self, obj):
        return f'{obj.user.username} ({obj.user.email})'
    user_info.short_description = '用户'

    def close_conversations(self, request, queryset):
        count = 0
        for conv in queryset.filter(status='open'):
            conv.status = 'closed'
            conv.save(update_fields=['status'])
            Message.objects.create(
                conversation=conv,
                sender=request.user,
                sender_type='admin',
                content='客服已关闭此对话。',
                msg_type='text',
            )
            count += 1
        self.message_user(request, f'已关闭 {count} 个对话')
    close_conversations.short_description = '关闭选中的会话'


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'conversation_id', 'sender', 'sender_type',
                    'msg_type', 'content_preview', 'card_data_preview',
                    'is_read', 'created_at')
    list_filter = ('sender_type', 'msg_type', 'is_read', 'created_at')
    search_fields = ('content', 'sender__username')
    readonly_fields = ('conversation', 'sender', 'sender_type', 'created_at')

    def content_preview(self, obj):
        if obj.msg_type == 'product_card':
            return f'[商品卡片]'
        return obj.content[:80]
    content_preview.short_description = '内容预览'

    @admin.display(description='卡片数据')
    def card_data_preview(self, obj):
        if obj.card_data:
            name = obj.card_data.get('product_name', '')
            price = obj.card_data.get('price', '')
            return f'{name} (${price})' if name else str(obj.card_data)[:80]
        return '-'
