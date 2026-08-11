/**
 * Ziggner 前端全局配置常量
 * ============================================
 * 【阿里巴巴规范要求】
 * 1. 所有常量使用 UPPER_SNAKE_CASE 命名
 * 2. 每个常量必须包含中文注释说明含义和单位
 * 3. 按模块分组，组间空行分隔
 * 4. 使用 as const 确保类型安全
 * ============================================
 * 修改方法：编辑本文件后运行 npm run build 重新构建前端
 */

export const CONFIG = {
  // ──── 客服浮窗 ────
  // 客服浮窗：接口请求加载的最近对话数
  CHAT_FLOAT_PAGE_SIZE: 5,
  // 客服浮窗：浮窗内最多同时显示的对话条目数
  CHAT_FLOAT_DISPLAY_MAX: 5,

  // ──── 通知浮窗 ────
  // 通知浮窗：接口请求加载的通知条数
  NOTIF_FLOAT_PAGE_SIZE: 5,
  // 通知浮窗：轮询间隔（毫秒），默认30秒轮询一次新通知
  NOTIF_FLOAT_POLL_INTERVAL: 30000,

  // ──── 管理后台聊天详情页 ────
  // 会话列表：一次接口请求加载的会话数量
  ADMIN_CHAT_LIST_PAGE_SIZE: 100,
  // 聊天详情：轮询兜底间隔（毫秒）。实时消息/已读回执已由 WebSocket 增量推送，
  // 此处仅作 WS 断线时的补偿拉取，3s 内兜底以满足"刷新即可见新消息"的体感（低负载，单 worker 无压力）。
  ADMIN_CHAT_POLL_INTERVAL: 3000,
  // 聊天详情：搜索框自动获取焦点的延迟（毫秒）
  ADMIN_CHAT_FOCUS_DELAY: 100,
  // 聊天详情：搜索输入防抖延迟（毫秒）
  ADMIN_CHAT_DEBOUNCE_MS: 300,

  // ──── 用户端聊天 ────
  // 用户端：客服回复前用户最多连续发送消息数
  CHAT_USER_MSG_LIMIT: 5,
  // WebSocket：最大自动重连次数，超过后提示连接断开
  WS_MAX_RECONNECT_ATTEMPTS: 5,
  // WebSocket：重连指数退避的初始延迟（毫秒），第n次重连 = BASE * 2^n
  WS_RECONNECT_BASE_DELAY: 1000,
  // WebSocket：重连指数退避的最大延迟上限（毫秒）
  WS_RECONNECT_MAX_DELAY: 8000,
  // 用户端：对方正在输入指示器的超时时间（毫秒）
  TYPING_INDICATOR_TIMEOUT: 3000,

  // ──── 页面滚动 ────
  // 消息列表：消息数超过此值时显示"滚动到底部"浮动按钮
  SCROLL_FAB_THRESHOLD: 3,
  // 消息列表：距底部多少像素以内视为"已到底部"（像素）
  AT_BOTTOM_THRESHOLD_PX: 80,

  // ──── 登录验证码 ────
  // 验证码：发送后的倒计时秒数（秒），倒计时内不可重新发送
  VERIFY_CODE_COUNTDOWN_SECONDS: 60,
  // 验证码：验证码字符长度（位）
  VERIFY_CODE_LENGTH: 6,
} as const
