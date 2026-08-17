"""Ziggner 生产负载基线压测 — Locust harness。

目标：在 2C4G 主机上验证 API 峰值 CPU ≤70%、P95 延迟可接受、错误率 ≈0。

用法:
  pip install locust
  # 1) 匿名只读承压（无需登录，模拟爬虫/匿名浏览）:
  locust -f scripts/loadtest/locustfile.py --headless -u 50 -r 10 -t 2m -H https://api.ziggner.com
  # 2) 带登录的事务流（设置环境变量，或 Web UI 手动填）:
  ZIG_USER=admin@example.com ZIG_PASS='***' \
    locust -f scripts/loadtest/locustfile.py --headless -u 20 -r 5 -t 3m -H https://api.ziggner.com

观察方法:
  - Locust 终端输出：RPS / P95 / 失败率。
  - 同时另开终端： docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"
    确认各容器 CPU% 之和 ≤70%（2C4G 即 ≤140% 等效）。
  - 若需调高上限，优先提升 gunicorn threads（内存安全），其次 workers（看内存余量）。

注意:
  - 登录/注册/下单/支付等写接口受速率限制（settings.RATE_LIMITS），压测写流请控制并发或走白名单。
  - 只读端点路径以 /api/v1/health/ 为基准；商品/分类等路径请按实际路由调整（见 backend/apps/*/urls.py）。
"""
import os
import random

from locust import HttpUser, task, between

API = "/api/v1"


class AnonymousBrowser(HttpUser):
    """匿名只读承压：模拟未登录的商品浏览/爬虫流量。"""
    wait_time = between(0.5, 2.0)
    host = os.getenv("LOCUST_HOST", "http://localhost:8000")
    # 不携带凭据，命中公开域（Tier C）
    abstract = True

    @task(5)
    def health(self):
        self.client.get(f"{API}/health/", name="GET /health")

    @task(8)
    def goods_list(self):
        # 调整为你真实的商品列表路由
        self.client.get(f"{API}/goods/products/", name="GET /goods/products")

    @task(4)
    def goods_detail(self):
        pid = random.choice([1, 2, 3, 4, 5, 10, 20, 50])
        self.client.get(f"{API}/goods/products/{pid}/", name="GET /goods/products/[id]")

    @task(2)
    def categories(self):
        self.client.get(f"{API}/goods/categories/", name="GET /goods/categories")


class AuthenticatedUser(HttpUser):
    """登录态事务流：登录 -> 浏览 -> （可选）下单，模拟真实买家。"""
    wait_time = between(1.0, 3.0)
    host = os.getenv("LOCUST_HOST", "http://localhost:8000")

    def on_start(self):
        self.token = None
        user = os.getenv("ZIG_USER", "")
        pwd = os.getenv("ZIG_PASS", "")
        if not user:
            return
        # 登录路径按实际路由调整（RATE_LIMITS 中有 session/login 与 token 两种）
        resp = self.client.post(
            f"{API}/users/session/login/",
            json={"username": user, "password": pwd},
            name="POST /users/session/login",
        )
        if resp.status_code == 200:
            try:
                self.token = resp.json().get("data", {}).get("access")
            except Exception:
                self.token = None

    @task(6)
    def browse_authed(self):
        headers = {"Authorization": f"Bearer {self.token}"} if self.token else {}
        self.client.get(f"{API}/goods/products/", headers=headers, name="GET /goods/products (auth)")

    @task(2)
    def me(self):
        if not self.token:
            return
        self.client.get(f"{API}/users/me/", headers={"Authorization": f"Bearer {self.token}"}, name="GET /users/me")
