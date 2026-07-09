from django.db import models


# ==================== 分类改名申请 ====================

class CategoryRenameApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    category = models.ForeignKey(
        'goods.Category',
        on_delete=models.PROTECT,
        related_name='rename_applications',
        verbose_name='目标分类',
    )

    # ── 改名核心字段 ──
    new_name = models.CharField(max_length=100, verbose_name='新名称')
    alternative_names = models.CharField(
        max_length=500, blank=True, default='',
        verbose_name='备选名称（多个用逗号分隔）',
    )

    # ── 提交时快照字段（审批时参考，即使分类数据已变更也不影响） ──
    old_name = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name='原名称（提交时快照）',
    )
    category_level = models.PositiveSmallIntegerField(
        default=1, verbose_name='分类层级（提交时快照）',
    )
    parent_category_id = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='上级分类ID（提交时快照）',
    )
    parent_category_name = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name='上级分类名称（提交时快照）',
    )
    category_description = models.TextField(
        blank=True, default='',
        verbose_name='分类描述（提交时快照）',
    )
    category_path = models.CharField(
        max_length=500, blank=True, default='',
        verbose_name='完整分类路径（提交时快照）',
    )
    impact_spu_count = models.PositiveIntegerField(
        default=0, verbose_name='影响SPU数量',
    )
    impact_child_category_count = models.PositiveIntegerField(
        default=0, verbose_name='影响子分类数量',
    )
    reason = models.TextField(blank=True, default='', verbose_name='申请理由')

    # ── 审批字段 ──
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='状态',
    )
    applicant = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='category_rename_applications',
        verbose_name='申请人',
    )
    reviewer = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_category_rename_applications',
        verbose_name='审批人',
    )
    review_comment = models.TextField(blank=True, default='', verbose_name='审批意见')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_category_rename_app'
        verbose_name = '分类改名申请'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applicant', '-created_at']),
        ]

    def __str__(self):
        return f'分类改名: {self.old_name or self.category.name} → {self.new_name} [{self.get_status_display()}]'


# ==================== 品牌改名申请 ====================

class BrandRenameApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    brand = models.ForeignKey(
        'goods.Brand',
        on_delete=models.PROTECT,
        related_name='rename_applications',
        verbose_name='目标品牌',
    )

    # ── 改名核心字段 ──
    new_name = models.CharField(max_length=100, verbose_name='新名称')
    alternative_names = models.CharField(
        max_length=500, blank=True, default='',
        verbose_name='备选名称（多个用逗号分隔）',
    )

    # ── 提交时快照字段（审批时参考，即使品牌数据已变更也不影响） ──
    old_name = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name='原名称（提交时快照）',
    )
    brand_logo_url = models.CharField(
        max_length=500, blank=True, default='',
        verbose_name='品牌Logo URL（提交时快照）',
    )
    brand_description = models.TextField(
        blank=True, default='',
        verbose_name='品牌描述（提交时快照）',
    )
    brand_is_active = models.BooleanField(
        default=True, verbose_name='品牌启用状态（提交时快照）',
    )
    impact_spu_count = models.PositiveIntegerField(
        default=0, verbose_name='影响SPU数量',
    )
    reason = models.TextField(blank=True, default='', verbose_name='申请理由')

    # ── 审批字段 ──
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='状态',
    )
    applicant = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='brand_rename_applications',
        verbose_name='申请人',
    )
    reviewer = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_brand_rename_applications',
        verbose_name='审批人',
    )
    review_comment = models.TextField(blank=True, default='', verbose_name='审批意见')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_brand_rename_app'
        verbose_name = '品牌改名申请'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applicant', '-created_at']),
        ]

    def __str__(self):
        return f'品牌改名: {self.old_name or self.brand.name} → {self.new_name} [{self.get_status_display()}]'


# ==================== 组长变更申请 ====================

class LeaderChangeApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    class ChangeType(models.TextChoices):
        PROMOTION = 'promotion', '晋升'
        TRANSFER = 'transfer', '平调'
        REPLACEMENT = 'replacement', '替换'
        DEPARTURE = 'departure', '离职交接'

    group = models.ForeignKey(
        'goods.AdminGroup',
        on_delete=models.PROTECT,
        related_name='leader_change_applications',
        verbose_name='目标管理组',
    )
    new_leader = models.ForeignKey(
        'auth.User',
        on_delete=models.PROTECT,
        related_name='leader_change_applications',
        verbose_name='新组长',
    )
    change_type = models.CharField(
        max_length=20,
        choices=ChangeType.choices,
        default=ChangeType.REPLACEMENT,
        verbose_name='变更类型',
    )

    # ── 提交时快照字段（审批时参考，即使分组数据已变更也不影响） ──
    old_leader_id = models.PositiveIntegerField(
        null=True, blank=True, verbose_name='原组长ID（提交时快照）',
    )
    old_leader_name = models.CharField(
        max_length=150, blank=True, default='',
        verbose_name='原组长用户名（提交时快照）',
    )
    group_name_snapshot = models.CharField(
        max_length=100, blank=True, default='',
        verbose_name='分组名称（提交时快照）',
    )
    group_description = models.TextField(
        blank=True, default='',
        verbose_name='分组描述（提交时快照）',
    )
    group_member_count = models.PositiveIntegerField(
        default=0, verbose_name='分组成员数（提交时快照）',
    )
    group_category_count = models.PositiveIntegerField(
        default=0, verbose_name='分管分类数（提交时快照）',
    )
    effective_date = models.DateTimeField(
        null=True, blank=True,
        verbose_name='生效日期',
    )
    handover_plan = models.TextField(
        blank=True, default='',
        verbose_name='交接计划',
    )
    reason = models.TextField(blank=True, default='', verbose_name='申请理由')

    # ── 审批字段 ──
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='状态',
    )
    applicant = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='submitted_leader_change_applications',
        verbose_name='申请人',
    )
    reviewer = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_leader_change_applications',
        verbose_name='审批人',
    )
    review_comment = models.TextField(blank=True, default='', verbose_name='审批意见')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_leader_change_app'
        verbose_name = '组长变更申请'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applicant', '-created_at']),
        ]

    def __str__(self):
        return f'组长变更: {self.group_name_snapshot or self.group.name} → {self.new_leader.username} [{self.get_status_display()}]'


# ==================== 优惠券申请 ====================

class CouponApplication(models.Model):
    class Status(models.TextChoices):
        PENDING = 'pending', 'Pending'
        APPROVED = 'approved', 'Approved'
        REJECTED = 'rejected', 'Rejected'

    class DiscountType(models.TextChoices):
        FIXED = 'fixed', 'Fixed Amount'
        PERCENT = 'percent', 'Percentage Off'

    coupon_name = models.CharField(
        max_length=100, default='',
        verbose_name='优惠券名称',
    )
    discount_type = models.CharField(
        max_length=20,
        choices=DiscountType.choices,
        verbose_name='优惠类型',
    )
    coupon_code = models.CharField(
        max_length=50,
        default='',
        blank=True,
        verbose_name='优惠券码',
    )
    amount = models.DecimalField(max_digits=10, decimal_places=2, verbose_name='优惠值')
    min_amount = models.DecimalField(
        max_digits=10, decimal_places=2, default=0, verbose_name='最低消费门槛',
    )
    max_discount = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        verbose_name='最高折扣上限',
    )
    stackable = models.BooleanField(default=False, verbose_name='可叠加')
    total_count = models.PositiveIntegerField(default=1000, verbose_name='发行总量')
    per_user_limit = models.PositiveIntegerField(
        default=1, verbose_name='每人限领',
    )
    start_time = models.DateTimeField(null=True, blank=True, verbose_name='生效时间')
    end_time = models.DateTimeField(null=True, blank=True, verbose_name='截止时间')

    # ── 适用范围（JSON 格式存储，审批时展示） ──
    applicable_categories = models.TextField(
        blank=True, default='',
        verbose_name='适用分类（JSON格式）',
    )
    applicable_products = models.TextField(
        blank=True, default='',
        verbose_name='适用商品（JSON格式）',
    )
    # ── 提交时快照：适用范围的名称（便于审批时快速理解） ──
    applicable_category_names = models.TextField(
        blank=True, default='',
        verbose_name='适用分类名称（提交时快照，逗号分隔）',
    )
    applicable_product_names = models.TextField(
        blank=True, default='',
        verbose_name='适用商品名称（提交时快照，逗号分隔）',
    )

    # ── 成本预估 ──
    expected_cost = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        verbose_name='预估成本',
    )
    expected_usage_count = models.PositiveIntegerField(
        default=0, verbose_name='预估使用人次',
    )
    target_audience = models.CharField(
        max_length=200, blank=True, default='',
        verbose_name='目标用户群',
    )
    campaign_purpose = models.TextField(
        blank=True, default='',
        verbose_name='活动目的',
    )

    reason = models.TextField(blank=True, default='', verbose_name='申请理由')

    # ── 审批字段 ──
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name='状态',
    )
    applicant = models.ForeignKey(
        'auth.User',
        on_delete=models.CASCADE,
        related_name='coupon_applications',
        verbose_name='申请人',
    )
    reviewer = models.ForeignKey(
        'auth.User',
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='reviewed_coupon_applications',
        verbose_name='审批人',
    )
    review_comment = models.TextField(blank=True, default='', verbose_name='审批意见')
    reviewed_at = models.DateTimeField(null=True, blank=True, verbose_name='审批时间')
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='创建时间')

    class Meta:
        db_table = 'goods_coupon_app'
        verbose_name = '优惠券申请'
        verbose_name_plural = verbose_name
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['applicant', '-created_at']),
        ]

    def __str__(self):
        return f'优惠券申请 [{self.get_discount_type_display()}] [{self.get_status_display()}]'