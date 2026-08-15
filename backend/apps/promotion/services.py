from decimal import Decimal

from django.db import transaction, models
from django.utils import timezone
from logging import getLogger

from utils.cache import Cache
from .models import (
    Coupon, CouponApplication, CouponApprovalHistory, CouponScope,
    CouponTargetAudience, DiscountType, PromoCode, UserCoupon,
    generate_promo_code,
)

_cache = Cache('promotion')
_logger = getLogger('biz')


def _coupon_to_dict(c: Coupon) -> dict:
    return {
        'id': c.id,
        'name': c.name,
        'code': c.code,
        'discount_type': c.discount_type,
        'amount': float(c.amount),
        'min_amount': float(c.min_amount),
        'max_discount': float(c.max_discount) if c.max_discount else None,
        'total_count': c.total_count,
        'claimed_count': c.claimed_count,
        'remaining': c.total_count - c.claimed_count,
        'stackable': c.stackable,
        'target_audience': c.target_audience,
        'start_time': c.start_time,
        'end_time': c.end_time,
        'is_active': c.is_active,
        'created_at': c.created_at,
    }


class PromotionService:

    SUPPORTED_AUDIENCES = set(CouponTargetAudience.values)

    @staticmethod
    def _audience_allows(user, coupon):
        audience = (coupon.target_audience or 'all').strip().lower()
        if audience == 'all':
            return True
        from apps.order.models import Order
        has_payment_history = Order.objects.filter(
            user=user,
            paid_at__isnull=False,
        ).exists()
        if audience == 'new-users':
            return not has_payment_history
        if audience == 'returning-users':
            return has_payment_history
        return False

    @staticmethod
    def get_public_detail(code):
        coupon = Coupon.objects.filter(code=code).first()
        if not coupon:
            raise ValueError('COUPON_NOT_FOUND')
        now = timezone.now()
        return {
            **_coupon_to_dict(coupon),
            'name': coupon.name,
            'per_user_limit': coupon.per_user_limit,
            'claimable': (
                coupon.is_active
                and coupon.claimed_count < coupon.total_count
                and coupon.start_time <= now <= coupon.end_time
            ),
        }

    @staticmethod
    @transaction.atomic
    def prepare_discount(user, *, user_coupon_id=None, coupon_code='', items=()):
        if not user_coupon_id and not coupon_code:
            return None, Decimal('0.00')
        filters = {
            'user': user,
            'status__in': (UserCoupon.Status.AVAILABLE, UserCoupon.Status.RETURNED),
        }
        if user_coupon_id:
            filters['pk'] = user_coupon_id
        else:
            filters['coupon__code'] = coupon_code
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(**filters).first()
        if not uc:
            raise ValueError('COUPON_INVALID')
        now = timezone.now()
        coupon = uc.coupon
        if not coupon.is_active or not (coupon.start_time <= now <= coupon.end_time):
            raise ValueError('COUPON_EXPIRED')
        if not PromotionService._audience_allows(user, coupon):
            raise ValueError('COUPON_AUDIENCE_MISMATCH')

        scopes = list(coupon.scopes.values_list('scope_type', 'target_id'))
        eligible = Decimal('0.00')
        has_activity = False
        for item in items:
            sku = item['sku']
            matches = not scopes or any(
                (scope_type == 'spu' and target_id == sku.spu_id)
                or (scope_type == 'category' and target_id == sku.spu.category_id)
                or (scope_type == 'brand' and target_id == sku.spu.brand_id)
                for scope_type, target_id in scopes
            )
            if matches:
                eligible += Decimal(item['subtotal'])
                has_activity = has_activity or bool(item.get('has_activity'))
        if eligible <= 0:
            raise ValueError('COUPON_NOT_APPLICABLE')
        if has_activity and not coupon.stackable:
            raise ValueError('COUPON_NOT_STACKABLE')
        discount = PromotionService.calc_discount(coupon, eligible).quantize(Decimal('0.01'))
        if discount <= 0:
            raise ValueError('COUPON_MIN_AMOUNT_NOT_MET')
        return uc, discount

    @staticmethod
    def list_available():
        key = 'available'
        cached = _cache.get_json(key)
        if cached is not None:
            return cached
        now = timezone.now()
        coupons = [
            _coupon_to_dict(c)
            for c in Coupon.objects.filter(
                is_active=True,
                start_time__lte=now,
                end_time__gte=now,
                claimed_count__lt=models.F('total_count'),
            ).order_by('-created_at')
        ]
        _cache.set_json(key, coupons, 10)
        return coupons

    @staticmethod
    def list_user_coupons(user, status=None):
        now = timezone.now()
        # 先释放过期锁定（用户放弃支付且未取消订单 → 券永久锁定问题）
        PromotionService.release_expired_locks(user=user)
        UserCoupon.objects.filter(
            user=user,
            status__in=(UserCoupon.Status.AVAILABLE, UserCoupon.Status.RETURNED),
        ).filter(
            models.Q(coupon__is_active=False) | models.Q(coupon__end_time__lt=now),
        ).update(status=UserCoupon.Status.EXPIRED, updated_at=now)
        qs = UserCoupon.objects.filter(user=user).select_related('coupon')
        if status:
            qs = qs.filter(status=status)
        return qs

    @staticmethod
    @transaction.atomic
    def release_expired_locks(user=None):
        """释放已过锁定窗口（lock_expires_at 过期）的 LOCKED 券。

        - user 指定时只处理该用户（懒释放，保证用户视图不出现永久锁定券）；
        - user 为 None 时全局处理（供定时任务调用），仅当对应订单已不在
          待支付状态才释放，避免与仍在途的支付冲突。
        返回释放的券数量。
        """
        now = timezone.now()
        qs = UserCoupon.objects.select_for_update().filter(
            status=UserCoupon.Status.LOCKED, lock_expires_at__lt=now,
        )
        if user is not None:
            qs = qs.filter(user=user)
        else:
            # 全局模式：排除仍在待支付的订单，防止释放后订单又支付导致漏核销
            from apps.order.models import Order, OrderStatus
            live = Order.objects.filter(
                order_no__in=qs.values('used_order_no'),
                status=OrderStatus.PENDING_PAYMENT,
            ).values_list('order_no', flat=True)
            qs = qs.exclude(used_order_no__in=list(live))
        expired = list(qs.select_related('coupon'))
        if not expired:
            return 0
        for uc in expired:
            if uc.coupon.is_active and uc.coupon.start_time <= now <= uc.coupon.end_time:
                uc.status = UserCoupon.Status.AVAILABLE
            else:
                uc.status = UserCoupon.Status.EXPIRED
            uc.used_order_no = ''
            uc.locked_at = None
            uc.lock_expires_at = None
            uc.save(update_fields=[
                'status', 'used_order_no', 'locked_at', 'lock_expires_at', 'updated_at',
            ])
        return len(expired)

    @staticmethod
    @transaction.atomic
    def claim(user, code, promo_code=None):
        coupon = Coupon.objects.select_for_update().filter(code=code).first()
        if not coupon:
            _logger.warning('Coupon claim fail: user_id=%s code=%s error=COUPON_NOT_FOUND', user.id, code)
            raise ValueError('COUPON_NOT_FOUND')
        if not coupon.is_available:
            _logger.warning('Coupon claim fail: user_id=%s code=%s error=COUPON_UNAVAILABLE', user.id, code)
            raise ValueError('COUPON_UNAVAILABLE')
        if not PromotionService._audience_allows(user, coupon):
            _logger.warning(
                'Coupon claim fail: user_id=%s code=%s error=COUPON_AUDIENCE_MISMATCH',
                user.id,
                code,
            )
            raise ValueError('COUPON_AUDIENCE_MISMATCH')

        # 用 select_for_update 保证并发下 per_user_limit 检查与创建原子性
        user_count = UserCoupon.objects.select_for_update().filter(user=user, coupon=coupon).count()
        if user_count >= coupon.per_user_limit:
            _logger.warning(
                'Coupon claim fail: user_id=%s code=%s error=COUPON_LIMIT_REACHED limit=%d',
                user.id, code, coupon.per_user_limit
            )
            raise ValueError('COUPON_LIMIT_REACHED')

        uc = UserCoupon.objects.create(
            user=user, coupon=coupon, status=UserCoupon.Status.AVAILABLE,
            promo_code=promo_code,
        )
        # 🔥 修复：claimed_count 必须递增，且 update_fields 必须包含该字段
        coupon.claimed_count = models.F('claimed_count') + 1
        coupon.save(update_fields=['claimed_count'])
        if promo_code is not None:
            PromoCode.objects.filter(pk=promo_code.pk).update(
                claim_count=models.F('claim_count') + 1,
            )
        _cache.delete('available')
        _logger.info(
            'Coupon claim success: user_id=%s code=%s coupon_id=%d promo_code=%s',
            user.id, code, coupon.id, promo_code.code if promo_code else None,
        )

    @staticmethod
    @transaction.atomic
    def claim_via_promo_code(user, promo_code_str):
        """凭专属推广码领取（指向同一张基础券，按码追踪来源）。"""
        pc = PromoCode.objects.select_for_update().filter(
            code=promo_code_str, is_active=True,
        ).select_related('coupon').first()
        if not pc:
            _logger.warning(
                'Promo claim fail: user_id=%s code=%s error=PROMO_CODE_NOT_FOUND',
                user.id, promo_code_str,
            )
            raise ValueError('PROMO_CODE_NOT_FOUND')
        if not pc.coupon.is_available:
            raise ValueError('COUPON_UNAVAILABLE')
        return PromotionService.claim(user, pc.coupon.code, promo_code=pc)

    @staticmethod
    @transaction.atomic
    def lock(user, user_coupon_id, order_no, lock_minutes=15):
        now = timezone.now()
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            pk=user_coupon_id,
            user=user,
            status__in=(UserCoupon.Status.AVAILABLE, UserCoupon.Status.RETURNED),
        ).first()
        if not uc:
            raise ValueError('COUPON_INVALID')
        coupon = uc.coupon
        if not coupon.is_active or not (coupon.start_time <= now <= coupon.end_time):
            uc.status = UserCoupon.Status.EXPIRED
            uc.save(update_fields=['status', 'updated_at'])
            raise ValueError('COUPON_EXPIRED')
        uc.status = UserCoupon.Status.LOCKED
        uc.locked_at = now
        uc.lock_expires_at = now + timezone.timedelta(minutes=lock_minutes)
        uc.used_order_no = order_no
        uc.save(update_fields=['status', 'locked_at', 'lock_expires_at', 'used_order_no', 'updated_at'])
        return uc

    @staticmethod
    @transaction.atomic
    def consume_for_order(order_no):
        uc = UserCoupon.objects.select_for_update().filter(
            used_order_no=order_no, status=UserCoupon.Status.LOCKED,
        ).first()
        if not uc:
            return None
        uc.status = UserCoupon.Status.USED
        uc.used_at = timezone.now()
        uc.locked_at = None
        uc.lock_expires_at = None
        uc.save(update_fields=['status', 'used_at', 'locked_at', 'lock_expires_at', 'updated_at'])
        Coupon.objects.filter(pk=uc.coupon_id).update(used_count=models.F('used_count') + 1)
        # 引流归因：若此券通过专属推广码领取，累计付款订单数与 GMV
        if uc.promo_code_id:
            from apps.order.models import Order
            order = Order.objects.filter(order_no=order_no).only('actual_amount').first()
            gmv = order.actual_amount if order else Decimal('0.00')
            PromoCode.objects.filter(pk=uc.promo_code_id).update(
                paid_order_count=models.F('paid_order_count') + 1,
                gmv=models.F('gmv') + gmv,
            )
        return uc

    @staticmethod
    @transaction.atomic
    def release_for_order(order_no):
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            used_order_no=order_no, status=UserCoupon.Status.LOCKED,
        ).first()
        if not uc:
            return None
        now = timezone.now()
        uc.status = (
            UserCoupon.Status.AVAILABLE
            if uc.coupon.is_active and uc.coupon.start_time <= now <= uc.coupon.end_time
            else UserCoupon.Status.EXPIRED
        )
        uc.used_order_no = ''
        uc.locked_at = None
        uc.lock_expires_at = None
        uc.save(update_fields=['status', 'used_order_no', 'locked_at', 'lock_expires_at', 'updated_at'])
        return uc

    @staticmethod
    @transaction.atomic
    def return_for_refund(order_no, *, full_refund):
        if not full_refund:
            return None
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            used_order_no=order_no, status=UserCoupon.Status.USED,
        ).first()
        if not uc:
            return None
        now = timezone.now()
        if not (uc.coupon.is_active and uc.coupon.start_time <= now <= uc.coupon.end_time):
            return None
        uc.status = UserCoupon.Status.RETURNED
        uc.used_order_no = ''
        uc.used_at = None
        uc.save(update_fields=['status', 'used_order_no', 'used_at', 'updated_at'])
        Coupon.objects.filter(pk=uc.coupon_id, used_count__gt=0).update(used_count=models.F('used_count') - 1)
        return uc

    @staticmethod
    @transaction.atomic
    def use(user, user_coupon_id, order_no):
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            pk=user_coupon_id, user=user, status__in=(UserCoupon.Status.AVAILABLE, UserCoupon.Status.RETURNED),
        ).first()
        if not uc:
            _logger.warning(
                'Coupon use fail: user_id=%s user_coupon_id=%d error=COUPON_INVALID',
                user.id, user_coupon_id
            )
            raise ValueError('COUPON_INVALID')
        if not uc.coupon.is_available:
            _logger.warning(
                'Coupon use fail: user_id=%s user_coupon_id=%d coupon_id=%d error=COUPON_EXPIRED',
                user.id, user_coupon_id, uc.coupon_id
            )
            raise ValueError('COUPON_EXPIRED')

        uc.status = UserCoupon.Status.USED
        uc.used_at = timezone.now()
        uc.used_order_no = order_no
        uc.save()

        Coupon.objects.filter(pk=uc.coupon_id).update(
            used_count=models.F('used_count') + 1,
        )
        _logger.info(
            'Coupon use success: user_id=%s user_coupon_id=%d coupon_id=%d order_no=%s',
            user.id, user_coupon_id, uc.coupon_id, order_no
        )

    @staticmethod
    def calc_discount(coupon, order_amount):
        if order_amount < coupon.min_amount:
            return Decimal('0')
        if coupon.discount_type == DiscountType.FIXED:
            return min(coupon.amount, order_amount)
        discount = order_amount * coupon.amount / Decimal('100')
        if coupon.max_discount:
            discount = min(discount, coupon.max_discount)
        return discount

    @staticmethod
    @transaction.atomic
    def use_by_code(user, code, order_no):
        uc = UserCoupon.objects.select_for_update().select_related('coupon').filter(
            user=user, coupon__code=code, status__in=(UserCoupon.Status.AVAILABLE, UserCoupon.Status.RETURNED),
        ).first()
        if not uc:
            raise ValueError('COUPON_INVALID')
        return PromotionService.use(user, uc.pk, order_no), uc


class CouponApplicationService:
    EDITABLE_FIELDS = {
        'coupon_name', 'coupon_code', 'discount_type', 'amount', 'min_amount',
        'max_discount', 'stackable', 'total_count', 'per_user_limit',
        'start_time', 'end_time', 'applicable_categories',
        'applicable_products', 'applicable_brands', 'expected_cost',
        'expected_usage_count', 'target_audience', 'campaign_purpose', 'reason',
    }

    @staticmethod
    def _snapshot(application):
        return {
            'coupon_name': application.coupon_name,
            'coupon_code': application.coupon_code,
            'discount_type': application.discount_type,
            'amount': str(application.amount),
            'min_amount': str(application.min_amount),
            'max_discount': str(application.max_discount) if application.max_discount is not None else None,
            'stackable': application.stackable,
            'total_count': application.total_count,
            'per_user_limit': application.per_user_limit,
            'start_time': application.start_time.isoformat(),
            'end_time': application.end_time.isoformat(),
            'applicable_categories': application.applicable_categories,
            'applicable_products': application.applicable_products,
            'applicable_brands': application.applicable_brands,
            'target_audience': application.target_audience,
        }

    @staticmethod
    def _record(application, actor, from_status, to_status, comment=''):
        CouponApprovalHistory.objects.create(
            application=application,
            actor=actor,
            from_status=from_status,
            to_status=to_status,
            comment=comment,
            snapshot=CouponApplicationService._snapshot(application),
        )

    @staticmethod
    def _validate_payload(data):
        if data['start_time'] >= data['end_time']:
            raise ValueError('INVALID_TIME_RANGE')
        if data['total_count'] < 1 or data['per_user_limit'] < 1:
            raise ValueError('INVALID_QUANTITY')
        if data['per_user_limit'] > data['total_count']:
            raise ValueError('PER_USER_LIMIT_EXCEEDED')
        if data['amount'] <= 0 or data['min_amount'] < 0:
            raise ValueError('INVALID_DISCOUNT')
        if data['discount_type'] == DiscountType.PERCENT and data['amount'] > 100:
            raise ValueError('INVALID_PERCENT')
        if data.get('target_audience', CouponTargetAudience.ALL) not in PromotionService.SUPPORTED_AUDIENCES:
            raise ValueError('INVALID_TARGET_AUDIENCE')

        from apps.goods.models import Brand, Category, SPU
        scope_models = (
            ('applicable_categories', Category),
            ('applicable_products', SPU),
            ('applicable_brands', Brand),
        )
        for field, model in scope_models:
            ids = list(dict.fromkeys(data.get(field, [])))
            if model.objects.filter(id__in=ids).count() != len(ids):
                raise ValueError('INVALID_SCOPE')
            data[field] = ids

    @staticmethod
    @transaction.atomic
    def create_draft(user, group_id, data):
        from apps.goods.models import AdminGroupMember, AdminGroup
        from apps.rbac.constants import Role
        from apps.rbac.services import has_role

        coupon_id = data.pop('coupon_id', None)
        if coupon_id:
            if not Coupon.objects.filter(pk=coupon_id).exists():
                raise ValueError('COUPON_NOT_FOUND')
            if CouponApplication.objects.filter(coupon_id=coupon_id).exists():
                raise ValueError('COUPON_APPLICATION_EXISTS')

        admin_group = None
        if has_role(user, Role.SUPERADMIN):
            # 超级管理员可直接发起优惠券审核申请，无需是组长
            if group_id:
                admin_group = AdminGroup.objects.filter(pk=group_id).first()
        else:
            membership = AdminGroupMember.objects.select_related('group').filter(
                user=user,
                group_id=group_id,
                role=AdminGroupMember.Role.LEADER,
                status=AdminGroupMember.Status.ACTIVE,
            ).first()
            if not membership:
                raise PermissionError('GROUP_LEADER_REQUIRED')
            admin_group = membership.group

        values = {field: data[field] for field in CouponApplicationService.EDITABLE_FIELDS if field in data}
        CouponApplicationService._validate_payload(values)
        application = CouponApplication.objects.create(
            applicant=user,
            admin_group=admin_group,
            status=CouponApplication.Status.DRAFT,
            coupon_id=coupon_id,
            **values,
        )
        CouponApplicationService._record(
            application, user, '', CouponApplication.Status.DRAFT,
        )
        return application

    @staticmethod
    @transaction.atomic
    def submit(user, application_id):
        application = CouponApplication.objects.select_for_update().get(
            id=application_id,
            applicant=user,
        )
        if application.status not in (CouponApplication.Status.DRAFT, CouponApplication.Status.REJECTED):
            raise ValueError('INVALID_APPLICATION_TRANSITION')
        from_status = application.status
        application.status = CouponApplication.Status.PENDING
        application.submitted_at = timezone.now()
        application.save(update_fields=['status', 'submitted_at', 'updated_at'])
        CouponApplicationService._record(
            application, user, from_status, CouponApplication.Status.PENDING,
        )
        return application

    @staticmethod
    @transaction.atomic
    def review(reviewer, application_id, action, comment=''):
        from apps.rbac.constants import Role
        from apps.rbac.services import has_role
        if not has_role(reviewer, Role.SUPERADMIN):
            raise PermissionError('SUPERADMIN_REQUIRED')
        application = CouponApplication.objects.select_for_update().get(id=application_id)
        if application.status != CouponApplication.Status.PENDING:
            raise ValueError('INVALID_APPLICATION_TRANSITION')
        if action not in ('approve', 'reject'):
            raise ValueError('INVALID_REVIEW_ACTION')

        application.reviewer = reviewer
        application.review_comment = comment
        application.reviewed_at = timezone.now()
        if action == 'reject':
            application.status = CouponApplication.Status.REJECTED
            application.save()
            CouponApplicationService._record(
                application, reviewer, CouponApplication.Status.PENDING,
                CouponApplication.Status.REJECTED, comment,
            )
            return None

        application.status = CouponApplication.Status.APPROVED
        application.save()
        CouponApplicationService._record(
            application, reviewer, CouponApplication.Status.PENDING,
            CouponApplication.Status.APPROVED, comment,
        )
        coupon_values = {
                'name': application.coupon_name,
                'discount_type': application.discount_type,
                'amount': application.amount,
                'min_amount': application.min_amount,
                'max_discount': application.max_discount,
                'stackable': application.stackable,
                'total_count': application.total_count,
                'per_user_limit': application.per_user_limit,
                'start_time': application.start_time,
                'end_time': application.end_time,
                'target_audience': application.target_audience,
                'is_active': True,
                'created_by': reviewer,
        }
        if application.coupon_code:
            coupon_values['code'] = application.coupon_code
        if application.coupon_id:
            coupon = Coupon.objects.select_for_update().get(pk=application.coupon_id)
            for field, value in coupon_values.items():
                setattr(coupon, field, value)
            coupon.save(update_fields=[*coupon_values, 'updated_at'])
        else:
            coupon = Coupon.objects.create(**coupon_values)
        CouponScope.objects.filter(coupon=coupon).delete()
        CouponScope.objects.bulk_create([
            CouponScope(coupon=coupon, scope_type=scope_type, target_id=target_id)
            for scope_type, values in (
                (CouponScope.ScopeType.CATEGORY, application.applicable_categories),
                (CouponScope.ScopeType.SPU, application.applicable_products),
                (CouponScope.ScopeType.BRAND, application.applicable_brands),
            )
            for target_id in values
        ])
        now = timezone.now()
        lifecycle_status = (
            CouponApplication.Status.SCHEDULED
            if application.start_time > now
            else CouponApplication.Status.ACTIVE
        )
        application.coupon = coupon
        application.status = lifecycle_status
        application.save(update_fields=['coupon', 'status', 'updated_at'])
        CouponApplicationService._record(
            application, reviewer, CouponApplication.Status.APPROVED, lifecycle_status, comment,
        )
        Cache('promotion').delete('available')
        return coupon

    @staticmethod
    @transaction.atomic
    def revise(user, application_id, changes):
        application = CouponApplication.objects.select_for_update().select_related('coupon').get(
            id=application_id,
            applicant=user,
        )
        previous = application.status
        for field, value in changes.items():
            if field in CouponApplicationService.EDITABLE_FIELDS:
                setattr(application, field, value)
        current = {
            field: getattr(application, field)
            for field in CouponApplicationService.EDITABLE_FIELDS
        }
        CouponApplicationService._validate_payload(current)
        application.status = (
            CouponApplication.Status.DRAFT
            if previous in (CouponApplication.Status.DRAFT, CouponApplication.Status.REJECTED)
            else CouponApplication.Status.PENDING
        )
        application.reviewer = None
        application.reviewed_at = None
        application.review_comment = ''
        application.save()
        if application.coupon_id:
            application.coupon.is_active = False
            application.coupon.save(update_fields=['is_active'])
        CouponApplicationService._record(
            application, user, previous, application.status, 'material revision',
        )
        Cache('promotion').delete('available')
        return application


class PromoCodeService:
    """专属推广码（引流追踪）服务。"""

    @staticmethod
    @transaction.atomic
    def create_codes(coupon_id, creator, *, codes=None, name='', note='', count=1, prefix=''):
        """为一个基础券创建推广码。

        - codes 给定时按给定字符串创建（需全局唯一、去除空白、转大写）；
        - 否则按 count 自动生成（可带 prefix）。
        返回创建的 PromoCode 列表。
        """
        if not Coupon.objects.filter(pk=coupon_id).exists():
            raise ValueError('COUPON_NOT_FOUND')

        if codes:
            requested = [str(c).strip().upper() for c in codes if str(c).strip()]
            if not requested:
                raise ValueError('EMPTY_PROMO_CODES')
            dup_in_req = len(requested) != len(set(requested))
            if dup_in_req:
                raise ValueError('DUPLICATE_PROMO_CODE_IN_REQUEST')
            existing = set(
                PromoCode.objects.filter(code__in=requested).values_list('code', flat=True)
            )
            clash = existing & set(requested)
            if clash:
                raise ValueError('PROMO_CODE_EXISTS:' + ','.join(sorted(clash)))
            objs = [
                PromoCode(
                    coupon_id=coupon_id, code=c, name=name, note=note, created_by=creator,
                )
                for c in requested
            ]
        else:
            count = max(1, int(count))
            if count > 200:
                raise ValueError('TOO_MANY_PROMO_CODES')
            objs = [
                PromoCode(
                    coupon_id=coupon_id,
                    code=generate_promo_code(prefix=prefix),
                    name=name, note=note, created_by=creator,
                )
                for _ in range(count)
            ]
        # bulk_create 在本环境不回填主键，故按码回查保证返回实例带 id
        created_codes = [o.code for o in objs]
        PromoCode.objects.bulk_create(objs)
        return list(
            PromoCode.objects.filter(coupon_id=coupon_id, code__in=created_codes)
        )

    @staticmethod
    def dashboard(coupon_id=None):
        """引流看板：每个推广码的领取数、独立用户数、付款订单数、GMV。"""
        from django.db.models import Count
        qs = PromoCode.objects.all().select_related('coupon', 'created_by')
        if coupon_id is not None:
            qs = qs.filter(coupon_id=coupon_id)
        qs = qs.annotate(
            unique_users=Count('user_coupons__user', distinct=True),
        )
        return qs.order_by('-gmv', '-paid_order_count', '-claim_count')
