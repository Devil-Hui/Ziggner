from django.db import models
from django.conf import settings


class Conversation(models.Model):
    """客服对话会话"""
    STATUS_CHOICES = [
        ('open', '进行中'),
        ('closed', '已关闭'),
    ]

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='support_conversations', verbose_name='用户',
    )
    subject = models.CharField(max_length=255, blank=True, default='', verbose_name='主题')
    status = models.CharField(
        max_length=16, choices=STATUS_CHOICES, default='open', verbose_name='状态',
    )
    admin = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='assigned_conversations',
        verbose_name='处理客服',
    )
    # 关联商品（可选，用户咨询特定商品时附带）
    spu = models.ForeignKey(
        'goods.SPU', null=True, blank=True, on_delete=models.SET_NULL,
        related_name='support_conversations', verbose_name='关联商品',
    )
    # 关联购物车（JSON 存储购物车快照）
    cart_snapshot = models.JSONField(default=list, blank=True, verbose_name='购物车快照')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'support_conversation'
        verbose_name = '客服对话'
        verbose_name_plural = verbose_name
        ordering = ['-updated_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'{self.user.username} - {self.subject or "对话#" + str(self.id)}'


class Message(models.Model):
    """客服消息"""
    SENDER_CHOICES = [
        ('user', '用户'),
        ('admin', '客服'),
    ]

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE,
        related_name='messages', verbose_name='对话',
    )
    sender = models.CharField(
        max_length=8, choices=SENDER_CHOICES, verbose_name='发送者',
    )
    content = models.TextField(blank=True, default='', verbose_name='文字内容')
    # 附件（图片/视频 URL 列表）
    attachments = models.JSONField(default=list, blank=True, verbose_name='附件')
    # 商品链接快照
    product_snapshot = models.JSONField(null=True, blank=True, verbose_name='商品快照')
    # 是否为系统消息
    is_system = models.BooleanField(default=False, verbose_name='系统消息')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='发送时间')

    class Meta:
        db_table = 'support_message'
        verbose_name = '客服消息'
        verbose_name_plural = verbose_name
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
        ]

    def __str__(self):
        return f'[{self.get_sender_display()}] {self.content[:50]}'