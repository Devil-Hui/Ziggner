#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Ziggner 性能基线压测（Locust）

用法（2C4G 测试拓扑，推荐）：
  1) 起测试拓扑：docker compose -f docker-compose.test.yml up -d db redis
  2) 起同配置被测 Django（gunicorn gevent 2 worker，与生产一致）：
     docker run -d --name ziggner-load-web --network ziggner-test-net \
       -v $PWD/backend:/backend -w /backend \
       -e DJANGO_SETTINGS_MODULE=project.config.settings.dev \
       -e DB_ENGINE=django.db.backends.mysql -e DB_HOST=ziggner-test-mysql \
       -e DB_NAME=ziggner_test -e DB_USER=ziggner_test -e DB_PASSWORD=ziggner_test \
       -e REDIS_URL=redis://ziggner-test-redis:6379/1 \
       -e DJANGO_SECRET_KEY=test-only-secret-key-not-for-production \
       -e 'THROTTLE_RATES={"anon":"100000/hour","user":"100000/hour","admin_login":"10000/minute","admin_write":"100000/minute","admin_batch":"10000/minute"}' \
       -e 'RATE_LIMITS={}' \
       -p 127.0.0.1:8011:8000 \
       --entrypoint gunicorn ziggner-django:v1.0.5 \
       project.wsgi:application --workers 2 --worker-class gevent \
       --bind 0.0.0.0:8000 --timeout 45
  3) 压测（50 并发、60s，headless）：
     locust -f scripts/loadtest/locustfile.py --host http://127.0.0.1:8011 \
       -u 50 -r 10 -t 60s --headless --csv=ziggner-perf

环境变量：
  ADMIN_TOKEN  管理后台 Token（channel-stats 任务需要；未设置则自动跳过该任务）
  LOAD_EMAIL / LOAD_PASSWORD  压测账号（未注册会尝试注册；注册需邮箱验证码流程，
               建议先在管理后台创建，或改走 mock 验证配置）

基线（2026-08-21 实测，2C4G 测试拓扑，容器内压测，gunicorn gevent 2 worker）：
  goods/spu 50 并发：TPS≈95-122（达标 ≥50）；P95≈520-640ms（未达标 <500ms，超约 3-28%）
  /health/  50 并发：TPS≈90，约 26% 请求 503（并发下每协程新建 DB 连接，SELECT 1 超时）
  顺序单请求：≈52-55ms（轻载表现良好）
  结论：TPS 达标；P95 未达标根因 = 每协程新建 MySQL 连接（无池化）+ 2C4G 全栈共宿
        CPU 争抢。django-db-connection-pool 1.2.6 实测不兼容 gevent（/health/ 劣化，
        57% 错误），未采纳。优化方向见 README.md。
"""
import os

from locust import HttpUser, between, task

LOAD_EMAIL = os.environ.get('LOAD_EMAIL', 'perf@ziggner.com')
LOAD_PASSWORD = os.environ.get('LOAD_PASSWORD', 'Perf!Test123')
ADMIN_TOKEN = os.environ.get('ADMIN_TOKEN', '')


class ZiggnerPerfUser(HttpUser):
    """公开读路径为主（无需登录），管理统计为辅（需 ADMIN_TOKEN）。"""

    wait_time = between(0.1, 0.3)

    def on_start(self):
        self.headers = {}

    @task(6)
    def goods_list(self):
        """商品列表（公共读，缓存命中路径）——TPS/P95 主指标。"""
        self.client.get('/api/v1/goods/spu', name='goods/spu')

    @task(2)
    def goods_hot(self):
        """热销商品（Redis 缓存读）。"""
        self.client.get('/api/v1/goods/hot', name='goods/hot')

    @task(1)
    def tags_list(self):
        """标签列表（Redis 缓存读）。"""
        self.client.get('/api/v1/goods/tag', name='goods/tag')

    @task(1)
    def health(self):
        """健康检查（DB SELECT 1 + Redis ping）——用于观察并发下连接瓶颈。"""
        self.client.get('/health/', name='health')

    @task(1)
    def channel_stats(self):
        """订单渠道统计（管理端，行级隔离聚合）——需 ADMIN_TOKEN，未设置则跳过。"""
        if not ADMIN_TOKEN:
            return
        self.client.get(
            '/api/v1/order/admin/channel-stats/',
            headers={'Authorization': f'Bearer {ADMIN_TOKEN}'},
            name='order/admin/channel-stats',
        )
