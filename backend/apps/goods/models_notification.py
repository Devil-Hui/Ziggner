from django.db import models
from django.utils import timezone


# ==================== 管理后台通知 ====================

class AdminNotificationType(models.TextChoices):
    APPLICATION_SUBMITTED = 'application_submitted', 'Application Submitted'
    APPLICATION_APPROVED = 'application_approved', 'Application Approved'
    APPLICATION_REJECTED = 'application_rejected', 'Application Rejected'
    SPU_SUBMITTED = 'spu_submitted', 'SPU Submitted'
    SPU_APPROVED = 'spu_approved', 'SPU Approved'
    SPU_REJECTED = 'spu_rejected', 'SPU Rejected'
    LEADER_CHANGED = 'leader_changed', 'Leader Changed'
    BATCH_COMPLETED = 'batch_completed', 'Batch Completed'
    SCHEDULED_PUBLISHED = 'scheduled_published', 'Scheduled Published'
    STOCK_ALERT = 'stock_alert', 'Stock Alert'


class AdminNotification(models.Model):
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='admin_notifications',
        verbose_name='接收人',
    )
    type = models.CharField(
        max_length=30,
        choices=AdminNotificationType.choices,
        verbose_name='通知类型',
    )
    title = models.CharField(max_length=200, verbose_name='通知标题')
    content = models.TextField(blank=True, default='', verbose_name='通知内容')
    related_type = models.CharField(
        max_length=50, blank=True, default='',
        verbose_name='关联资源类型',
    )
    related_id = models.PositiveIntegerField(null=True, blank=True, verbose_name='关联资源 ID')
    is_read = models.BooleanField(default=False, verbose_name='已读')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    read_at = models.DateTimeField(null=True, blank=True, verbose_name='阅读时间')
    expires_at = models.DateTimeField(null=True, blank=True, verbose_name='过期时间')

    @property
    def is_expired(self):
        if self.expires_at is None:
            return False
        return timezone.now() >= self.expires_at

    class Meta:
        db_table = 'goods_admin_notification'
        verbose_name = '管理后台通知'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['type']),
        ]

    def __str__(self):
        return f'[{self.get_type_display()}] → {self.user.username}: {self.title}'