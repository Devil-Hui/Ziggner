# Ziggner 部署与开发指南（小白版）

> 适合 Docker 新手和刚接手项目的人，每一步都带命令，照着敲就行。

---

## 目录
1. [环境要求](#环境要求)
2. [Docker 构建镜像](#1-docker-构建镜像)
3. [启动全部服务](#2-启动全部服务)
4. [进入 MySQL 容器查看数据库](#3-进入-mysql-容器查看数据库)
5. [创建超级管理员](#4-创建超级管理员)
6. [数据库迁移](#5-数据库迁移)
7. [启动前后端](#6-启动前后端)
8. [更新代码后的操作步骤](#7-更新代码后的操作步骤)
9. [常用命令速查](#常用命令速查)
10. [商城前端（React 商城页面）](#10-商城前端react-商城页面)
11. [localhost:8000 打不开排查](#11-localhost8000-打不开排查)

---

## 环境要求

```
docker --version   # 需要 >= 27
```

---

## 1. Docker 构建镜像

```bash
# 进入项目根目录（有 docker-compose.yml 的地方）
cd D:/下载/浏览器下载/change/Ziggner/Ziggner

# 构建所有镜像（首次约 3-5 分钟，后续有缓存会更快）
docker compose build
```

构建成功后你会看到 5 个容器：

| 容器 | 作用 |
|------|------|
| db | MySQL 8.0 数据库 |
| redis | 缓存 + 消息队列 |
| web | Django 后端（API + 后台） |
| celery_worker | 异步任务 + 定时调度（已合并 beat） |
| frontend | 商城前端（vite dev，`localhost:12700`） |

---

## 2. 启动全部服务

```bash
# 启动所有容器（后台运行）
docker compose up -d
```

验证所有容器都在跑：
```bash
docker compose ps
```
预期输出 5 个容器状态都是 `Up` + MySQL/Redis 显示 `(healthy)`。

验证 Django 是否就绪：
```bash
curl http://localhost:8000/health/
# 返回 {"status":"ok","database":"up","redis":"up"} 表示一切正常
```

---

## 3. 进入 MySQL 容器查看数据库

### 3.1 进入容器交互式 MySQL

```bash
# 第一步：进 db 容器
docker compose exec db bash

# 第二步：在容器内连接 MySQL（提示输密码时，敲 .env 里 DB_ROOT_PASSWORD 的值）
mysql -uroot -p
```

进入 MySQL 后：
```sql
USE backend;
SHOW TABLES;
```

---

## 4. 数据库迁移 + 创建超级管理员

```bash
# 第一步：进 web 容器
docker compose exec web bash

# 第二步：执行迁移（每次重建容器后都要跑一次）
python manage.py migrate

# 第三步：创建超级管理员，按提示输入用户名、邮箱、密码
python manage.py createsuperuser
```


---

## 5. 启动前后端

### 开发模式（当前默认，Django 直出，无 Nginx）
```bash
docker compose up -d
```
启动后访问入口：

| 网址 | 是什么 | 怎么启动 |
|------|--------|----------|
| `http://localhost:8000/admin/` | **Django 后台管理**（超管增改按钮在这） | `docker compose up -d` 已包含 |
| `http://localhost:8000/api/swagger-ui/` | API 接口文档 | 同上 |
| `http://localhost:8000/health/` | 健康检查 | 同上 |
| `http://localhost:12700` | **商城前台（dev 商城页面）** | 需另跑 `cd web/react && npm run dev` |

> ⚠️ **8000 是后端（API + 后台），没有被改成 12700**；12700 是商城前端。根路径 `http://localhost:8000/` 显示 404 是正常的（只有 `admin/`、`health/`、`api/*` 有页面，详见第 11 节）。

### 生产模式（带 Nginx + TLS）
```bash
# 需要先准备 TLS 证书 + 设置以下环境变量：
# APP_VERSION、GIT_COMMIT、VITE_TURNSTILE_SITE_KEY、TLS_CERT_PATH、TLS_KEY_PATH

docker compose -f docker-compose.prod.yml up -d --build
```
访问：https://你的域名/（Nginx 转发 80/443）

### 关闭所有服务
```bash
docker compose down          # 停止+删除容器，保留数据卷
docker compose down -v       # 停止+删除容器+删除数据卷（⚠️ 数据库数据会丢失）
```

---

## 6. 更新代码后的操作步骤

当你修改了代码后，按以下步骤更新：

### 7.1 只改了 Python/HTML/JS 代码（无需重建镜像）
开发模式下使用了卷挂载（`. :/backend`），代码修改**实时生效**。
```bash
docker compose restart web            # 重启 Django
docker compose restart celery_worker  # 重启异步任务（如有改动）
```

### 7.2 改了 Dockerfile 或依赖（需要重建）
```bash
docker compose build          # 重建镜像
docker compose up -d          # 重新创建容器
```

### 7.3 改了 setup.sh 或数据库模型
```bash
docker compose up -d web      # setup.sh 会自动执行 migrate
```

### 7.4 完全从零重来（清空所有数据）
```bash
docker compose down -v        # ⚠️ 删除数据库数据
docker compose build          # 重建镜像
docker compose up -d          # 重新启动（自动初始化）
```

---

## 常用命令速查

```bash
# 查看日志
docker compose logs web                # Django 日志
docker compose logs celery_worker      # Celery 日志
docker compose logs -f web            # 实时跟踪日志

# 进入容器内部
docker compose exec web bash           # 进入 Django 容器
docker compose exec db bash            # 进入 MySQL 容器

# 重启服务
docker compose restart web             # 重启 Django
docker compose restart celery_worker   # 重启 Celery

# 查看资源占用
docker stats

# Django 管理命令
docker compose exec web python manage.py shell          # Django 交互式 shell
docker compose exec web python manage.py showmigrations # 查看迁移状态
docker compose exec web python manage.py collectstatic  # 收集静态文件

# 环境变量
# 项目配置在 .env（本地开发）和 .env.production（生产部署）
# 修改后需重启对应服务生效
```

---

> **提示**：如果你遇到 `connection refused` 错误，先等 30 秒让 Django 完成初始化（首次启动需要 migrate + collectstatic）。用 `docker compose logs web | tail` 查看进度。

---

## 10. 商城前端（React 商城页面，已 Docker 化）

⚠️ **重要**：`http://localhost:8000` 是**后端 API + Django 后台**，**不是商城页面**。商城前台（`web/react/`）现已做成 Docker 服务，**无需在宿主机装 Node / 跑 npm**，一条命令前后端一起起。所有访问入口见第 5 节的「启动后访问入口」表。

### 10.1 开发模式（推荐，已容器化）

在仓库根目录直接执行（首次会构建前端镜像，国内已配淘宝镜像，耐心等几分钟）：

```bash
docker compose up -d --build
```

启动后浏览器打开 **http://localhost:12700** 就是商城页面（前端容器名 `frontend`，已自动把 `/api`、`/media` 代理到后端 `web:8000`）。

常用操作：
- 看前端日志：`docker compose logs frontend`
- 只停前端：`docker compose stop frontend`
- **改了 `package.json` 依赖后**：`docker compose build frontend` 再 `up`（否则镜像里的依赖不会更新）

> ✅ `web/react/src` 下的代码改动会通过「源码挂载 + HMR」自动热更新，**不用重建镜像**。

### 10.2 生产模式（构建后由 Nginx 托管）

生产用 `docker-compose.prod.yml` 的 nginx 容器托管 `dist/`，对外访问 `http://localhost`（或 `https://域名`）。

---

## 11. localhost:8000 打不开排查

按下面顺序逐项检查，基本能定位 99% 的问题：

### ① 容器有没有起来
```bash
docker compose ps
```
确认 `web` 服务状态是 `Up`（不是 `Exit`/`Restarting`）。如果没起来，看日志：
```bash
docker compose logs web
```
常见启动失败：`migrate` 报错（数据库连接）、`collectstatic` 失败。先把报错贴出来对症处理。

### ② 首次启动要等一会儿
`web` 启动时会自动跑 `migrate + rbac 初始化 + collectstatic`，首次约 30~60 秒。
期间访问会 `connection refused`，属于正常，等它就绪即可。

### ③ 用健康检查确认后端真在监听
```bash
curl http://localhost:8000/health/
# 正常返回：{"status":"ok","database":"up","redis":"up"}
```
- 能返回 → 后端没问题，问题在浏览器/地址（确认是 `http://` 不是 `https://`）。
- `curl: (52) Empty reply` / `Failed to connect` → 端口没监听，回看 ①②。

### ④ 确认端口映射
`backend/docker-compose.yml` 的 `web` 已配置 `ports: ["8000:8000"]`，本机 `localhost:8000` 应可直达容器内 8000。
若你改过端口或用了自定义 compose，核对一下映射。

### ⑤ 三个关键网址（务必记牢）
`http://localhost:8000` 是**后端（API + 后台）**，不是商城页面。常用入口：

| 网址 | 是什么 |
|------|--------|
| `http://localhost:8000/admin/` | Django 后台管理（超管增改按钮在这） |
| `http://localhost:8000/api/swagger-ui/` | API 接口文档 |
| `http://localhost:12700` | 商城前台（dev，需 `npm run dev`） |

> ⚠️ `http://localhost:8000/`（根路径）显示 404 是正常的——根路径没有挂任何页面，只有 `health/`、`admin/`、`api/*`。不要直接开根路径。

### ⑥ 仍打不开
贴出以下信息再问：
```bash
docker compose ps
docker compose logs web --tail 50
curl -v http://localhost:8000/health/
```

### ⑦ 前端商城 12700 拒绝访问（connection refused）

`12700` 是**前端容器（`frontend`）**暴露的端口，已在 Docker 里。`拒绝访问` = 该容器没起来或没在监听，按下面排查：

1. **容器起了没**：
   ```bash
   docker compose ps
   ```
   看 `frontend` 状态是否 `Up`。若是 `Exit` / `Restarting`，看日志定位：
   ```bash
   docker compose logs frontend
   ```
   常见原因：首次构建 `npm install` 较慢（国内已配淘宝镜像，多等几分钟）、或 `node_modules` 匿名卷异常。

2. **改过 `package.json` 没重建**：依赖变了需 `docker compose build frontend` 再 `up`。

3. **后端要先跑着**：`web` 服务状态 `Up`，否则页面能开但接口连不上 `web:8000`，数据加载不出来。

成功标志：`docker compose logs frontend` 出现 `Local: http://localhost:12700/`。

## 12. Cloudflare Pages 部署（推荐，前端外包到免费 CDN）

把 React 前端静态文件部署到 **Cloudflare Pages**（免费），机器只跑后端（Django+MySQL+Redis+Celery），前端不占机器资源。

### 涉及的文件（已改好）

| 文件 | 作用 |
|------|------|
| `web/react/.env.production` | `VITE_API_URL` / `VITE_WS_URL` — 指向你的后端域名 |
| `web/react/src/pages/Chat/Chat.tsx` | WebSocket 支持自定义域名（`VITE_WS_URL` 环境变量） |
| `web/react/nginx/default.conf` | 已简化——不再托管前端静态文件，只做 API 代理 |
| `.env.production` | `CORS_ORIGINS` 需加入 Cloudflare Pages 域名 |

### 部署步骤

1. **改 `web/react/.env.production`**：把 `你的后端域名` 替换为真实后端域名
2. **改 `.env.production`**：`CORS_ORIGINS` 追加 Cloudflare Pages 域名（逗号分隔）
3. **构建前端**：`cd web/react && npm run build`（产物在 `dist/`）
4. **推上 Cloudflare Pages**：连接 GitHub 自动构建，或手动上传 `dist/`
5. **启动后端**：`docker compose -f docker-compose.prod.yml up -d`
6. 浏览器开 Cloudflare Pages 给你的域名 → **商城页面走 CDN，API 回源到你的机器**

> dev 开发模式不动：`docker compose up -d --build` 仍然本地跑全部。

