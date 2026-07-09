# Ziggner Docker 容器化部署方案

## 架构概览

```
                 ┌────────────────────┐
                 │   Nginx :80        │  64MB  | 静态文件 + 反向代理
                 │   (Alpine)         │
                 └──────┬─────────────┘
                        │
           ┌────────────┼────────────┐
           │            │            │
    ┌──────▼──────┐ ┌──▼────────┐   │
    │ Django App  │ │  Celery   │   │
    │ Gunicorn    │ │  Worker   │   │
    │ 400MB       │ │  256MB    │   │
    └──┬───┬───┬──┘ └────┬──────┘   │
       │   │   │         │          │
  ┌────▼┐ ┌▼──▼┐  ┌─────▼──────┐   │
  │MySQL│ │Redis│  │ RabbitMQ   │   │
  │256MB│ │200MB│  │   128MB    │   │
  └─────┘ └────┘  └────────────┘   │
                                    │
                          ┌─────────▼──────┐
                          │  Celery Beat   │
                          │    128MB       │
                          └────────────────┘

总预留内存: ~1.43 GB | OS+Docker: ~500MB | 剩余余量: ~2GB
```

## 内存分配策略


## Gunicorn 配置 (2 vCPU)

```
workers = 2          # 2个worker，每个约120-150MB
threads = 4          # 每worker 4线程 → 8并发连接
preload_app = True   # 预加载，fork共享代码段 (~30MB节省)
max_requests = 1000  # 1000请求后重启，防内存泄漏
timeout = 120s       # 允许批量导入等慢操作
```

**并发计算**: 100用户 × 5s思考间隔 = 20 req/s → 8并发连接足够


## 文件清单

```
Ziggner/
├── docker-compose.prod.yml      ← 生产编排（7服务）
├── .env                         ← Docker Compose 环境变量
├── .env.production              ← 应用环境变量模板
├── backend/
│   ├── Dockerfile.prod          ← Django 多阶段构建
│   ├── Dockerfile               ← 旧版（保留不删）
│   ├── setup.sh                 ← 多服务入口脚本（已更新）
│   ├── .dockerignore
│   ├── project/gunicorn.conf.py ← Gunicorn 生产配置
│   └── utils/storage.py         ← 文件存储（已清理 COS/OSS）
└── web/react/
    ├── Dockerfile               ← React 多阶段构建
    ├── nginx/default.conf       ← Nginx 生产配置
    ├── package.json             ← 前端依赖（新创建）
    ├── vite.config.ts           ← Vite 构建配置
    ├── tsconfig.json
    └── .dockerignore
```

## Cloudflare R2 配置指南

### 步骤 1：创建 R2 Bucket
1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 左侧菜单 → **R2** → **Create bucket**
3. Bucket 名称: `ziggner-media`
4. 位置: 选择最近的区域（亚太）

### 步骤 2：创建 API Token
1. R2 页面 → **Manage R2 API Tokens** → **Create API Token**
2. 权限: **Object Read & Write**
3. 选择刚创建的 bucket
4. 记录:
   - **Access Key ID** (看起来像 `abc123...`)
   - **Secret Access Key** (看起来像 `xyz789...`)
   - **Account ID** (在 R2 概览页右侧)

### 步骤 3：设置公共访问（可选）
如果想要直接通过 URL 访问图片:
1. Bucket → **Settings** → **Public Access**
2. 启用 **R2.dev subdomain**
3. 允许 `https://pub-xxx.r2.dev`

### 步骤 4：配置 .env.production
```env
FILE_STORAGE=r2
R2_ACCOUNT_ID=你的Account ID
R2_ACCESS_KEY_ID=你的Access Key ID
R2_SECRET_ACCESS_KEY=你的Secret Access Key
R2_BUCKET=ziggner-media
R2_PUBLIC_URL=https://pub-xxx.r2.dev/ziggner-media
```

## 部署命令

```bash
# 1. 进入项目目录
cd Ziggner

# 2. 配置环境变量
cp .env.production .env.production.local
# 编辑 .env.production.local，填入真实密码和密钥

# 3. 构建并启动所有服务
docker compose -f docker-compose.prod.yml up -d --build

# 4. 查看服务状态
docker compose -f docker-compose.prod.yml ps

# 5. 查看日志
docker compose -f docker-compose.prod.yml logs -f django-app

# 6. 创建超级管理员
docker compose -f docker-compose.prod.yml exec django-app python manage.py createsuperuser

# 7. 停止服务
docker compose -f docker-compose.prod.yml down
```

## 日常运维

```bash
# 滚动更新（零停机）
docker compose -f docker-compose.prod.yml up -d --build django-app

# 单独重启某个服务
docker compose -f docker-compose.prod.yml restart celery-worker

# 查看资源使用
docker stats --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"

# 清理旧镜像
docker image prune -a --filter "until=24h"
```

## 镜像体积估算

| 镜像 | 预估大小 |
|------|:---:|
| ziggner-nginx (前端+Nginx) | ~30MB |
| ziggner-django (后端) | ~250MB |
| MySQL 8.0 | ~550MB (官方) |
| Redis 7 Alpine | ~30MB |
| RabbitMQ Alpine | ~100MB |
