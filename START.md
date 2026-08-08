# Ziggner 部署与开发指南（小白版）

> 适合 Docker 新手和刚接手项目的人，每一步都带命令，照着敲就行。

---

## 目录
1. [两种模式总览](#1-两种模式总览)
2. [环境要求](#2-环境要求)
3. [开发模式（本地调试）](#3-开发模式本地调试)
4. [生产模式（对外部署，推荐）](#4-生产模式对外部署推荐)
5. [数据库迁移 + 创建超级管理员](#5-数据库迁移--创建超级管理员)
6. [更新代码后的操作步骤](#6-更新代码后的操作步骤)
7. [常用命令速查](#7-常用命令速查)
8. [前端部署（Cloudflare）](#8-前端部署cloudflare)
9. [域名规划](#9-域名规划)
10. [图片存储（R2 对象存储）](#10-图片存储r2-对象存储)
11. [邮件配置](#11-邮件配置)
12. [Cloudflare Turnstile 人机验证](#12-cloudflare-turnstile-人机验证)
13. [常见问题排查](#13-常见问题排查)

---

## 1. 两种模式总览

| | 开发模式（dev） | 生产模式（prod）⚠️ 现在主要用这个 |
|---|---|---|
| compose 文件 | `docker-compose.yml` | `docker-compose.prod.yml` |
| 环境变量文件 | `.env` | `.env.production`（**必须 --env-file 指定**） |
| 服务名 | `web` / `frontend` / `celery_worker` / `db` / `redis` | `django-app` / `nginx` / `celery-worker` / `celery-beat` / `db` / `redis` |
| 前端 | 本地 vite（localhost:12700） | **Cloudflare（不占机器）** |
| 后端入口 | `localhost:8000` | nginx 80/443 |

> ⚠️ **记住**：生产模式服务名是 `django-app`，不是 `web`！

---

## 2. 环境要求

```
docker --version   # 需要 >= 27
```

---

## 3. 开发模式（本地调试）

```bash
cd D:/下载/浏览器下载/change/Ziggner/Ziggner
docker compose up -d --build
```

访问入口：

| 网址 | 是什么 |
|------|--------|
| `http://localhost:8000/admin/` | Django 后台管理 |
| `http://localhost:8000/api/swagger-ui/` | API 接口文档 |
| `http://localhost:12700` | 商城前台（vite dev） |

> `web/react/src` 代码改动自动热更新，不用重建镜像。

---

## 4. 生产模式（对外部署，推荐）

### 4.1 启动（关键：必须带 --env-file）

```bash
cd D:/下载/浏览器下载/change/Ziggner/Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

> ⚠️ **不写 `--env-file .env.production` 会直接报错**（找不到 `TURNSTILE_SECRET_KEY` 等变量）。这是最常见的启动失败原因。

### 4.2 验证

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
# 6 个容器全部 Up，db/redis/django-app 显示 healthy
```

### 4.3 本机测试

```bash
curl http://127.0.0.1/healthz          # nginx 入口，200
curl -k https://127.0.0.1/healthz      # TLS 入口，200
```

---

## 5. 数据库迁移 + 创建超级管理员

> 生产模式进容器的命令和 dev 不一样！

### 5.1 生产模式（django-app）

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app bash
# 进入容器后：
python manage.py migrate            # 迁移（每次改模型后跑）
python manage.py createsuperuser    # 创建超管（首次）
```

### 5.2 开发模式（web）

```bash
docker compose exec web bash
python manage.py migrate
python manage.py createsuperuser
```

---

## 6. 更新代码后的操作步骤

### 只改了 Python 代码（需要重建镜像，代码是 COPY 进镜像的）

```bash
git push origin master                          # 先推代码（Cloudflare 自动部署前端）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build django-app
```

### 改了依赖（requirements.txt）

```bash
# 同上，--build 会自动重新 pip install
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build django-app
```

### 只改前端代码

```bash
git add -A && git commit -m "xxx" && git push origin master
# Cloudflare 自动构建部署（2-3 分钟），不用动服务器
```

---

## 7. 常用命令速查

### 生产模式（推荐记住这套）

```bash
# 启动/重启
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
docker compose -f docker-compose.prod.yml --env-file .env.production restart django-app

# 查看日志
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f django-app

# 进入容器
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec db bash

# 重建（改代码/依赖后）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build django-app

# Django 管理
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app python manage.py shell
```

### 开发模式

```bash
docker compose up -d
docker compose logs -f web
docker compose exec web bash
```

---

## 8. 前端部署（Cloudflare）

前端已托管在 **Cloudflare Workers**（免费 CDN），机器只跑后端。

| 项 | 值 |
|----|-----|
| 线上地址 | `https://ziggner.huigeli666.workers.dev` |
| 部署方式 | `git push origin master` → Cloudflare 自动构建 |
| 构建命令 | `npm install && npm run build` |
| 部署命令 | `npx wrangler deploy`（Workers 静态资产） |
| 关键配置 | `web/react/wrangler.toml`：`[assets] directory = "./dist/"` + `not_found_handling = "single-page-application"`（SPA 路由必需） |

> ⚠️ **推代码走 master 分支**（Cloudflare 生产分支 = master）。其他分支构建只出预览不上线。

### 前端构建变量（Cloudflare 控制台设置）

| 变量 | 值 |
|------|-----|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | 后端 API 地址（如隧道地址）`/api/v1` |
| `VITE_WS_URL` | 后端 WebSocket 地址 |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile 站点密钥 |

---

## 9. 域名规划

| 域名 | 用途 | 状态 |
|------|------|------|
| `ziggner.huigeli666.workers.dev` | 商城前台（当前可用） | ✅ |
| `www.ziggner.com` | 商城前台（正式） | DNS 传播中 |
| `admin.ziggner.com` | 管理后台 | DNS 传播中 |
| `shop.ziggner.com` | 商城备用入口 | DNS 传播中 |
| `cdn.ziggner.com` | **图片 CDN（R2 自定义域）** | 需在 R2 桶绑定 |

> `ziggner.com` 的 nameserver 已迁到 Cloudflare（`lia/jason.ns.cloudflare.com`），DNS 记录在 Cloudflare 管理。绑定 R2 自定义域需等 zone 状态变 **Active**。

---

## 10. 图片存储（R2 对象存储）

图片已启用 **Cloudflare R2**（对象存储），不占服务器磁盘。

| 项 | 值 |
|----|-----|
| 存储桶 | `ziggner-r2` |
| 后端 | `django-storages` S3Boto3Storage |
| 图片 URL | `https://cdn.ziggner.com/media/...` |
| 数据库 | 只存 URL 字符串（`main_image` 等字段），不存二进制 |

> R2 配置在 `.env.production`（`R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` / `R2_PUBLIC_URL`）。凭据齐全时 prod 自动启用 R2，否则回退本地磁盘。

---

## 11. 邮件配置

双通道 SMTP（配置在 `.env.production`）：

| 通道 | 邮箱 | 用途 | SMTP |
|------|------|------|------|
| **ADMIN** | `huigeli666@gmail.com` | 后台通知、告警、密码重置 | Gmail 465 SSL |
| **USER** | `ziggner_team_hui@outlook.com` | 用户注册验证码、订单通知 | Outlook 587 TLS |

> 邮件模板可在管理后台 → 系统安全 → 邮件模板 在线编辑（数据库存储，改完即生效）。

---

## 12. Cloudflare Turnstile 人机验证

- 用户登录/注册页、管理后台登录页都有 Turnstile 验证
- 密钥在 `.env.production`（`VITE_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY`）
- **widget 域名白名单**必须在 Cloudflare Turnstile 控制台配置（不支持通配符，逐个填）：
  `ziggner.huigeli666.workers.dev`、`ziggner.com`、`www/admin/shop.ziggner.com`、`localhost`、`127.0.0.1`
- 后端域名**不需要**配白名单（siteverify 是服务器间请求）

---

## 13. 常见问题排查

### ① 启动报 `TURNSTILE_SECRET_KEY is missing`
→ 忘了 `--env-file .env.production`。正确命令见第 4.1 节。

### ② `service "web" is not running`
→ 你跑的是生产模式，服务名是 `django-app` 不是 `web`。用第 5.1 节的命令。

### ③ 前端更新了但页面没变
→ 浏览器缓存。`Ctrl+Shift+R` 强刷或开无痕窗口。线上确认是否最新：访问 `https://ziggner.huigeli666.workers.dev` 看页面内容。

### ④ `www.ziggner.com` 打不开
→ DNS 还在传播（nameserver 刚切到 Cloudflare）。等 zone 状态变 Active（几分钟到几小时）。期间用 `ziggner.huigeli666.workers.dev`。

### ⑤ 图片不显示
→ 确认 `cdn.ziggner.com` 已在 R2 桶绑定自定义域，且 zone 是 Active。绑定后新上传的图片 URL 走 CDN。

### ⑥ 图片上传后浏览器 403
→ R2 桶没开公开访问。桶设置 → 自定义域绑定 `cdn.ziggner.com`。

### ⑦ 登录页 Turnstile 报"无法完成验证"
→ widget 域名白名单没包含当前访问域名。去 Cloudflare Turnstile 控制台补域名（见第 12 节）。

### ⑧ 本机后端 8000 通了但公网访问不了
→ 这台机器在家庭/内网，没有公网可达性。用 Cloudflare Tunnel 暴露：
```bash
cloudflared tunnel --url https://127.0.0.1:443 --no-tls-verify
```
得到的 `https://xxx.trycloudflare.com` 填到前端 `VITE_API_URL`。
