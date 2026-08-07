"""
用户行为追踪模型 — 浏览历史、商品查看记录。
"""
from django.db import models


class BrowseHistory(models.Model):
    """用户浏览商品历史记录。

    对同一商品重复浏览仅更新 viewed_at 时间戳（upsert 语义），
    避免产生大量重复记录。
    """
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='browse_history',
        verbose_name='用户',
    )
    spu = models.ForeignKey(
        'goods.SPU',
        on_delete=models.CASCADE,
        related_name='browse_history',
        verbose_name='浏览商品',
    )
    viewed_at = models.DateTimeField(auto_now=True, verbose_name='最近浏览时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='首次浏览时间')

    class Meta:
        db_table = 'tracking_browse_history'
        verbose_name = '浏览历史'
        verbose_name_plural = verbose_name
        app_label = 'tracking'
        unique_together = [('user', 'spu')]
        ordering = ['-viewed_at']
        indexes = [
            models.Index(fields=['user', '-viewed_at'], name='idx_browse_user_viewed'),
            models.Index(fields=['spu'], name='idx_browse_spu'),
        ]

    def __str__(self):
        return f'{self.user.username} viewed {self.spu.name} @ {self.viewed_at}'
