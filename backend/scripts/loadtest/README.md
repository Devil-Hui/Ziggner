# Ziggner 性能基线压测（Locust）

基于 [Locust](https://locust.io/) 的性能基线工具，用于在 **2 vCPU / 4GB RAM** 主机验证：
`channel-stats`、商品列表、下单等接口的 **P95 < 500ms、TPS ≥ 50**（50 并发）。

## 安装

```bash
pip install locust
```

## 用法（推荐：2C4G 测试拓扑，不碰生产）

1) 起测试拓扑：`docker compose -f docker-compose.test.yml up -d db redis`

2) 起与被测生产**同配置**的 Django（gunicorn gevent 2 worker，限流放开）——详见
   `locustfile.py` 顶部 docstring 中的 `docker run` 模板（挂载本仓库 backend，
   连 `ziggner-test-mysql` / `ziggner-test-redis`，映射 `127.0.0.1:8011`）。

3) 压测（50 并发、60 秒、headless）：

```bash
locust -f scripts/loadtest/locustfile.py --host http://127.0.0.1:8011 \
  -u 50 -r 10 -t 60s --headless --csv=ziggner-perf
```

管理端 `channel-stats` 任务需设置 `ADMIN_TOKEN`（否则自动跳过）。

## 基线实测结果（2026-08-21，2C4G 测试拓扑，容器内压测）

| 指标 | 目标 | 实测 | 结论 |
|---|---|---|---|
| goods/spu TPS（50 并发） | ≥50 | 95–122 | ✅ 达标（2 倍以上） |
| goods/spu P95 | <500ms | 519–640ms | ❌ 超约 3–28% |
| /health/（50 并发） | 无 5xx 崩溃 | 约 26% 503 | ❌ 并发下 DB 探活超时 |
| 顺序单请求 | — | ≈52–55ms | ✅ 轻载表现良好 |

## 根因分析

1. **每协程新建 MySQL 连接（无池化）**：gunicorn gevent worker 下 Django 连接按协程隔离
   （`prod.py` 的 gevent.local 修复），每个请求独立建连。50 并发 = 同时 50 次 TCP+认证握手，
   连接建立成为主要延迟项（连 `/health/` 的 `SELECT 1` 都超时 503）。
2. **2C4G 全栈共宿 CPU 争抢**：同一主机同时运行 Django、MySQL、Redis 及整套
   Prometheus/Grafana/Alertmanager/exporter 监控栈，压测期间 CPU 互相挤压。
3. **缓存未命中冷路径**：测试库无商品数据时，首个请求走完整 DB 查询；
   生产有真实商品且缓存预热后，读路径会显著更快（缓存 key 已验证可正常落盘）。

## 已否决方案：dj_db_conn_pool（django-db-connection-pool 1.2.6）

实验结论：该连接池在 gevent 下**不兼容**——goods/spu 仅微升（P95 519ms 仍未达标），
而 `/health/` 劣化到 57% 错误（SQLAlchemy 池在 gevent 锁/连接复用上异常）。
故 **不采纳**，requirements 中保持不钉死该包（与既有注释一致）。

## 优化方向（后续按需执行）

1. 压测/大促窗口临时停掉 Grafana/Alertmanager 等非核心监控容器，释放 CPU。
2. 生产带真实数据 + 预热缓存后复测（预期 P95 显著低于空库冷路径）。
3. 若要硬性满足 50 并发 P95<500ms：需在 gevent 下实现安全的连接复用
   （自研 greenlet 感知的连接池，而非 dj_db_conn_pool），或扩容预算。
4. `/health/` 探活改为「短超时 + 失败快速 503」并对监控抓取间隔做退避，
   避免探活本身在并发下成为瓶颈。
