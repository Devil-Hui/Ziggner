# Ziggner 全局配置文档

> 最后更新: 2026-07-09  
> 说明: 所有运维可调参数均已集中管理，修改后重启对应服务生效

---

## 一、配置总览

| 配置文件 | 位置 | 作用 | 修改后操作 |
|----------|------|------|-----------|
| 后端主配置 | `backend/project/config/settings/base.py` | 所有后端业务参数 | 重启 Django 容器 |
| 生产环境覆盖 | `backend/project/config/settings/prod.py` | 生产专用覆盖 | 重启 Django 容器 |
| 开发环境覆盖 | `backend/project/config/settings/dev.py` | 开发专用覆盖 | 重启 Django 容器 |
| 环境变量 | `backend/.env` | 密钥/密码/数据库连接 | 重启 Django 容器 |
| Docker 环境变量 | `.env` | Docker Compose 变量 | `docker-compose up -d` |
| 前端配置 | `web/react/src/config/constants.ts` | 前端所有业务参数 | 重新构建前端 |
| Nginx 配置 | `nginx/default.conf` | 反向代理/安全头/缓存 | `docker restart nginx` |

---

## 二、后端配置（base.py）

文件位置：`backend/project/config/settings/base.py`

### 2.1 客服系统

```python
# CS = Customer Service
CS_RATE_LIMIT_WINDOW = 60              # 限流滑动窗口（秒）
CS_RATE_LIMIT_MAX = 30                  # 用户每分钟最多发消息数
CS_RATE_LIMIT_KEY_PREFIX = 'cs:rate_limit:user'  # Redis key 前缀

CS_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif'}  # 允许上传的图片格式
CS_ALLOWED_VIDEO_TYPES = {'video/mp4'}                             # 允许上传的视频格式
CS_IMAGE_MAX_SIZE = 10 * 1024 * 1024    # 图片最大 10MB
CS_VIDEO_MAX_SIZE = 50 * 1024 * 1024    # 视频最大 50MB

CS_IMAGE_UPLOAD_FOLDER = 'chat/images'  # 图片存储目录
CS_VIDEO_UPLOAD_FOLDER = 'chat/videos'  # 视频存储目录

CS_PRODUCT_SEARCH_LIMIT = 50            # 客服商品搜索最多返回条数
CS_USER_MSG_LIMIT_BEFORE_REPLY = 5      # 客服回复前用户最多连续发送消息数
```

### 2.2 WebSocket 连接

```python
# WS = WebSocket
WS_PING_INTERVAL = 30                   # 服务端心跳发送间隔（秒）
WS_PONG_TIMEOUT = 10                    # 等待客户端 pong 回复超时（秒）
WS_PING_TOTAL_TIMEOUT = 40              # 总超时阈值（秒），超过后断开连接
WS_ACK_MAX_RETRIES = 3                  # ACK 确认最大重试次数
WS_ACK_RETRY_DELAY = 5                  # ACK 重试间隔（秒）
```

### 2.3 商品系统（SPU）

```python
# SPU = Standard Product Unit
SPU_ADMIN_DEFAULT_PAGE_SIZE = 20        # 管理后台商品列表每页显示数
SPU_SCHEDULED_PUBLISH_DELAY_MINUTES = 5 # 审核通过后自动上架延迟（分钟）
SPU_MEDIA_MAX_COUNT = 6                 # 每个 SPU 最多媒体文件数
```

### 2.4 用户系统

```python
AVATAR_ALLOWED_EXTENSIONS = ('.jpg', '.jpeg', '.png', '.gif', '.webp')  # 头像允许的文件后缀
```

### 2.5 接口限流（Rate Limit）

```python
RATE_LIMIT_WINDOW = 60                  # 限流统计窗口（秒）
RATE_LIMIT_BLOCK_TTL = 300              # 触发限流后封禁时长（秒）= 5分钟

RATE_LIMITS = {                         # 各接口限流阈值（次/窗口）
    '/api/users/login/': 60,            # 登录：60次/分钟/IP
    '/api/users/register/': 30,         # 注册：30次/分钟/IP
    '/api/users/send-verify-code/': 5,  # 发送验证码：5次/分钟/IP
    '/api/order/checkout/': 30,         # 下单：30次/分钟/IP
}
```

### 2.6 操作日志

```python
OPERATION_LOG_BASE_DIR = 'logs/operations'         # 操作日志存储路径
AUDIT_ACTION_PATTERNS = {                           # 触发审计日志的请求模式
    'POST:/api/payment/',                           # 支付请求
    'POST:/api/order/',                             # 下单请求
    'DELETE:',                                      # 删除请求
}
```

### 2.7 通知系统

```python
NOTIFICATION_DEFAULT_PAGE_SIZE = 20     # 通知列表每页显示数
NOTIFICATION_LIST_CACHE_TTL = 120       # 通知列表 Redis 缓存时间（秒）
NOTIFICATION_UNREAD_CACHE_TTL = 60      # 未读计数缓存时间（秒）
```

---

## 三、前端配置（constants.ts）

文件位置：`web/react/src/config/constants.ts`

修改方法：编辑文件后运行 `npm run build` 重新构建前端，然后部署到 Nginx。

```typescript
export const CONFIG = {
  // ── 客服浮窗 ──
  CHAT_FLOAT_PAGE_SIZE: 5,          // 浮窗加载最近对话数
  CHAT_FLOAT_DISPLAY_MAX: 5,        // 浮窗最多同时显示数

  // ── 通知浮窗 ──
  NOTIF_FLOAT_PAGE_SIZE: 5,         // 通知浮窗加载条数
  NOTIF_FLOAT_POLL_INTERVAL: 30000, // 通知轮询间隔（毫秒）= 30秒

  // ── 管理后台聊天 ──
  ADMIN_CHAT_LIST_PAGE_SIZE: 100,   // 会话列表一次加载数
  ADMIN_CHAT_POLL_INTERVAL: 5000,   // 聊天详情轮询间隔（毫秒）= 5秒
  ADMIN_CHAT_FOCUS_DELAY: 100,      // 搜索框聚焦延迟（毫秒）
  ADMIN_CHAT_DEBOUNCE_MS: 300,      // 搜索防抖延迟（毫秒）

  // ── 用户端聊天 ──
  CHAT_USER_MSG_LIMIT: 5,           // 用户未获回复前最多连续发消息数
  WS_MAX_RECONNECT_ATTEMPTS: 5,     // WebSocket 最大重连次数
  WS_RECONNECT_BASE_DELAY: 1000,    // 重连初始等待（毫秒）= 1秒
  WS_RECONNECT_MAX_DELAY: 8000,     // 重连最大等待（毫秒）= 8秒
  TYPING_INDICATOR_TIMEOUT: 3000,   // 对方正在输入指示超时（毫秒）= 3秒

  // ── 滚动按钮 ──
  SCROLL_FAB_THRESHOLD: 3,          // 消息超过此数时显示"滚动到底"按钮
  AT_BOTTOM_THRESHOLD_PX: 80,       // 距底部多少像素内算"到底部"

  // ── 登录验证码 ──
  VERIFY_CODE_COUNTDOWN_SECONDS: 60, // 发送验证码后倒计时（秒）
  VERIFY_CODE_LENGTH: 6,             // 验证码长度（位）
}
```

---

## 四、环境变量文件

### 4.1 Docker 环境变量

文件位置：项目根目录 `.env`

```
DB_ROOT_PASSWORD=...      # MySQL root 密码
DB_PASSWORD=...           # MySQL 应用用户密码
RABBITMQ_PASSWORD=...     # RabbitMQ 密码
REDIS_PASSWORD=...        # Redis 密码
```

### 4.2 后端环境变量

文件位置：`backend/.env`

```
DB_ENGINE=...             # 数据库引擎
DB_NAME=...               # 数据库名
DB_USER=...               # 数据库用户
DB_PASSWORD=...           # 数据库密码
DB_HOST=...               # 数据库主机
DB_PORT=...               # 数据库端口

REDIS_PASSWORD=...        # Redis 密码
REDIS_HOST=...            # Redis 主机
REDIS_PORT=...            # Redis 端口

SECRET_KEY=...            # Django 密钥（生产环境务必修改）
DEBUG=True                # 调试模式（生产环境设为 False）
ALLOWED_HOSTS=...         # 允许访问的域名

EMAIL_HOST_USER=...       # 163邮箱地址（管理后台用）
EMAIL_HOST_PASSWORD=...   # 163邮箱授权码（注意：不是登录密码）
USER_EMAIL_HOST_USER=...  # 用户注册邮箱地址（暂留空）
USER_EMAIL_HOST_PASSWORD=... # 用户注册邮箱授权码（暂留空）
```

---

## 五、Nginx 配置

文件位置：`nginx/default.conf`

```nginx
# 安全头配置
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

# 上传限制
client_max_body_size 10m;      # 最大上传文件大小

# 静态资源缓存
location /assets/ {
    expires 1y;                # 前端静态文件缓存 1 年
    add_header Cache-Control "public, immutable";
}
```

---

## 六、修改配置后的操作步骤

### 后端配置修改
```bash
# 1. 修改 base.py 或 .env
# 2. 重启 Django 容器
docker restart ziggner-django

# 3. 如修改了限流配置，需同时重启 Nginx
docker restart ziggner-nginx
```

### 前端配置修改
```bash
# 1. 修改 constants.ts
# 2. 重新构建
cd web/react
npm run build

# 3. 部署到 Nginx
tar cf - -C dist . | docker exec -i -u root ziggner-nginx sh -c "rm -rf /usr/share/nginx/html/* && tar xf - -C /usr/share/nginx/html"
```

### Docker Compose 环境变量修改
```bash
# 1. 修改 .env
# 2. 重建并重启所有服务
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml up -d
```
