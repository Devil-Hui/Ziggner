from django.db import models
from django.utils import timezone


class Notification(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='notifications',
        verbose_name='用户',
    )
    type = models.CharField(max_length=50, verbose_name='通知类型')
    title = models.CharField(max_length=200, verbose_name='标题')
    content = models.TextField(default='', verbose_name='内容')
    is_read = models.BooleanField(default=False, verbose_name='已读')
    related_order_no = models.CharField(max_length=20, blank=True, default='',
                                        verbose_name='关联订单号')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='过期时间')

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() >= self.expires_at

    class Meta:
        db_table = 'notification_notification'
        verbose_name = '消息通知'
        verbose_name_plural = verbose_name
        app_label = 'notification'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return f'[{self.type}] {self.title}'


class OperationLogCategory(models.TextChoices):
    SYSTEM = 'system', '系统'
    OPERATION = 'operation', '操作'
    NOTIFICATION = 'notification', '通知'
    SECURITY = 'security', '安全'
    ERROR = 'error', '错误'


class OperationLog(models.Model):
    user = models.ForeignKey(
        'auth.User', null=True, blank=True,
        on_delete=models.SET_NULL, verbose_name='操作用户',
    )
    category = models.CharField(
        max_length=20, choices=OperationLogCategory.choices,
        verbose_name='日志分类',
    )
    action = models.CharField(max_length=100, verbose_name='操作动作')
    resource_type = models.CharField(max_length=50, verbose_name='资源类型')
    resource_id = models.CharField(max_length=50, blank=True, default='', verbose_name='资源 ID')
    detail = models.JSONField(default=dict, blank=True, verbose_name='详情')
    ip_address = models.GenericIPAddressField(blank=True, null=True, verbose_name='IP 地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'notification_operation_log'
        verbose_name = '操作日志'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']

    def __str__(self):
        return f'[{self.get_category_display()}] {self.action}'
