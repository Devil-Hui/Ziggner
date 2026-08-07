# Cloudflare 网页点击教程（Ziggner 上线用）

> 目标：跟着点，给你的域名免费加上 **HTTPS 证书 + CDN 加速 + DDoS 防护**。
> 全程在浏览器操作，不用改任何代码。预计 15~30 分钟（大部分时间在等 DNS 生效）。
> Cloudflare 后台语言可能显示中文或英文，下面**中英都标了**，按你看到的点。

---

## 准备（开始前先有这两样）
1. 一个已购买的域名（如在阿里云/腾讯云/GoDaddy 买的）。
2. 你的服务器**公网 IP**（部署 Ziggner 的那台机器的外网 IP）。

---

## 第 1 步：注册并添加站点

1. 打开 **https://dash.cloudflare.com** ，用邮箱注册/登录。
2. 首页点 **「Add a Site」/「添加站点」**。
3. 输入框里填你的域名（例如 `ziggner.com`），点 **「Continue」/「继续」**。
4. 选套餐页点 **「Free」/「免费」**，再点 **「Continue」/「继续」**。

---

## 第 2 步：把域名的 NS 改成 Cloudflare 的（关键）

> 这一步在**你的域名注册商后台**做，不在 Cloudflare 里。

1. Cloudflare 会列出两个 NS 服务器，类似：
   ```
   xxx.ns.cloudflare.com
   yyy.ns.cloudflare.com
   ```
   把它们**复制**下来。
2. 打开你买域名的网站（阿里云/腾讯云等）→ 域名管理 → **修改 DNS / 修改 NameServer（NS）**。
3. 把原来的 NS 换成上面复制的两个，保存。
4. 回到 Cloudflare 页面，点 **「Check nameservers」/「检查名称服务器」**。
5. 看到 **「Active」/「已激活」** 或收到激活邮件，才算完成（可能等几分钟到一天）。

---

## 第 3 步：DNS 页面 —— 加解析记录 + 开代理（最重要）

1. 左侧菜单点 **「DNS」→「Records」/「记录」**。
2. 点右上角 **「Add record」/「添加记录」**，填第一条：
   | 字段 | 填什么 |
   |------|--------|
   | Type / 类型 | 选 **A** |
   | Name / 名称 | 填 **@**（代表根域名） |
   | IPv4 address / 内容 | 填你的**服务器公网 IP** |
   | Proxy status / 代理状态 | 点一下变成 **「Proxied」/「已代理」**（橙色云 ☁️） |
   | TTL | 默认（Auto）即可 |
   然后点 **「Save」/「保存」**。
3. 再点 **「Add record」/「添加记录」** 加第二条（让 `www` 也生效）：
   | 字段 | 填什么 |
   |------|--------|
   | Type / 类型 | 选 **A** |
   | Name / 名称 | 填 **www** |
   | IPv4 address / 内容 | 填同一个**服务器公网 IP** |
   | Proxy status / 代理状态 | 同样点成 **「Proxied」/「已代理」**（橙色云 ☁️） |
   点 **「Save」/「保存」**。

> ⚠️ **代理状态必须是橙色云（Proxied）**，才会走 CDN + 免费 TLS。如果是灰色云（仅 DNS），TLS 得你自己解决。

---

## 第 4 步：SSL/TLS —— 开启 HTTPS

1. 左侧菜单点 **「SSL/TLS」→「Overview」/「概述」**。
2. 在 **「Your SSL/TLS encryption mode」/「加密模式」** 下方，点选：
   - **「Full (Strict)」/「完全（严格）」** ← 推荐（源站 nginx 也配了证书时）
   - 或 **「Full」/「完全」**（源站有证书但不校验链）
   - 新手临时可用 **「Flexible」/「灵活」**，但源站到 Cloudflare 不加密，不安全。
3. 左侧点 **「Edge Certificates」/「边缘证书」**，找到 **「Always Use HTTPS」/「始终使用 HTTPS」**，把开关拨到 **On（开启）**。

---

## 第 5 步（可选）：开基础安全防护

1. 左侧菜单点 **「Security」→「Bots」/「机器人」**。
2. 打开 **「Bot Fight Mode」/「机器人对抗模式」** 开关。
3. （可选）**「Security」→「WAF」** 保持托管规则开启即可。

---

## 第 6 步：完成，访问你的站点

打开浏览器访问 **https://你的域名**（例如 `https://ziggner.com`）：
- 地址栏出现🔒 → 免费证书已生效。
- 商城页面正常加载 → CDN 已接管。

---

## 常见卡点
- **一直显示 Pending / 待处理**：NS 没改对或还没生效，回去第 2 步核对，最多等 24 小时。
- **网站打不开但 DNS 已激活**：确认服务器防火墙放行了 Cloudflare 的访问；商城 prod 用 `docker-compose.prod.yml` 起的 nginx 在 80/443。
- **开发环境不用做这些**：`localhost` 不走公网 DNS，dev 直接 `localhost:8000` / `localhost:12700` 即可。
