from decimal import Decimal
from django.conf import settings
from .models import Carrier, ShippingRate, Shipment, ShipmentStatus


class LogisticsService:

    @staticmethod
    def calculate_shipping_cost(user, data):
        """计算运费（简化版：取第一个激活承运商的最低费率）"""
        carrier = Carrier.objects.filter(is_active=True).first()
        if not carrier:
            return {'cost': Decimal('0'), 'carrier_name': '', 'estimated_days': 0}

        # 按订单总价匹配费率
        total_price = Decimal(str(data.get('total_price', 0)))
        weight = Decimal(str(data.get('weight', 0)))

        rate = ShippingRate.objects.filter(
            carrier=carrier, is_active=True,
        ).filter(
            models.Q(max_value__isnull=True) | models.Q(max_value__gte=total_price),
        ).filter(
            min_value__lte=total_price,
        ).order_by('price').first()

        if rate:
            cost = rate.price
        else:
            cost = Decimal('0')

        # 免运费门槛（可在 settings 中配置）
        free_threshold = getattr(settings, 'SHIPPING_FREE_THRESHOLD', Decimal('99'))
        if total_price >= free_threshold:
            cost = Decimal('0')

        return {
            'cost': cost,
            'carrier_name': carrier.name,
            'estimated_days': 3,  # 简化：固定 3 天
        }

    @staticmethod
    def create_shipment(order, carrier_id=None, tracking_no=''):
        """创建物流记录（下单后调用）"""
        from .models import Carrier
        carrier = None
        if carrier_id:
            carrier = Carrier.objects.filter(pk=carrier_id, is_active=True).first()
        if not carrier:
            carrier = Carrier.objects.filter(is_active=True).first()

        shipment, created = Shipment.objects.get_or_create(
            order=order,
            defaults={
                'carrier': carrier,
                'tracking_no': tracking_no,
                'status': ShipmentStatus.PENDING,
                'shipping_cost': Decimal('0'),
            },
        )
        return shipment

    @staticmethod
    def update_tracking(tracking_no, status=None, history=None):
        """更新物流追踪信息（Webhook 或定时任务调用）"""
        try:
            shipment = Shipment.objects.get(tracking_no=tracking_no)
        except Shipment.DoesNotExist:
            return None

        if status:
            shipment.status = status
        if history is not None:
            shipment.tracking_history = history
        if status == ShipmentStatus.DELIVERED and not shipment.actual_delivery:
            from django.utils import timezone
            shipment.actual_delivery = timezone.now()
        shipment.save()
        return shipment
