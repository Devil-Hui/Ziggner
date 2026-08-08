# Ziggner 部署总攻略（小白版）

> 全链路：**Cloudflare Workers（前端）+ 你的服务器（后端 Django）**。照着做，不要跳步。

---

## 一、三大账号要什么

| 平台 | 做什么 | 入口 |
|------|--------|------|
| **GitHub** | 存放代码，触发前端自动构建 | https://github.com |
| **Cloudflare** | 托管前端、域名 DNS、图片存储 | https://dash.cloudflare.com |
| **西部数码** | 买域名的地方（ziggner.com） | 你在西部数码的账号 |

---

## 二、前端（一次配好，永久生效）

### 2.1 代码推送到 GitHub
```bash
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
git add -A && git commit -m "update" && git push origin master
```
> 以后每次改代码，跑这三条，Cloudflare 自动重新部署。

### 2.2 Cloudflare Workers 绑定域名
入口：https://dash.cloudflare.com → Workers & Pages → `ziggner` → 设置 → 域和路由

已绑定（不用动）：
| 域名 | 用途 |
|------|------|
| `www.ziggner.com` | 商城前台 |
| `admin.ziggner.com` | 管理后台 |
| `shop.ziggner.com` | 商城（备用） |

### 2.3 前端构建变量
入口：同上项目 → 设置 → 变量和机密 → 构建变量

| 变量 | 值 |
|------|-----|
| `NODE_VERSION` | `22` |
| `VITE_API_URL` | `http://64.176.219.125:8000/api/v1` |
| `VITE_WS_URL` | `ws://64.176.219.125:8000` |

> ⚠️ HTTPS 混合内容：如果浏览器报错，装 cloudflared 隧道，把 8000 套上 HTTPS，再换成 `https://xxx.trycloudflare.com/api/v1`

---

## 三、后端（你的服务器上）

### 3.1 需要的密钥（从哪来）

| 变量 | 去哪拿 | 填到哪 |
|------|--------|--------|
| `DJANGO_SECRET_KEY` | 已填好 | `.env.production` |
| `DJANGO_SUPERUSER_PASSWORD` | 已填（强随机） | `.env.production` |
| `TURNSTILE_SECRET_KEY` | 已填真实密钥 | `.env.production` |
| `VITE_TURNSTILE_SITE_KEY` | 已填真实站点密钥 | `.env.production` |
| `R2_ACCESS_KEY_ID` | **https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2/api-tokens** | `.env.production`（已填） |
| `R2_SECRET_ACCESS_KEY` | 同上（已填） | `.env.production` |
| TLS 证书 | 已生成到 `certs/` | `.env.production` |

### 3.2 启动后端
```bash
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```
> ⚠️ 关键：必须加 `--env-file .env.production`，否则 compose 读不到配置会报错。

### 3.3 开放端口
路由器/云服务器安全组放行 **8000**（或 80/443）。

---

## 四、R2 图片存储

| 项目 | 值 |
|------|-----|
| 存储桶名 | `ziggner-r2` |
| 账户 ID | `709ab53695022c72861726f1039193b2` |
| 入口 | https://dash.cloudflare.com/709ab53695022c72861726f1039193b2/r2 |

已配置到 `.env.production`，无需再动。

---

## 五、常见问题

| 症状 | 原因 | 解决 |
|------|------|------|
| `required variable TURNSTILE_SECRET_KEY is missing` | 没填 Turnstile 密钥 | 去 Turnstile 页面创建站点，密钥填进 `.env.production` |
| 网站打不开 | DNS 传播中 | 等 5 分钟~24 小时，`nslookup www.ziggner.com 8.8.8.8` 有 IP 即生效 |
| 接口报 ERR_CONNECTION_CLOSED | 后端没起/端口没开 | 检查 `docker compose ps`，确认 8000 可访问 |
| 图片不显示 | R2 未配好 | 确认 `.env.production` 里 R2 三项填对 |
