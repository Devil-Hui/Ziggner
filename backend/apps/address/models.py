from django.db import models, transaction


class Address(models.Model):
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='addresses',
        verbose_name='用户',
    )
    name = models.CharField(max_length=50, verbose_name='收货人')
    phone = models.CharField(max_length=20, verbose_name='联系电话')
    country = models.CharField(max_length=100, default='China', verbose_name='国家')
    region = models.CharField(max_length=100, verbose_name='州/省')
    city = models.CharField(max_length=100, verbose_name='城市')
    address_line = models.CharField(max_length=300, verbose_name='详细地址')
    postal_code = models.CharField(max_length=20, blank=True, default='', verbose_name='邮编')
    is_default = models.BooleanField(default=False, verbose_name='默认地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'address_address'
        verbose_name = '收货地址'
        verbose_name_plural = verbose_name
        app_label = 'address'
        ordering = ['-is_default', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_default']),
        ]

    def __str__(self):
        return f'{self.name} {self.phone} — {self.country}, {self.region}, {self.city}, {self.address_line}'

    @transaction.atomic
    def set_default(self):
        Address.objects.filter(user=self.user, is_default=True).update(is_default=False)
        self.is_default = True
        self.save(update_fields=['is_default'])
