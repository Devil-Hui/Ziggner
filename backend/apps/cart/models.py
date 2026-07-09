from django.db import models


class Cart(models.Model):
    user = models.OneToOneField(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='cart',
        verbose_name='用户',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'cart_cart'
        verbose_name = '购物车'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['user'], name='idx_cart_user'),
        ]

    def __str__(self):
        return f'Cart of {self.user.username}'


class CartItem(models.Model):
    cart = models.ForeignKey(
        Cart,
        on_delete=models.CASCADE,
        related_name='items',
        verbose_name='购物车',
    )
    sku = models.ForeignKey(
        'goods.SKU',
        on_delete=models.PROTECT,
        related_name='cart_items',
        verbose_name='SKU',
    )
    quantity = models.PositiveIntegerField(default=1, verbose_name='数量')
    selected = models.BooleanField(default=True, verbose_name='勾选')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'cart_cart_item'
        verbose_name = '购物车项'
        verbose_name_plural = verbose_name
        unique_together = [('cart', 'sku')]
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['cart'], name='idx_cartitem_cart'),
            models.Index(fields=['sku'], name='idx_cartitem_sku'),
            models.Index(fields=['selected'], name='idx_cartitem_selected'),
        ]

    def __str__(self):
        return f'{self.sku.spu.name} x {self.quantity}'
