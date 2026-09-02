from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """客服会话"""
    STATUS_CHOICES = [
        ('open', '进行中'),
        ('closed', '已关闭'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='cs_conversations', verbose_name='用户',
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='cs_assigned_conversations',
        verbose_name='处理客服',
    )
    group = models.ForeignKey(
        'goods.AdminGroup', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='cs_conversations',
        verbose_name='归属管理组',
    )
    subject = models.CharField(max_length=255, blank=True, default='', verbose_name='主题')
    spu = models.ForeignKey(
        'goods.SPU', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='cs_conversations',
        verbose_name='关联商品',
    )
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default='open', verbose_name='状态',
    )
    user_msg_count = models.PositiveIntegerField(default=0, verbose_name='用户消息计数')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    handled_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='handled_conversations',
        verbose_name='当前处理人',
    )
    handled_at = models.DateTimeField(null=True, blank=True, verbose_name='开始处理时间')

    class Meta:
        db_table = 'customer_service_conversation'
        verbose_name = '客服会话'
        verbose_name_plural = verbose_name
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['admin', 'status']),
            models.Index(fields=['group', 'status']),
            models.Index(fields=['spu', 'status'], name='customer_se_spu_st_8e2c1a_idx'),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.subject or "会话#" + str(self.id)}'

    @property
    def has_admin_reply(self):
        """检查是否有客服回复"""
        return self.messages.filter(sender_type='admin').exists()

    def reset_msg_count(self):
        """重置用户消息计数器"""
        if self.user_msg_count != 0:
            self.user_msg_count = 0
            self.save(update_fields=['user_msg_count'])

    def increment_msg_count(self):
        """用户消息计数+1"""
        self.user_msg_count += 1
        self.save(update_fields=['user_msg_count'])


class Message(models.Model):
    """客服消息"""
    SENDER_TYPE_CHOICES = [
        ('user', '用户'),
        ('admin', '客服'),
    ]

    MSG_TYPE_CHOICES = [
        ('text', '文字'),
        ('image', '图片'),
        ('video', '视频'),
        ('product_link', '商品链接'),
        ('cart_share', '购物车分享'),
        ('product_card', '商品卡片'),
        ('order_card', '订单卡片'),
    ]

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE,
        related_name='messages', verbose_name='对话',
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='cs_messages', verbose_name='发送者',
    )
    sender_type = models.CharField(
        max_length=8, choices=SENDER_TYPE_CHOICES, verbose_name='发送者类型',
    )
    content = models.TextField(blank=True, default='', verbose_name='文字内容')
    msg_type = models.CharField(
        max_length=16, choices=MSG_TYPE_CHOICES, default='text', verbose_name='消息类型',
    )
    file_url = models.CharField(max_length=500, blank=True, default='', verbose_name='文件URL')
    card_data = models.JSONField(
        default=dict, blank=True,
        verbose_name='卡片数据',
        help_text='商品卡片引用数据（仅存 spu_id + order_id，展示时从 SPU 实时查询）',
    )
    metadata = models.JSONField(default=dict, blank=True, verbose_name='附加数据')
    is_read = models.BooleanField(default=False, verbose_name='已读')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='发送时间')

    class Meta:
        db_table = 'customer_service_message'
        verbose_name = '客服消息'
        verbose_name_plural = verbose_name
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['conversation', 'is_read', 'sender_type']),
        ]

    def __str__(self):
        if self.msg_type == 'product_card':
            spu_id = self.card_data.get('spu_id', '') if self.card_data else ''
            return f'[{self.get_sender_type_display()}] 商品卡片: SPU#{spu_id}'
        return f'[{self.get_sender_type_display()}] {self.content[:50]}'
