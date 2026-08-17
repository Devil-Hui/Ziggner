# Ziggner 负载压测 Harness

基于 [Locust](https://locust.io/) 的生产基线压测工具，用于在 **2 vCPU / 4GB RAM** 主机上验证：

- API 峰值 CPU ≤ 70%（硬上限之和已配为 1.40 vCPU，见 `docker-compose.prod.yml` 顶部预算注释）
- P95 延迟可接受、失败率 ≈ 0

## 安装

```bash
pip install locust
```

## 用法

### 1) 匿名只读承压（推荐先做）

模拟匿名浏览 / 爬虫流量，无需登录：

```bash
locust -f scripts/loadtest/locustfile.py --headless -u 50 -r 10 -t 2m -H https://api.ziggner.com
```

- `-u 50`：并发用户数
- `-r 10`：每秒启动用户数（ramp-up）
- `-t 2m`：持续 2 分钟

### 2) 登录态事务流

```bash
ZIG_USER=admin@example.com ZIG_PASS='***' \
  locust -f scripts/loadtest/locustfile.py --headless -u 20 -r 5 -t 3m -H https://api.ziggner.com
```

## 观察指标

终端已输出 RPS / P95 / 失败率。另开终端实时看容器资源：

```bash
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}"
```

确认各容器 **CPU% 之和 ≤ 70%**（2C4G 即等效 ≤140%）。内存上限之和 ≈1.86GB（<70%）。

## 调优指引

若压测发现瓶颈：

1. **优先提升 gunicorn 并发**：`GUNICORN_THREADS`（当前 4）内存安全；`GUNICORN_WORKERS` 从 1 提到 2 需确认内存余量（每 worker ≈300–400MB）。
2. **celery 并发**：`CELERY_CONCURRENCY`（当前 1）受 0.20 vCPU 上限约束，图片处理重任务可单独队列扩容。
3. **DB**：`innodb-buffer-pool-size=384M`、`max-connections=40` 已按小库调优；慢查询优先加索引。
4. 所有 `cpus` 为 Docker 硬上限，调高前先确认总和不突破 1.40 vCPU 的 70% 目标。

## 注意事项

- 登录 / 注册 / 下单 / 支付等写接口受 **速率限制**（`settings.RATE_LIMITS`），压测写流请控制并发或走白名单，避免被 429 干扰基线读数。
- `locustfile.py` 中的商品 / 分类路径为示例，请按实际路由（`backend/apps/*/urls.py`）调整。
