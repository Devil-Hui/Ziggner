"""Seed common logistics carriers (idempotent).

Usage:
    python manage.py seed_carriers
"""
from django.core.management.base import BaseCommand
from apps.logistics.models import Carrier

DEFAULT_CARRIERS = [
    ('顺丰速运', 'SF', 'https://www.sf-express.com', 'https://www.sf-express.com/track?no={no}'),
    ('圆通速递', 'YT', 'https://www.yto.net.cn', 'https://www.yto.net.cn/track?no={no}'),
    ('中通快递', 'ZTO', 'https://www.zto.com', 'https://www.zto.com/track?no={no}'),
    ('京东物流', 'JD', 'https://www.jdl.com', 'https://www.jdl.com/track?no={no}'),
]


class Command(BaseCommand):
    help = 'Seed common logistics carriers (idempotent, safe to re-run).'

    def handle(self, *args, **options):
        created = 0
        for name, code, api, tpl in DEFAULT_CARRIERS:
            _, was_created = Carrier.objects.get_or_create(
                code=code,
                defaults={
                    'name': name,
                    'api_base_url': api,
                    'tracking_url_template': tpl,
                    'is_active': True,
                },
            )
            if was_created:
                created += 1
        total = Carrier.objects.count()
        self.stdout.write(
            self.style.SUCCESS(f'Carriers seeded: {created} new, {total} total.')
        )
