# Ziggner 配置清单

> `docker restart ziggner-django` 生效后端配置
> `docker compose -f docker-compose.prod.yml up -d --build` 生效 MySQL/Redis 配置

## 配置文件

| 文件 | 作用 | 修改后操作 |
|------|------|-----------|
| `backend/project/config/settings/base.py` | 后端业务参数 | `docker restart ziggner-django` |
| `backend/.env` | 密钥/密码/数据库/邮箱 | `docker restart ziggner-django` |
| `docker-compose.prod.yml` | MySQL/Redis/RabbitMQ 配置 | `docker compose -f docker-compose.prod.yml up -d --build <服务名>` |
| `nginx/default.conf` | 反向代理/安全头/缓存 | `docker restart ziggner-nginx` |
| `web/react/src/config/constants.ts` | 前端参数（轮询/超时/验证码） | `npm run build` → deploy dist/ |

## 后端配置（base.py:460-540）

### 客服系统
`backend/project/config/settings/base.py:462`

```python
CS_RATE_LIMIT_WINDOW = 60           # 限流窗口(秒)
CS_RATE_LIMIT_MAX = 30              # 用户每分钟最多消息数
CS_RATE_LIMIT_KEY_PREFIX = 'cs:rate_limit:user'
CS_ALLOWED_IMAGE_TYPES = {'image/jpeg', 'image/png', 'image/gif'}
CS_ALLOWED_VIDEO_TYPES = {'video/mp4'}
CS_IMAGE_MAX_SIZE = 10 * 1024 * 1024    # 10MB
CS_VIDEO_MAX_SIZE = 50 * 1024 * 1024    # 50MB
CS_IMAGE_UPLOAD_FOLDER = 'chat/images'
CS_VIDEO_UPLOAD_FOLDER = 'chat/videos'
CS_PRODUCT_SEARCH_LIMIT = 50
CS_USER_MSG_LIMIT_BEFORE_REPLY = 5
```

### WebSocket
`backend/project/config/settings/base.py:475`

```python
WS_PING_INTERVAL = 30       # 心跳间隔(秒)
WS_PONG_TIMEOUT = 10        # pong 超时(秒)
WS_PING_TOTAL_TIMEOUT = 40  # 总超时(秒)
WS_ACK_MAX_RETRIES = 3      # ACK 重试次数
WS_ACK_RETRY_DELAY = 5      # ACK 重试间隔(秒)
```

### 商品系统
`backend/project/config/settings/base.py:482`

```python
SPU_ADMIN_DEFAULT_PAGE_SIZE = 20            # 列表每页条数
SPU_SCHEDULED_PUBLISH_DELAY_MINUTES = 5     # 审核后自动上架延迟(分钟)
SPU_MEDIA_MAX_COUNT = 6                     # 每商品最多媒体数
```

### 限流
`backend/project/config/settings/base.py:488`

```python
RATE_LIMIT_WINDOW = 60      # 统计窗口(秒)
RATE_LIMIT_BLOCK_TTL = 300  # 封禁时长(秒)
RATE_LIMITS = {
    '/api/users/login/': 60,
    '/api/users/register/': 30,
    '/api/users/send-verify-code/': 5,
    '/api/order/checkout/': 30,
}
```

### 操作日志 & 通知
`backend/project/config/settings/base.py:499`

```python
OPERATION_LOG_BASE_DIR = 'logs/operations'
AUDIT_ACTION_PATTERNS = {'POST:/api/payment/', 'POST:/api/order/', 'DELETE:'}
NOTIFICATION_DEFAULT_PAGE_SIZE = 20
NOTIFICATION_LIST_CACHE_TTL = 120   # 秒
NOTIFICATION_UNREAD_CACHE_TTL = 60  # 秒
```

## MySQL 配置（docker-compose.yml → db.command）

```yaml
--innodb-buffer-pool-size=128M        # 缓冲池
--max-connections=50                  # 最大连接
--innodb-flush-log-at-trx-commit=2    # 每秒刷盘
--slow-query-log=ON                   # 慢查询日志
--long-query-time=2                   # 慢查询阈值(秒)
--default-time-zone=-05:00            # 美东时区
```

## Redis 配置（docker-compose.yml → redis.command）

```yaml
--maxmemory 48mb                      # 最大内存
--maxmemory-policy allkeys-lru        # 淘汰策略
--save 900 1                          # 15分钟≥1key变动
--save 300 10                         # 5分钟≥10key变动
--rename-command FLUSHALL z_ziggner_FLUSHALL    # 防误操作
--rename-command KEYS z_ziggner_KEYS            # 防误操作
```

## .env 关键变量

```bash
EMAIL_HOST_USER=deavenhui@163.com     # 管理后台邮箱
EMAIL_HOST_PASSWORD=xxx               # 163 授权码
USER_EMAIL_HOST_USER=                 # 用户注册邮箱(待配)
USER_EMAIL_HOST_PASSWORD=             # 用户注册邮箱授权码(待配)
```

## 前端配置（constants.ts）

```typescript
CHAT_FLOAT_PAGE_SIZE: 5              # 客服浮窗对话数
NOTIF_FLOAT_POLL_INTERVAL: 30000     # 通知轮询(毫秒)
ADMIN_CHAT_POLL_INTERVAL: 5000       # 聊天轮询(毫秒)
WS_MAX_RECONNECT_ATTEMPTS: 5         # WebSocket 最大重连
VERIFY_CODE_COUNTDOWN_SECONDS: 60    # 验证码倒计时(秒)
```
