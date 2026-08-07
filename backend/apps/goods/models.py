from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator, MaxLengthValidator
from django.db import models
from django.utils import timezone


# ==================== 品牌 ====================

class Brand(models.Model):
    name = models.CharField(
        max_length=100,
        validators=[MaxLengthValidator(100)],
        verbose_name='品牌名称',
    )
    logo_url = models.CharField(max_length=500, blank=True, default='', verbose_name='Logo 图片 URL')
    description = models.TextField(blank=True, default='', verbose_name='品牌描述')
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_brand'
        verbose_name = '品牌'
        verbose_name_plural = verbose_name
        indexes = [
            models.Index(fields=['name'], name='idx_brand_name'),
            models.Index(fields=['is_active'], name='idx_brand_is_active'),
        ]
        ordering = ['id']

    def __str__(self):
        return self.name


# ==================== 管理组 ====================

class AdminGroup(models.Model):
    name = models.CharField(max_length=100, unique=True, verbose_name='组名称')
    slug = models.SlugField(max_length=100, unique=True, verbose_name='标识符')
    description = models.TextField(default='', blank=True, verbose_name='描述')
    created_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_admin_groups',
        verbose_name='创建人',
    )
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_admin_group'
        verbose_name = '管理组'
        verbose_name_plural = verbose_name
        ordering = ['id']

    def __str__(self):
        return self.name


# ==================== 管理组成员 ====================

class AdminGroupMember(models.Model):
    class Role(models.TextChoices):
        LEADER = 'leader', 'Leader'
        MEMBER = 'member', 'Member'

    class Status(models.IntegerChoices):
        ACTIVE = 1, 'Active'
        AWAY = 2, 'Away'
        LEAVE = 3, 'Leave'

    group = models.ForeignKey(
        AdminGroup,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name='所属管理组',
    )
    user = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='admin_group_memberships',
        verbose_name='用户',
    )
    role = models.CharField(
        max_length=20,
        choices=Role.choices,
        default=Role.MEMBER,
        verbose_name='角色',
    )
    status = models.PositiveSmallIntegerField(
        choices=Status.choices,
        default=Status.ACTIVE,
        verbose_name='状态',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_admin_group_member'
        verbose_name = '管理组成员'
        verbose_name_plural = verbose_name
        unique_together = [('group', 'user')]
        ordering = ['group', 'id']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['group', 'role']),
        ]

    def __str__(self):
        return f'{self.user.username} → {self.group.name} [{self.get_role_display()}]'


# ==================== 三级分类 ====================

# ==================== Category ====================

class CategoryStatus(models.TextChoices):
    """分类审核状态（与 SPU 对齐）"""
    PENDING = 'pending', '待审核'
    APPROVED = 'approved', '已通过'
    REJECTED = 'rejected', '已驳回'


class Category(models.Model):
    name = models.CharField(
        max_length=100,
        validators=[MaxLengthValidator(100)],
        verbose_name='分类名称',
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name='children',
        verbose_name='上级分类',
    )
    level = models.PositiveSmallIntegerField(default=1, verbose_name='层级')
    admin_group = models.ForeignKey(
        AdminGroup,
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='managed_categories',
        verbose_name='归属管理组',
        help_text='二级分类绑定管理组，组内成员可管理该分类及其下级',
    )
    created_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_categories',
        verbose_name='创建人',
    )
    is_active = models.BooleanField(default=True, verbose_name='启用')
    status = models.CharField(
        max_length=20,
        choices=CategoryStatus.choices,
        default=CategoryStatus.APPROVED,
        verbose_name='审核状态',
        help_text='pending=待审核 / approved=已通过 / rejected=已驳回',
    )
    submitted_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='submitted_categories',
        verbose_name='提交人',
    )
    reviewed_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_categories',
        verbose_name='审核人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_category'
        verbose_name = '商品分类'
        verbose_name_plural = verbose_name
        ordering = ['level', 'id']
        indexes = [
            models.Index(fields=['parent', 'is_active']),
            models.Index(fields=['level', 'is_active']),
            models.Index(fields=['admin_group']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(level__gte=1, level__lte=3),
                name='category_level_range',
            ),
        ]

    def __str__(self):
        return f'{self.name}'

    @classmethod
    def get_all_subcategory_ids(cls, category_id: int) -> list:
        """获取某个分类及其所有子孙分类的 id 列表（用于商品过滤）"""
        ids = [category_id]
        children = cls.objects.filter(parent_id=category_id, is_active=True).values_list('id', flat=True)
        for child_id in children:
            ids.extend(cls.get_all_subcategory_ids(child_id))
        return ids

    def clean(self):
        super().clean()
        if self.parent is not None:
            self.level = self.parent.level + 1
            if self.level > 3:
                raise ValidationError({
                    'parent': 'Category depth cannot exceed 3 levels.',
                })
            ancestor = self.parent
            while ancestor is not None:
                if self.pk and ancestor.pk == self.pk:
                    raise ValidationError({
                        'parent': 'Cannot set parent to itself or its descendants.',
                    })
                ancestor = ancestor.parent
        else:
            self.level = 1

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)


# ==================== SPU ====================

class SPUStatus(models.TextChoices):
    DRAFT = 'draft', 'Draft'
    SUBMITTED = 'submitted', 'Submitted'
    APPROVED = 'approved', 'Approved'
    REJECTED = 'rejected', 'Rejected'
    ON_SALE = 'on_sale', 'On Sale'
    SUSPENDED = 'suspended', 'Suspended'
    OFF_SALE = 'off_sale', 'Off Sale'


class SPU(models.Model):
    name = models.CharField(
        max_length=200,
        validators=[MaxLengthValidator(200)],
        verbose_name='商品名称',
    )
    brand = models.ForeignKey(
        Brand,
        on_delete=models.PROTECT,
        related_name='spus',
        verbose_name='品牌',
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.PROTECT,
        related_name='spus',
        verbose_name='分类',
    )
    description = models.TextField(blank=True, default='', verbose_name='商品描述')
    main_image = models.CharField(max_length=500, blank=True, default='', verbose_name='主图 URL')

    # ── 规格定义（动态多规格） ──
    # 格式: [{"name": "颜色", "values": ["红色", "蓝色"]}, {"name": "尺寸", "values": ["S", "M", "L"]}]
    specs = models.JSONField(default=list, blank=True, verbose_name='规格定义')

    # ── 状态机 ──
    status = models.CharField(
        max_length=20,
        choices=SPUStatus.choices,
        default=SPUStatus.DRAFT,
        verbose_name='状态',
    )
    submitted_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='submitted_spus',
        verbose_name='提交人',
    )
    submitted_at = models.DateTimeField(null=True, blank=True, verbose_name='提交时间')
    reviewed_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_spus',
        verbose_name='审批人',
    )
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    review_comment = models.CharField(max_length=500, blank=True, default='', verbose_name='审批意见')

    # ── 定时上下架 ──
    scheduled_publish_at = models.DateTimeField(null=True, blank=True, verbose_name='定时上架时间')
    scheduled_unpublish_at = models.DateTimeField(null=True, blank=True, verbose_name='定时下架时间')

    # ── 软删除 ──
    deleted_at = models.DateTimeField(null=True, blank=True, verbose_name='删除时间')
    deleted_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='deleted_spus',
        verbose_name='删除人',
    )

    # ── Shopify 级商品参数 ──
    meta_title = models.CharField(max_length=120, blank=True, default='', verbose_name='SEO 标题')
    meta_description = models.TextField(max_length=320, blank=True, default='', verbose_name='SEO 描述')
    product_type = models.CharField(max_length=100, blank=True, default='', verbose_name='商品类型')
    tags = models.JSONField(default=list, blank=True, verbose_name='标签列表')
    requires_shipping = models.BooleanField(default=True, verbose_name='需要物流')
    taxable = models.BooleanField(default=True, verbose_name='需计税')
    # ── 实体/虚拟商品开关 ──
    product_kind = models.CharField(
        max_length=10,
        choices=(('physical', '实体商品'), ('virtual', '虚拟商品')),
        default='physical',
        verbose_name='商品类型',
        help_text='physical=实体商品（需图片/物流）/ virtual=虚拟商品（隐藏图片区）',
    )

    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_spu'
        verbose_name = '商品 SPU'
        verbose_name_plural = verbose_name
        ordering = ['-id']
        indexes = [
            models.Index(fields=['brand', 'status']),
            models.Index(fields=['category', 'status']),
            models.Index(fields=['status']),
            models.Index(fields=['deleted_at']),
        ]

    def __str__(self):
        return f'{self.name} [{self.get_status_display()}]'

    @property
    def is_active(self):
        return self.status == SPUStatus.ON_SALE

    @property
    def category_path(self):
        """返回完整分类路径，如 'Agent / agent / agent_test'"""
        if not self.category:
            return ''
        parts = []
        cat = self.category
        while cat:
            parts.insert(0, cat.name)
            cat = cat.parent
        return ' / '.join(parts)

    # ── 状态机方法 ──

    def submit_for_review(self, user):
        if self.status not in (SPUStatus.DRAFT, SPUStatus.REJECTED, SPUStatus.OFF_SALE):
            raise ValueError(
                f'Cannot submit for review from status "{self.get_status_display()}". '
                f'Only Draft or Rejected SPUs can be submitted.'
            )
        self.status = SPUStatus.SUBMITTED
        self.submitted_by = user
        self.submitted_at = timezone.now()
        self.save(update_fields=['status', 'submitted_by', 'submitted_at'])

    def approve(self, user, comment=''):
        if self.status != SPUStatus.SUBMITTED:
            raise ValueError(
                f'Cannot approve from status "{self.get_status_display()}". '
                f'Only Submitted SPUs can be approved.'
            )
        self.status = SPUStatus.APPROVED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.review_comment = comment
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_comment'])

    def reject(self, user, comment=''):
        if self.status != SPUStatus.SUBMITTED:
            raise ValueError(
                f'Cannot reject from status "{self.get_status_display()}". '
                f'Only Submitted SPUs can be rejected.'
            )
        self.status = SPUStatus.REJECTED
        self.reviewed_by = user
        self.reviewed_at = timezone.now()
        self.review_comment = comment
        self.save(update_fields=['status', 'reviewed_by', 'reviewed_at', 'review_comment'])

    def put_on_sale(self):
        if self.status != SPUStatus.APPROVED:
            raise ValueError(
                f'Cannot put on sale from status "{self.get_status_display()}". '
                f'Only Approved SPUs can be put on sale.'
            )
        self.status = SPUStatus.ON_SALE
        self.save(update_fields=['status'])

    def put_off_sale(self):
        if self.status not in (SPUStatus.ON_SALE, SPUStatus.SUSPENDED):
            raise ValueError(
                f'Cannot put off sale from status "{self.get_status_display()}". '
                f'Only On Sale or Suspended SPUs can be put off sale.'
            )
        self.status = SPUStatus.OFF_SALE
        self.save(update_fields=['status'])

    def suspend(self):
        """挂起：暂时隐藏已上架商品（不下架，可恢复）"""
        if self.status != SPUStatus.ON_SALE:
            raise ValueError(
                f'Cannot suspend from status "{self.get_status_display()}". '
                f'Only On Sale SPUs can be suspended.'
            )
        self.status = SPUStatus.SUSPENDED
        self.save(update_fields=['status'])

    def resume(self):
        """恢复挂起：将挂起商品恢复上架"""
        if self.status != SPUStatus.SUSPENDED:
            raise ValueError(
                f'Cannot resume from status "{self.get_status_display()}". '
                f'Only Suspended SPUs can be resumed.'
            )
        self.status = SPUStatus.ON_SALE
        self.save(update_fields=['status'])

    def soft_delete(self, user):
        self.deleted_at = timezone.now()
        self.deleted_by = user
        self.save(update_fields=['deleted_at', 'deleted_by'])

    def restore(self):
        self.deleted_at = None
        self.deleted_by = None
        self.save(update_fields=['deleted_at', 'deleted_by'])

    def schedule_publish(self, scheduled_at):
        self.scheduled_publish_at = scheduled_at
        self.save(update_fields=['scheduled_publish_at'])

    def schedule_unpublish(self, scheduled_at):
        self.scheduled_unpublish_at = scheduled_at
        self.save(update_fields=['scheduled_unpublish_at'])


# ==================== ProductMedia ====================

class ProductMedia(models.Model):
    class MediaType(models.TextChoices):
        IMAGE = 'image', 'Image'
        VIDEO = 'video', 'Video'

    class MediaStatus(models.TextChoices):
        PENDING = 'pending', 'Pending'
        ACTIVE = 'active', 'Active'
        REJECTED = 'rejected', 'Rejected'

    spu = models.ForeignKey(
        SPU, null=True, blank=True,
        on_delete=models.CASCADE, related_name='media',
        verbose_name='所属 SPU',
    )
    media_type = models.CharField(
        max_length=10, choices=MediaType.choices, verbose_name='媒体类型',
    )
    # 图片: 4 尺寸
    thumb_url = models.CharField(max_length=500, blank=True, default='', verbose_name='缩略图 URL (200x200)')
    list_url = models.CharField(max_length=500, blank=True, default='', verbose_name='列表图 URL (400x400)')
    large_url = models.CharField(max_length=500, blank=True, default='', verbose_name='大图 URL (800x800)')
    original_url = models.CharField(max_length=500, blank=True, default='', verbose_name='原图 URL (≤2048)')
    # 视频: 原视频 + 3 头帧
    video_url = models.CharField(max_length=500, blank=True, default='', verbose_name='视频 URL')
    video_thumb_url = models.CharField(max_length=500, blank=True, default='', verbose_name='视频头帧缩略图 (200x200)')
    video_list_url = models.CharField(max_length=500, blank=True, default='', verbose_name='视频头帧列表图 (400x400)')
    video_large_url = models.CharField(max_length=500, blank=True, default='', verbose_name='视频头帧大图 (800x800)')
    # 排序与状态
    sort_order = models.PositiveIntegerField(default=0, verbose_name='排序')
    status = models.CharField(
        max_length=20, choices=MediaStatus.choices,
        default=MediaStatus.PENDING, verbose_name='状态',
    )
    redis_key = models.CharField(max_length=64, blank=True, default='', verbose_name='Redis 暂存 Key')
    file_size = models.PositiveIntegerField(default=0, verbose_name='文件大小 (bytes)')
    alt_text = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='Alt 替代文本',
        help_text='图片无障碍描述文本，用于 SEO 和屏幕阅读器',
    )
    submitted_by = models.ForeignKey(
        'auth.User', null=True, on_delete=models.SET_NULL, related_name='submitted_media',
        verbose_name='提交人',
    )
    reviewed_by = models.ForeignKey(
        'auth.User', null=True, on_delete=models.SET_NULL, related_name='reviewed_media',
        verbose_name='审核人',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_product_media'
        verbose_name = '商品媒体'
        verbose_name_plural = verbose_name
        ordering = ['spu', 'sort_order', 'id']
        indexes = [
            models.Index(fields=['spu', 'media_type', 'status']),
            models.Index(fields=['spu', 'sort_order']),
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f'[{self.media_type}] SPU#{self.spu_id} sort={self.sort_order} [{self.status}]'


# ==================== SKU ====================

class ShelfStatus(models.TextChoices):
    ON = 'on', 'On'
    OFF = 'off', 'Off'


class SKU(models.Model):
    spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name='skus',
        verbose_name='SPU',
    )
    spec_values = models.JSONField(default=dict, verbose_name='规格值（JSON）')
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        verbose_name='售价（元）',
    )
    discount_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        validators=[MinValueValidator(0)],
        verbose_name='折扣价（元）',
    )
    stock = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='库存数量',
    )
    track_inventory = models.BooleanField(default=True, verbose_name='跟踪库存')
    image_url = models.CharField(
        max_length=500, blank=True, default='',
        verbose_name='SKU 图片 URL',
    )
    # ── Shopify 级 SKU 参数 ──
    barcode = models.CharField(max_length=128, blank=True, default='', verbose_name='条形码 (UPC/EAN/ISBN)')
    weight = models.DecimalField(max_digits=8, decimal_places=2, default=0.00, verbose_name='重量 (克)')
    cost_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(0)], verbose_name='成本价')

    shelf_status = models.CharField(
        max_length=10,
        choices=ShelfStatus.choices,
        default=ShelfStatus.ON,
        verbose_name='上下架状态',
    )
    alert_threshold = models.PositiveIntegerField(
        default=0,
        validators=[MinValueValidator(0)],
        verbose_name='库存预警阈值',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')
    sales = models.PositiveIntegerField(default=0, verbose_name='销量')
    version = models.PositiveIntegerField(default=0, verbose_name='乐观锁版本号')
    sku_code = models.CharField(
        max_length=64, blank=True, default='',
        verbose_name='SKU编码',
    )

    class Meta:
        db_table = 'goods_sku'
        verbose_name = '商品 SKU'
        verbose_name_plural = verbose_name
        ordering = ['spu', 'id']
        indexes = [
            models.Index(fields=['spu', 'shelf_status']),
            models.Index(fields=['spu', 'stock']),
        ]

    def __str__(self):
        return f'{self.spu.name} [{self.spec_values}]'

    @property
    def is_active(self):
        return self.shelf_status == 'on' and self.spu.is_active and self.stock > 0


# ==================== 标签 ====================

class Tag(models.Model):
    name = models.CharField(max_length=50, unique=True, verbose_name='标签名称')
    color = models.CharField(
        max_length=7, default='#e74c3c', verbose_name='标签颜色',
        help_text='HEX 色值，如 #e74c3c',
    )
    is_active = models.BooleanField(default=True, verbose_name='启用')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_tag'
        verbose_name = '商品标签'
        verbose_name_plural = verbose_name
        ordering = ['id']
        indexes = [
            models.Index(fields=['name'], name='idx_tag_name'),
            models.Index(fields=['is_active'], name='idx_tag_is_active'),
        ]

    def __str__(self):
        return self.name


# ==================== SPU 标签关联 ====================

class SPUTagRelation(models.Model):
    spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name='tag_relations',
        verbose_name='SPU',
    )
    tag = models.ForeignKey(
        Tag,
        on_delete=models.CASCADE,
        related_name='spu_relations',
        verbose_name='标签',
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_spu_tag_relation'
        verbose_name = 'SPU 标签关联'
        verbose_name_plural = verbose_name
        unique_together = [('spu', 'tag')]
        indexes = [
            models.Index(fields=['spu']),
            models.Index(fields=['tag']),
        ]

    def __str__(self):
        return f'{self.spu.name} → {self.tag.name}'


# ==================== 审计日志 ====================

class GoodsAuditLog(models.Model):
    user = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='goods_audit_logs',
        verbose_name='操作人',
    )
    action = models.CharField(max_length=50, verbose_name='操作类型')
    resource_type = models.CharField(max_length=50, verbose_name='资源类型')
    resource_id = models.PositiveIntegerField(verbose_name='资源 ID')
    changes = models.JSONField(default=dict, verbose_name='变更内容')
    extra_data = models.JSONField(default=dict, verbose_name='附加数据')
    ip_address = models.GenericIPAddressField(null=True, blank=True, verbose_name='IP 地址')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_audit_log'
        verbose_name = '审计日志'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['resource_type', 'resource_id']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f'[{self.action}] {self.resource_type}#{self.resource_id} by {self.user}'


# ==================== 价格历史 ====================

class PriceHistory(models.Model):
    sku = models.ForeignKey(
        SKU,
        on_delete=models.CASCADE,
        related_name='price_histories',
        verbose_name='SKU',
    )
    old_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='旧价格')
    new_price = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='新价格')
    changed_by = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='price_changes',
        verbose_name='变更人',
    )
    changed_at = models.DateTimeField(auto_now_add=True, verbose_name='变更时间')
    reason = models.CharField(max_length=200, blank=True, default='', verbose_name='变更原因')

    class Meta:
        db_table = 'goods_price_history'
        verbose_name = '价格历史'
        verbose_name_plural = verbose_name
        ordering = ['-changed_at']
        indexes = [
            models.Index(fields=['sku', '-changed_at']),
        ]

    def __str__(self):
        return f'{self.sku} ¥{self.old_price} → ¥{self.new_price}'


# ==================== 操作日志 ====================

class ProductOperationLog(models.Model):
    spu = models.ForeignKey(
        SPU,
        on_delete=models.CASCADE,
        related_name='operation_logs',
        verbose_name='SPU',
    )
    user = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='product_operations',
        verbose_name='操作人',
    )
    action = models.CharField(max_length=50, verbose_name='操作类型')
    field_name = models.CharField(max_length=100, blank=True, default='', verbose_name='字段名')
    old_value = models.TextField(blank=True, default='', verbose_name='旧值')
    new_value = models.TextField(blank=True, default='', verbose_name='新值')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_operation_log'
        verbose_name = '商品操作日志'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['spu', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['action']),
        ]

    def __str__(self):
        return f'[{self.action}] SPU#{self.spu_id} {self.field_name} by {self.user}'


# ==================== 规格模型 ====================

class SpecName(models.Model):
    """规格名称（如：颜色、尺寸）"""
    name = models.CharField(max_length=64, unique=True, verbose_name='规格名称')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')
    updated_at = models.DateTimeField(default=timezone.now, verbose_name='更新时间')

    class Meta:
        db_table = 'goods_spec_name'
        verbose_name = '规格名称'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class SpecValue(models.Model):
    """规格值（如：红色、XL）"""
    spec_name = models.ForeignKey(SpecName, on_delete=models.CASCADE, related_name='values', verbose_name='规格名称')
    value = models.CharField(max_length=128, verbose_name='规格值')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_spec_value'
        verbose_name = '规格值'
        verbose_name_plural = verbose_name
        unique_together = [('spec_name', 'value')]

    def __str__(self):
        return f'{self.spec_name.name}: {self.value}'


class SPUSpec(models.Model):
    """SPU 关联的规格名称"""
    spu = models.ForeignKey(SPU, on_delete=models.CASCADE, related_name='spu_specs', verbose_name='SPU')
    spec_name = models.ForeignKey(SpecName, on_delete=models.CASCADE, verbose_name='规格名称')

    class Meta:
        db_table = 'goods_spu_spec'
        verbose_name = 'SPU 规格'
        verbose_name_plural = verbose_name
        unique_together = [('spu', 'spec_name')]

    def __str__(self):
        return f'{self.spu.name} - {self.spec_name.name}'


class SPUSpecValue(models.Model):
    """SPU 规格的可选值"""
    spu_spec = models.ForeignKey(SPUSpec, on_delete=models.CASCADE, related_name='spec_values', verbose_name='SPU规格')
    spec_value = models.ForeignKey(SpecValue, on_delete=models.CASCADE, verbose_name='规格值')

    class Meta:
        db_table = 'goods_spu_spec_value'
        verbose_name = 'SPU 规格值'
        verbose_name_plural = verbose_name
        unique_together = [('spu_spec', 'spec_value')]

    def __str__(self):
        return f'{self.spu_spec} = {self.spec_value.value}'


class SKUSpecValue(models.Model):
    """SKU 选中的规格值"""
    sku = models.ForeignKey(SKU, on_delete=models.CASCADE, related_name='sku_spec_values', verbose_name='SKU')
    spec_value = models.ForeignKey(SpecValue, on_delete=models.CASCADE, verbose_name='规格值')
    spec_name = models.ForeignKey(SpecName, on_delete=models.CASCADE, verbose_name='规格名称')

    class Meta:
        db_table = 'goods_sku_spec_value'
        verbose_name = 'SKU 规格值'
        verbose_name_plural = verbose_name
        unique_together = [('sku', 'spec_value')]

    def __str__(self):
        return f'{self.sku} - {self.spec_name.name}: {self.spec_value.value}'


class Attribute(models.Model):
    """属性定义（如：材质、产地）"""
    name = models.CharField(max_length=64, unique=True, verbose_name='属性名称')
    created_at = models.DateTimeField(default=timezone.now, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_attribute'
        verbose_name = '属性'
        verbose_name_plural = verbose_name

    def __str__(self):
        return self.name


class AttributeValue(models.Model):
    """属性值"""
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, related_name='values', verbose_name='属性')
    value = models.CharField(max_length=256, verbose_name='属性值')

    class Meta:
        db_table = 'goods_attribute_value'
        verbose_name = '属性值'
        verbose_name_plural = verbose_name
        unique_together = [('attribute', 'value')]

    def __str__(self):
        return f'{self.attribute.name}: {self.value}'


class SPUAttribute(models.Model):
    """SPU 关联的属性"""
    spu = models.ForeignKey(SPU, on_delete=models.CASCADE, related_name='spu_attributes', verbose_name='SPU')
    attribute = models.ForeignKey(Attribute, on_delete=models.CASCADE, verbose_name='属性')
    attribute_value = models.ForeignKey(AttributeValue, on_delete=models.CASCADE, verbose_name='属性值')

    class Meta:
        db_table = 'goods_spu_attribute'
        verbose_name = 'SPU 属性'
        verbose_name_plural = verbose_name
        unique_together = [('spu', 'attribute')]

    def __str__(self):
        return f'{self.spu.name} - {self.attribute.name}: {self.attribute_value.value}'
