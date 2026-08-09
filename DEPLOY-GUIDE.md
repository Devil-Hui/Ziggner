# Ziggner 部署完全指南

> 代码仓库：**[github.com/Devil-Hui/Ziggner](https://github.com/Devil-Hui/Ziggner)**（master 分支）
> 网站架构：**前端 → Cloudflare Workers（免费） | 后端 → 你的电脑（Docker） | 图片 → R2 | 域名 → 西部数码买，DNS 交 Cloudflare**

---

## 0. 克隆代码 + 创建 Workers 项目

### 0.1 克隆代码
```bash
git clone git@github.com:Devil-Hui/Ziggner.git
cd Ziggner
```

### 0.2 创建 Cloudflare Workers 项目
[打开 Workers & Pages](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages) → **创建** → **Pages** → **连接到 Git**

- 选 `Devil-Hui/Ziggner` → **开始设置**
- 构建命令：`npm install && npm run build`
- 部署命令：`npx wrangler deploy`
- 根目录：`/web/react`
- **保存并部署**

> ⚠️ 创建的是 **Workers** 项目（不是 Pages！Cloudflare 新版统一了入口，从 Workers & Pages 进去，选「Workers」类型）

### 0.3 配构建变量
[项目设置](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages/view/ziggner/settings) → 变量和机密 → 构建变量：

| 变量 | 值 |
|------|-----|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | `https://你的后端地址/api/v1` |
| `VITE_WS_URL` | `wss://你的后端地址` |
| `VITE_TURNSTILE_SITE_KEY` | Turnstile 站点密钥（见第 5 步） |

> `你的后端地址` 先用 `xxx.trycloudflare.com`（第 7 步启动隧道获得），后续可升级为永久 `api.ziggner.com`

---

## 1. 西部数码 — 改 NS（✅ 已完成）

让全世界知道 `ziggner.com` 的 DNS 归 Cloudflare 管。

**操作**：登录 [西部数码](https://www.west.cn) → 域名管理 → `ziggner.com` → DNS 修改

```
howard.ns.cloudflare.com
mary.ns.cloudflare.com
```

**验证**：`nslookup -type=NS ziggner.com` 返回 howard/mary = 成功

---

## 2. Cloudflare 站点 — 激活（✅ 已完成）

[打开 Cloudflare 控制台](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/ziggner.com)

- **添加站点** → 输入 `ziggner.com` → Free 计划 → 自动扫描 DNS → 继续
- 等 zone 状态变 **活跃 Active**（通常 5 分钟～几小时）
- DNS 记录页留存邮件记录（imap/mail/smtp），删掉无关记录

**验证**：右上角状态 = 活跃 Active = 成功

---

## 3. Cloudflare Workers 自定义域（✅ 已完成）

绑定 `www`/`admin`/`shop` → Worker `ziggner`。

**操作**：[域和路由](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages/view/ziggner/settings/domains) → 添加域名：

```
www.ziggner.com
admin.ziggner.com
shop.ziggner.com
```

> ⚠️ 如果提示"already has DNS records"，先删掉 DNS 页面里对应的 CNAME 记录，再回来绑定。

**验证**：`https://www.ziggner.com` 能打开商城 = 成功

---

## 4. Cloudflare R2 图片存储（✅ 已完成）

商品图片免费存 R2（10GB），全球 CDN 加速。

**4.1 创建存储桶**：[R2](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2) → 创建存储桶 → 名称 `ziggner-r2`

**4.2 创建 API 令牌**：[管理 R2 API 令牌](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2/api-tokens) → 创建 → 权限「对象读和写」→ 存储桶指定 `ziggner-r2`

> 复制 Access Key ID + Secret Key，填入 `.env.production`：
> ```
> R2_ACCESS_KEY_ID=你的Key
> R2_SECRET_ACCESS_KEY=你的Secret
> ```

**4.3 绑定自定义域名**：[桶设置](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2/default/buckets/ziggner-r2) → 设置 → 自定义域 → `cdn.ziggner.com` → 连接

**验证**：`nslookup cdn.ziggner.com` 返回 Cloudflare IP = 成功

---

## 5. Cloudflare Turnstile 人机验证（✅ 已完成）

登录/注册出现"勾选"验证，防垃圾注册。

**操作**：[Turnstile](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/turnstile) → 添加站点 → 域名白名单（**必须逐个填**，不支持 `*.ziggner.com`）：

```
ziggner.huigeli666.workers.dev
www.ziggner.com
admin.ziggner.com
shop.ziggner.com
localhost
127.0.0.1
```

> 复制站点密钥 + 密钥，填入 `.env.production`：
> ```
> VITE_TURNSTILE_SITE_KEY=你的站点密钥
> TURNSTILE_SECRET_KEY=你的密钥
> ```

**验证**：打开 `https://www.ziggner.com/admin/login` → 出现验证勾选框 = 成功

---

## 6. 本机 Docker 后端（日常启动）

```bash
cd D:\下载\浏览器下载\change\Ziggner\Ziggner

# 启动（只需这一条）
docker compose -f docker-compose.prod.yml --env-file .env.production up -d

# 迁移数据库
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app python manage.py migrate

# 创建超管（首次）
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app python manage.py createsuperuser
```

**验证**：`docker compose -f docker-compose.prod.yml --env-file .env.production ps` 全部 healthy = 成功

---

## 7. 本机 cloudflared 隧道（日常启动）

不依赖公网 IP，Cloudflare 主动连到你的电脑。

**下载**：`curl -L -o cloudflared.exe https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe`

**启动**：
```bash
cloudflared.exe tunnel --url https://127.0.0.1:443 --no-tls-verify --no-autoupdate
```

会显示 `https://xxx.trycloudflare.com` → 复制这个地址。

**让前端连上**：把隧道地址填到 [Cloudflare 构建变量](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages/view/ziggner/settings)：
- `VITE_API_URL` = `https://xxx.trycloudflare.com/api/v1`
- `VITE_WS_URL` = `wss://xxx.trycloudflare.com`

> ⚠️ 隧道地址重启会变，变了就更新一次构建变量。想一劳永逸升级永久 `api.ziggner.com`，单独找我。

**验证**：`https://www.ziggner.com` 能加载商品数据 = 前后端完整链路通

---

## 8. 三个 env 文件

| 文件 | 放什么 | Git |
|------|--------|:---:|
| `.env` | 本地调试 | ❌ |
| `.env.production` | 真实密钥 | ❌ |
| `web/react/.env.production` | 前端构建变量 | ✅ |

**`.env.production` 必须手动创建**（gitignore 保护，不会随仓库下载），样式参考：

```
DJANGO_SECRET_KEY=你的密钥
DJANGO_ENV=prod
DJANGO_SUPERUSER_USERNAME=admin
DJANGO_SUPERUSER_PASSWORD=你的密码
ALLOWED_HOSTS=localhost,127.0.0.1,.trycloudflare.com,.workers.dev,.ziggner.com
CORS_ORIGINS=https://www.ziggner.com,https://ziggner.huigeli666.workers.dev
R2_ACCOUNT_ID=你的账户ID
R2_ACCESS_KEY_ID=你的Key
R2_SECRET_ACCESS_KEY=你的Secret
TURNSTILE_SECRET_KEY=你的密钥
VITE_TURNSTILE_SITE_KEY=你的站点密钥
# ... 邮件等其他配置
```

---

## 9. 更新代码（日常）

```bash
git add -A
git commit -m "描述"
git push origin master
```

Cloudflare 自动检测 → 构建 → 部署（2-3 分钟）。只改后端代码需重建容器：
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build django-app
```

---

## 10. 排查速查表

| 症状 | 原因 | 解决 |
|------|------|------|
| 网页 522 | 自定义域没绑定到 Worker | [域和路由](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages/view/ziggner/settings/domains) 删掉重加 |
| 网页打不开 | NS 没改或 zone 未激活 | 西部数码改 howard/mary → 等 zone Active |
| 接口 405 | 前端 API 地址不对 | [构建变量](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/workers-and-pages/view/ziggner/settings) 改 VITE_API_URL |
| `Mixed Content` | HTTPS 页面调 HTTP 后端 | 隧道用 `https://` 或用永久 `api.ziggner.com` |
| 图片不显示 | R2 域名没绑 | [R2 设置](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2/default/buckets/ziggner-r2) 绑 cdn.ziggner.com |
| 验证码报错 | 域名不在 Turnstile 白名单 | [Turnstile](https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/turnstile) 加域名 |
| docker 报错 | 没加 `--env-file` | 必须 `-f docker-compose.prod.yml --env-file .env.production` |
