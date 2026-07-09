# Ziggner 运维文档（Operations Runbook）

> 适用范围：2 vCPU / 4GB 内存单机部署（Docker Compose 编排，7 容器）。
> 文档目标：首次搭建、版本更新、容器运维、日常维护，并对架构与后续演进给出大厂规范视角的考量与建议。
> 文档版本：2026-07-07 ｜ 维护人：运维 / 交付团队

---

## 0. 系统架构速览

### 0.1 容器与服务清单

| 容器名（container_name） | compose 服务名 | 职责 | 内部端口 | 资源配额 | 健康检查 |
|---|---|---|---|---|---|
| `ziggner-nginx` | `nginx` | 前端静态资源 + 反向代理（80） | 80 | 0.15 CPU / 64MB | `/healthz` |
| `ziggner-django` | `django-app` | Django + Gunicorn API（8000） | 8000 | 0.40 CPU / 400MB | `/health/` |
| `ziggner-celery-worker` | `celery-worker` | 异步任务（订单超时、通知） | — | 0.25 CPU / 256MB | `celery inspect ping` |
| `ziggner-celery-beat` | `celery-beat` | 定时任务调度 | — | 0.10 CPU / 128MB | `pgrep celery beat` |
| `ziggner-db` | `db` | MySQL 8.0.36 主库 | 3306 | 0.25 CPU / 256MB | `mysqladmin ping` |
| `ziggner-redis` | `redis` | 缓存 + 分布式锁（需密码） | 6379 | 0.15 CPU / 200MB | `redis-cli ping` |
| `ziggner-rabbitmq` | `rabbitmq` | Celery 消息 broker | 5672/15672 | 0.10 CPU / 128MB | `check_port_connectivity` |

**总资源预算**：CPU ≈ 1.40 / 2.00（峰值 70%），内存 ≈ 1.43GB / 4GB（≈ 36%）。所有服务 `restart: unless-stopped`，通过 `oom_score_adj` 分级保证 DB/Redis 优先存活。

### 0.2 持久化卷（Named Volumes）

| 卷名 | 用途 |
|---|---|
| `ziggner_mysql_data` | MySQL 数据文件（**唯一真源，不可丢**） |
| `ziggner_redis_data` | Redis 数据（当前 `--save ""` 不持久化，仅作缓存） |
| `ziggner_rabbitmq_data` | MQ 元数据 |
| `ziggner_media` | 用户上传媒体（本地存储时） |
| `ziggner_static` | Django 收集静态文件 |
| `ziggner_django_logs` / `ziggner_celery_logs` / `ziggner_beat_logs` | 各服务日志 |

### 0.3 网络与端口暴露

- 仅 `nginx` 暴露主机端口 `80`；DB/Redis/RabbitMQ **仅在内网 `ziggner_net` 互通，不暴露到主机**，符合最小暴露面原则。
- Django 入口由 `setup.sh` 统一编排：启动时自动 `migrate` → `collectstatic` → `gunicorn`（celery 服务则启动对应 worker/beat）。

---

## 1. 首次搭建（Initial Deployment）

### 1.1 前置条件

| 项目 | 要求 |
|---|---|
| 操作系统 | Linux（推荐 Ubuntu 22.04+），关闭 swap 或保留充足内存 |
| Docker | 24.x+，启用 `buildkit` |
| Docker Compose | v2（`docker compose` 子命令） |
| 域名 | 已解析 A 记录指向本机公网 IP（Cloudflare 托管最佳） |
| 防火墙 | 仅放行 22（SSH）、80（HTTP，后续建议仅 443） |

### 1.2 准备生产环境变量

用途：所有敏感配置与密钥集中管理，避免硬编码。
进入方式：在项目根目录（含 `docker-compose.prod.yml`）操作。

```bash
# 1. 复制模板（模板即仓库内的 .env.production 示例）
cp .env.production .env.production.local   # 或直接编辑 .env.production

# 2. 必须逐项替换为真实值（切勿提交到 Git）：
#    DJANGO_SECRET_KEY        随机 50 位字符串
#    DB_PASSWORD / DB_ROOT_PASSWORD  强密码
#    REDIS_PASSWORD           强密码（redis-cli 连接需带此密码）
#    RABBITMQ_DEFAULT_PASS    强密码
#    ALLOWED_HOSTS / DOMAIN / CORS_ORIGINS   填真实域名
#    FILE_STORAGE=local       初期本地，后续切 s3（Cloudflare R2）
```

> ⚠️ `.env.production` 含明文密钥，已被 `.gitignore` 忽略。**禁止**推送到远程仓库。生产环境建议后续迁移至 Docker Secrets / Vault（见 §6 改进项）。

### 1.3 构建镜像

用途：基于 `Dockerfile.prod`（后端）与 `web/react/Dockerfile`（前端 Nginx）构建全部镜像。
进入方式：项目根目录。

```bash
# 后端（含 django / celery 共用镜像）+ 前端（nginx 镜像）
docker compose -f docker-compose.prod.yml build

# 国内构建加速（可选，使用清华/淘宝镜像）
docker compose -f docker-compose.prod.yml build \
  --build-arg APT_MIRROR=mirrors.tuna.tsinghua.edu.cn \
  --build-arg PIP_INDEX=https://pypi.tuna.tsinghua.edu.cn/simple
```

### 1.4 启动全部容器

用途：按依赖顺序启动 7 个服务（DB → Redis → RabbitMQ → Django → Celery → Nginx）。

```bash
docker compose -f docker-compose.prod.yml up -d
```

### 1.5 数据库初始化确认

用途：确认业务库与账号已就绪（compose 中已声明 `MYSQL_DATABASE=ziggner` 与 `MYSQL_USER=ziggner`，首次启动自动创建）。

```bash
# 进入容器查看 MySQL（详见 §3.1）
docker exec -it ziggner-db mysql -u root -p
# 执行：
#   SHOW DATABASES;                 -- 应见 ziggner
#   SELECT user,host FROM mysql.user WHERE user='ziggner';
```

> 迁移由 `ziggner-django` 启动时自动执行（`setup.sh` → `migrate`）。若需手动触发：
> `docker exec ziggner-django python manage.py migrate --noinput`

### 1.6 初始化超级管理员（可选）

用途：创建后台登录账号。

```bash
docker exec -it ziggner-django python manage.py createsuperuser
```

### 1.7 验证服务健康

```bash
# 查看全部容器状态（STATUS 应为 healthy/running）
docker compose -f docker-compose.prod.yml ps

# 探测端点
curl -sf http://localhost/healthz && echo "nginx OK"
curl -sf http://localhost:8000/health/ && echo "django OK"

# 访问：后台 http://<域名>/admin ，API 文档 /api/swagger-ui
```

### 1.8 前端静态资源与 CDN（后续）

- 初期：Nginx 容器内直接托管 `web/react/dist` 构建产物。
- 成熟期：将 `dist/` 发布至 **Cloudflare Pages**，媒体走 **Cloudflare R2**（`FILE_STORAGE=s3`），实现 CDN 卸载、降低源站压力（详见 §6）。

---

## 2. 版本更新（Version Upgrade）

> 原则：**先本地/预发跑通 → 再 Git Flow 合并 → 最后灰度更新线上**。DB 迁移必须随代码一起评审与回滚备案。

### 2.1 发布分支流程（Git Flow）

```bash
git checkout main && git pull
git checkout -b release/vX.Y.Z        # 如 release/v1.2.0
# 合并待发布内容（dev / feature）
git merge --no-ff dev
# 提交迁移文件 + 版本号变更
git add -A && git commit -m "release: vX.Y.Z"
git push -u origin release/vX.Y.Z
# 经评审后合入 main 并打 tag
git checkout main && git merge --no-ff release/vX.Y.Z
git tag -a vX.Y.Z -m "release vX.Y.Z" && git push --tags
```

### 2.2 后端更新步骤

```bash
# 1. 拉取最新代码（在宿主机项目目录）
git pull origin main

# 2. 若修改了依赖，先 rebuild 镜像（django / celery 共用 ziggner-django 镜像）
docker compose -f docker-compose.prod.yml build django-app celery-worker celery-beat

# 3. 滚动重启后端相关服务（先重启依赖最少者）
docker compose -f docker-compose.prod.yml up -d django-app celery-worker celery-beat
#   ↑ django 容器启动会自动执行 migrate + collectstatic

# 4. 如需手动控制迁移时机（大版本/危险迁移建议先手动）：
docker exec ziggner-django python manage.py migrate --noinput
docker exec ziggner-django python manage.py collectstatic --noinput --clear
```

### 2.3 前端更新步骤

```bash
# 方案 A：随 compose 重建 nginx 镜像（简单）
docker compose -f docker-compose.prod.yml build nginx
docker compose -f docker-compose.prod.yml up -d nginx

# 方案 B（推荐成熟期）：发布到 Cloudflare Pages（CI 自动），与后端解耦
#   见 .github/workflows/deploy-frontend.yml，push 到指定分支即触发
```

### 2.4 更新后验证

```bash
docker compose -f docker-compose.prod.yml ps        # 全部 healthy
curl -sf http://localhost/healthz && curl -sf http://localhost:8000/health/
docker logs --tail 50 ziggner-django                # 无报错/无迁移失败
```

### 2.5 回滚（Rollback）

```bash
# 镜像回滚：保留旧镜像 tag，重新以旧版启动
docker compose -f docker-compose.prod.yml up -d --scale django-app=0   # 停旧
# 切换镜像 tag 后：
docker compose -f docker-compose.prod.yml up -d

# 数据库回滚（谨慎！）：逆向迁移到指定版本
docker exec ziggner-django python manage.py migrate <app_name> <previous_migration>

# Git 回退
git revert <bad_commit>   # 或 git checkout <last_good_tag> 后重新部署
```

> ⚠️ DB 迁移不可逆时（如删列），回滚前务必先完成 §5.2 的离线备份。

---

## 3. Docker 容器运维操作

### 3.1 进入容器查看 MySQL

用途：排查数据、执行 SQL、确认库存/订单一致性。
进入方式：通过 `docker exec` 进入 `ziggner-db` 容器并连接 MySQL。

```bash
# 方式一：交互式进入后连接（推荐，便于多句 SQL）
docker exec -it ziggner-db bash
mysql -u root -p            # 密码 = .env.production 中 MYSQL_ROOT_PASSWORD
# 或直连业务库
mysql -u ziggner -p ziggner

# 方式二：单行直接进入 MySQL 客户端
docker exec -it ziggner-db mysql -u root -p

# 常用排查 SQL
USE ziggner;
SHOW PROCESSLIST;                                  -- 当前连接/慢查询
SHOW GLOBAL STATUS LIKE 'Slow_queries';            -- 慢查询计数
SELECT table_name, table_rows FROM information_schema.tables
  WHERE table_schema='ziggner' ORDER BY table_rows DESC;   -- 各表行数
```

> 说明：3306 端口未映射到宿主机，外部工具需通过 `ssh -L 3306:db:3306 user@host` 端口转发，或直接在容器内操作。

### 3.2 手动重启指定容器

用途：发布后重启、配置生效、卡死恢复。
进入方式：宿主机直接执行（无需进入容器）。

```bash
# 方式一：按容器名重启（最直观）
docker restart ziggner-django

# 方式二：按 compose 服务名重启（保持编排一致性）
docker compose -f docker-compose.prod.yml restart django-app

# 重启并等待健康（验证）
docker restart ziggner-django && sleep 10 && \
  docker inspect -f '{{.State.Health.Status}}' ziggner-django
```

> 注意：Django 容器重启会自动重跑 migrate，属预期行为；批量重启建议按依赖顺序（先 DB/Redis，后 Django/Celery，最后 Nginx）。

### 3.3 高频运维命令速查

```bash
# 状态与资源
docker compose -f docker-compose.prod.yml ps
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemPerc}}\t{{.MemUsage}}"

# 日志（实时跟踪 / 尾部 200 行）
docker logs -f --tail 200 ziggner-django
docker compose -f docker-compose.prod.yml logs -f django-app

# 进入任意容器执行命令
docker exec -it ziggner-django bash
docker exec -it ziggner-redis redis-cli -a "$REDIS_PASSWORD"   # 需带密码

# 停止 / 启动整组（维护窗口）
docker compose -f docker-compose.prod.yml stop
docker compose -f docker-compose.prod.yml start

# 清理（谨慎）
docker compose -f docker-compose.prod.yml down        # 停并删容器（保留卷）
docker image prune -f                                  # 删悬空镜像
```

---

## 4. 后续运维 / 日常维护

### 4.1 缓存管理（Redis）

用途：Redis 当前承担「缓存 + 分布式锁（库存预扣）」双重职责，**未开启持久化**（`--save ""`），重启即清空——仅作缓存可接受，但锁状态不可依赖其持久性。

```bash
# 连接（需密码）
docker exec -it ziggner-redis redis-cli -a "$REDIS_PASSWORD"

# 内存与容量
INFO memory          # used_memory_human / maxmemory / maxmemory_policy
DBSIZE               # key 总数
INFO stats           # 命中率：keyspace_hits / (hits+misses)

# 按前缀排查（生产慎用 KEYS，改用 SCAN）
SCAN 0 MATCH "lock:*" COUNT 100

# 清理（危险！仅缓存且确认无副作用时）
FLUSHALL             # 清空全部（会清除分布式锁，可能造成并发扣减，需业务低峰）

# 强制逐出验证
redis-cli -a "$REDIS_PASSWORD" MEMORY DOCTOR
```

维护要点：
- 监控 `maxmemory` 占用；策略为 `allkeys-lru`，内存满时自动淘汰。
- 分布式锁（库存）使用 `SET key val NX EX 900`，**禁止**将锁的可靠性建立在 Redis 持久化之上（DB 层 `version` 乐观锁为最终兜底）。
- 搜索引擎的 Redis ZSET 预计算结果，在 Redis 清空后由首次请求自动重建（L1 缓存 + L2 互斥锁防击穿）。

### 4.2 数据库维护（MySQL）

用途：备份、健康检查、慢查询治理。

```bash
# 每日离线备份（建议写入 crontab，产物传 R2）
docker exec ziggner-db sh -c \
  'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers ziggner' \
  > /backup/ziggner_$(date +%F).sql

# 健康检查
docker exec ziggner-db mysqladmin -u root -p"$MYSQL_ROOT_PASSWORD" ping

# 慢查询（已开启 long_query_time=0.5s）
docker exec -it ziggner-db bash -c "cat /var/lib/mysql/*-slow.log | tail -50"
```

维护要点：
- **当前最大风险**：仅有本地卷、**无异地备份与自动备份任务**（见 §6 P0）。
- `max-connections=30`、`innodb-buffer-pool=64M` 针对 2C4G 调优；连接数打满时优先排查连接泄漏（Gunicorn `CONN_MAX_AGE` 与 `max_requests`）。

### 4.3 日志与可观测性

- 当前：各容器 `json-file` 驱动（单文件 ≤20MB、保留 3 份），存于命名卷日志目录。
- 查看聚合日志：`docker compose ... logs -f`。
- 缺口：无集中式日志收集、无指标（Metrics）、无告警（见 §6 P1）。

### 4.4 定时与异步任务

- `ziggner-celery-beat` 通过 `DatabaseScheduler` 调度（任务存 DB，可热更新）。
- 关键任务：**订单 15 分钟未支付自动取消 + 恢复库存**（Celery 任务），是数据一致性的关键链路，需重点监控 worker 存活与积压。

```bash
# 查看 worker 状态与积压
docker exec ziggner-celery-worker celery -A project inspect active
docker exec ziggner-celery-worker celery -A project inspect reserved
```

### 4.5 TLS / 域名

- 当前 Nginx 仅监听 **80（HTTP）**，无 443。**生产必须启用 HTTPS**（Cloudflare 全站代理开启「始终使用 HTTPS」最省事，或 Nginx 自签/Let's Encrypt）。

---

## 5. 架构设计考量（大厂规范 / 长期视角）

1. **十二要素与无状态应用层**：Django/Celery 完全无状态，任何实例可随时重建；状态全部下沉到 MySQL/Redis/R2（Named Volume 隔离），满足水平扩展前提。
2. **单一职责 + 编排自治**：每容器只做一件事；`depends_on` + `healthcheck` + `restart: unless-stopped` 形成自愈闭环，故障自动拉起。
3. **资源治理优先**：单机 2C4G 下显式 `cpus`/`mem_limit` + `oom_score_adj` 分级（DB/Redis 负分优先存活，Celery 正分先被杀），**从架构上杜绝级联雪崩**。
4. **数据一致性双保险**：入口 Redis `SETNX` 分布式锁（预扣库存）+ DB 层 `version` 乐观锁（最终一致），配合 Celery 超时回滚，符合电商「少卖优于超卖」原则。
5. **安全防护纵深**：Webhook 签名校验、幂等处理、订单状态机、JWT 黑名单、应用层限流、Cloudflare Turnstile 待接入——覆盖 P0/P1 安全项。
6. **CDN 卸载与存储解耦**：静态资源与媒体本应走 Cloudflare Pages/R2，源站仅承载动态 API，是小规模团队对标大厂「边缘加速」的低成本实践。
7. **可观测性基线**：统一 `/health/` 探针与结构化日志，为后续接入 Prometheus/Grafana/Loki 预留标准接口。

---

## 6. 改进建议（迈向「麻雀虽小，五脏俱全」）

当前系统已实现核心交易链路与安全基线，但距生产级成熟度仍有缺口。按优先级给出落地建议：

### P0 — 上线前必须具备（数据安全带）

| # | 改进项 | 说明 / 做法 |
|---|---|---|
| 1 | **异地数据库备份** | 增加 `cron` 每日 `mysqldump` → 上传 Cloudflare R2；保留 7/30 天滚动。当前仅有本地卷，删卷即永久丢失。 |
| 2 | **启用 HTTPS / TLS** | Cloudflare 代理开启「始终 HTTPS」，或 Nginx 部署 certbot 证书。当前明文 80 端口不可用于生产。 |
| 3 | **密钥管理升级** | 将明文 `.env` 迁移至 Docker Secrets 或 HashiCorp Vault，compose 以 `secrets:` 挂载，杜绝密钥落盘泄露。 |
| 4 | **Redis 持久化策略确认** | 若仅作缓存维持 `--save ""` 可接受；若承担需恢复的状态，改为 RDB/AOF 并评估内存。文档化此决策。 |
| 5 | **错误追踪（Sentry）** | 接入 Sentry 捕获后端异常与前端报错，替代「看日志盲猜」。 |

### P1 — 生产成熟度（可观测与交付）

| # | 改进项 | 说明 / 做法 |
|---|---|---|
| 6 | **指标与告警** | node_exporter + 应用 `/metrics` → Prometheus → Grafana；对 CPU>70%、内存>80%、订单取消任务积压、慢查询设告警。 |
| 7 | **集中日志** | Loki + Promtail（或 Vector）收集容器日志，支持全文检索与留存策略。 |
| 8 | **后端 CI/CD** | 当前仅前端有 `deploy-frontend.yml`；补充后端：lint → test → 镜像构建 → Trivy 扫描 → 推送 → 部署。 |
| 9 | **零停机发布** | 引入蓝绿/滚动发布或至少「先起新容器健康检查通过再切流量」，消除 `up -d` 瞬时中断。 |
| 10 | **DB 迁移评审与回滚 Runbook** | 大版本迁移需 Review + 预演 + 逆向迁移脚本备案，写入发布清单。 |
| 11 | **前端 Cloudflare Pages 落地** | 将 `dist/` 发布至 Pages，源站卸载静态流量，与后端独立迭代。 |

### P2 — 精益求精（效能与韧性）

| # | 改进项 | 说明 / 做法 |
|---|---|---|
| 12 | **Nginx 层限流 + WAF** | 在反向代理层加 `limit_req` 与 Cloudflare WAF 规则，与应用层限流形成双层。 |
| 13 | **镜像漏洞扫描** | CI 中集成 Trivy，阻断高危 CVE 镜像上线。 |
| 14 | **连接池优化** | MySQL 侧引入 ProxySQL 或调优 `CONN_MAX_AGE` / Gunicorn `max_requests`，抑制连接抖动。 |
| 15 | **搜索索引自动预热** | 商品/价格变更时主动刷新 Redis ZSET，避免冷启动集中回源 MySQL。 |
| 16 | **依赖与许可证审计** | 定期 `pip-audit` / `npm audit` 并纳入 CI 门禁。 |
| 17 | **特性开关（Feature Flag）** | 小步快跑时通过配置中心灰度功能，降低回滚成本。 |

---

## 4.6 发布前环境净化检查（必做）

上线/重建前必须确认运行环境纯净，避免「文档说最小暴露面，真实盒子被遗留栈污染」的背离（曾因此导致 broker 凭证错配 + 开发栈主机暴露）：

1. 仅保留 7 个 `ziggner-*` 容器：`docker ps --format '{{.Names}}' | grep -v '^ziggner-'` 应为空。
2. 无孤儿开发栈占用 3306/6379：`docker compose -f backend/docker-compose.yml down -v`（仅删开发栈，不影响 `ziggner_*` 数据与卷）。
3. 宿主机防火墙仅放行 22/80/443；`localhost:3306`、`localhost:6379` 不可达。
4. 密钥单一来源：`.env.production` 的 `RABBITMQ_DEFAULT_PASS`/`RABBITMQ_URL` 必须与 `docker-compose.prod.yml` 中 broker 的 `RABBITMQ_DEFAULT_PASS`（源自根 `.env` 的 `RABBITMQ_PASSWORD`）完全一致。
5. 所有容器 `STATUS` 为 healthy/running，`docker stats` 无内存超 80%。

## 附录 A：常用命令一键清单

```bash
# 启动 / 停止
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml down        # 保留卷

# 重建单个服务
docker compose -f docker-compose.prod.yml up -d --build django-app

# 看 MySQL
docker exec -it ziggner-db mysql -u root -p

# 看 Redis
docker exec -it ziggner-redis redis-cli -a "$REDIS_PASSWORD" INFO memory

# 重启指定容器
docker restart ziggner-django

# 备份 DB
docker exec ziggner-db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction ziggner' > /backup/ziggner_$(date +%F).sql

# 健康检查
curl -sf http://localhost/healthz && curl -sf http://localhost:8000/health/
```

## 附录 B：故障排查速查

| 现象 | 可能原因 | 处置 |
|---|---|---|
| Nginx 起不来 / pid 报错 | 非 root 写 `/var/run` | 已通过 `nginx.conf` 将 pid 指向 `/tmp`；检查挂载是否覆盖 |
| Django 反复重启 | migrate 失败 / DB 未就绪 | `docker logs ziggner-django` 看迁移报错；确认 `ziggner-db` healthy |
| 库存超卖/少卖 | 锁或乐观锁失效 | 查 Redis 锁是否存在 + DB `version` 字段；Celery 取消任务是否运行 |
| Redis 内存打满 | 缓存无上限写入 | 确认 `maxmemory-policy=allkeys-lru`；排查异常 key |
| RabbitMQ 启动警告 | 旧版环境变量弃用 | 已改用 `rabbitmq.conf` 挂载，确认 `:ro` 配置生效 |
| 全站 502 | Django 未 healthy / Nginx upstream 错 | `docker ps` 看状态；`docker logs ziggner-nginx` |
```
