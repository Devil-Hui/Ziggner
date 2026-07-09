from django.db import models


class Term(models.Model):
    """用户条款与协议"""
    TERM_TYPE_CHOICES = [
        ('terms', '用户协议'),
        ('privacy', '隐私政策'),
        ('refund', '退款政策'),
        ('shipping', '配送说明'),
        ('cookies', 'Cookie 政策'),
        ('other', '其他'),
    ]

    title = models.CharField(max_length=200, verbose_name='标题')
    type = models.CharField(max_length=20, choices=TERM_TYPE_CHOICES, default='terms', verbose_name='类型', db_index=True)
    content = models.TextField(verbose_name='内容')
    version = models.CharField(max_length=20, verbose_name='版本号', help_text='如 1.0, 2.1')
    is_active = models.BooleanField(default=True, verbose_name='是否生效', help_text='只显示最新的一条生效条款')
    effective_date = models.DateTimeField(verbose_name='生效日期')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'terms_term'
        verbose_name = '用户条款'
        verbose_name_plural = '用户条款'
        app_label = 'terms'
        ordering = ['-effective_date']
        indexes = [
            models.Index(fields=['type', 'is_active']),
        ]

    def __str__(self):
        return f'[{self.get_type_display()}] {self.title} v{self.version}'
