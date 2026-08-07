from django.db import models


class Favorite(models.Model):
    user = models.ForeignKey(
        'auth.User', on_delete=models.CASCADE, related_name='favorites',
        verbose_name='用户',
    )
    spu = models.ForeignKey(
        'goods.SPU', on_delete=models.CASCADE, related_name='favorites',
        verbose_name='商品',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='收藏时间')

    class Meta:
        db_table = 'lovegoods_favorite'
        verbose_name = '收藏'
        verbose_name_plural = verbose_name
        app_label = 'lovegoods'
        unique_together = [('user', 'spu')]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['spu']),
        ]

    def __str__(self):
        return f'{self.user.username} ♥ {self.spu.name}'
