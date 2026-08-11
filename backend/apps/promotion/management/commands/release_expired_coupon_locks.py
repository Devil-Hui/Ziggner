"""定时释放过期锁定的优惠券。

补偿链路：用户下单锁定券（15 分钟），若订单既未支付也未取消（例如直接关闭
页面、或 Redis 宕机导致 celery 自动取消任务未触发），券会一直停留在 LOCKED。
本命令全局释放已过期锁，且仅对「订单已不在待支付状态」的券生效，避免与在途
支付冲突。建议由 cron / celery beat 每 5 分钟调用一次。
"""
from django.core.management.base import BaseCommand

from apps.promotion.services import PromotionService


class Command(BaseCommand):
    help = '释放已过锁定窗口的优惠券（补偿放弃支付的订单）。'

    def handle(self, *args, **options):
        released = PromotionService.release_expired_locks()
        self.stdout.write(
            self.style.SUCCESS(f'已释放 {released} 张过期锁定的优惠券。')
        )
