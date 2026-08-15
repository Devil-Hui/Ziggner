"""
客服 WebSocket Consumer
─────────────────────────
- JWT 认证（query string ?token=xxx）
- 心跳：服务端按 WS_PING_INTERVAL（默认30s）发 ping，WS_PONG_TIMEOUT（默认10s）内未回复 pong 则断开
- ACK 重试：服务端发送消息后 WS_ACK_RETRY_DELAY（默认5s）内未收到 ACK 则重发，最多 WS_ACK_MAX_RETRIES（默认3次）
- 限流：用户端每分钟最多 CS_RATE_LIMIT_MAX（默认30条），滑动窗口 CS_RATE_LIMIT_WINDOW（默认60s）
- 连接限制：同一用户最多 1 个并发连接
- 已读/未读：连接时自动标记当前会话所有消息为已读
"""
import asyncio
import json
import logging
import time
import uuid
from http.cookies import SimpleCookie
from urllib.parse import parse_qs

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.conf import settings
from django.core.cache import caches
from django.contrib.auth import get_user_model
from django.utils import timezone

import redis.asyncio as aioredis

from apps.users.session_auth import ACCESS_COOKIE
from .policies import ConversationAccessPolicy

logger = logging.getLogger(__name__)

User = get_user_model()

# ── 配置：所有参数从 settings 读取，支持运维热修改 ──
RATE_LIMIT_PREFIX = getattr(settings, 'CS_RATE_LIMIT_KEY_PREFIX', 'cs:rate_limit:user')
RATE_LIMIT_WINDOW = getattr(settings, 'CS_RATE_LIMIT_WINDOW', 60)
RATE_LIMIT_MAX = getattr(settings, 'CS_RATE_LIMIT_MAX', 30)

# This deployment intentionally runs one ASGI worker. These maps track only
# live process-local channels and are cleared on disconnect.
_user_connections: dict[int, str] = {}
_pending_acks: dict[str, dict[str, dict]] = {}


class CustomerServiceConsumer(AsyncWebsocketConsumer):
    """客服 WebSocket 消费者"""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user = None
        self.conv_id = None
        self.group_name = None
        self.is_admin = False
        self._ping_task = None
        self._connected = False

    # ══════════════════════════════════════════════════════════
    # 连接生命周期
    # ══════════════════════════════════════════════════════════

    async def connect(self):
        """WebSocket 连接建立 — JWT 认证 + 连接限制检查"""
        # 1. 从 query string 提取 token
        token = self._extract_auth_token(self.scope)

        if not token:
            await self.close(code=4001, reason='Missing token')
            return

        # 2. 验证 JWT token
        user = await self._authenticate(token)
        if not user:
            await self.close(code=4002, reason='Invalid token')
            return

        self.user = user

        # 3. 提取会话 ID
        self.conv_id = self.scope['url_route']['kwargs'].get('conv_id')
        if not self.conv_id:
            await self.close(code=4003, reason='Missing conversation ID')
            return

        # 4. 验证会话访问权限
        allowed = await self._can_access_conversation()
        if not allowed:
            await self.close(code=4004, reason='Access denied')
            return

        # 5. 连接限制检查（同一用户最多 1 个并发连接）
        user_id = self.user.id
        old_channel = _user_connections.get(user_id)
        if old_channel and old_channel != self.channel_name:
            # 关闭旧连接
            await self.channel_layer.send(old_channel, {
                'type': 'force.disconnect',
                'reason': 'duplicate_connection',
            })
        _user_connections[user_id] = self.channel_name

        # 6. 加入会话组
        self.group_name = f'chat_{self.conv_id}'
        await self.channel_layer.group_add(self.group_name, self.channel_name)

        # 7. 如果 admin，也加入所有会话广播组
        if self.is_admin:
            await self.channel_layer.group_add('chat_admin_broadcast', self.channel_name)

        # 7.5 启动 Redis Pub/Sub 跨进程推送监听（gunicorn REST → Redis → daphne WS）
        self._pubsub = None
        self._pubsub_stop = asyncio.Event()
        self._pubsub_task = asyncio.ensure_future(self._listen_pubsub())

        # 8. 接受连接
        await self.accept()
        self._connected = True

        # 9. 标记当前会话所有未读消息为已读
        await self._mark_messages_read()

        # 10. 启动心跳
        self._ping_task = asyncio.ensure_future(self._ping_loop())

        logger.info(f'WebSocket connected: user={self.user.username}, conv={self.conv_id}')

    async def disconnect(self, close_code):
        """WebSocket 断开"""
        self._connected = False

        # 取消 Pub/Sub 监听
        if getattr(self, '_pubsub_stop', None):
            self._pubsub_stop.set()
        if getattr(self, '_pubsub_task', None):
            self._pubsub_task.cancel()
            try:
                await self._pubsub_task
            except (asyncio.CancelledError, Exception):
                pass
            self._pubsub_task = None
        if getattr(self, '_pubsub', None) is not None:
            try:
                await self._pubsub.aclose()
            except Exception:
                pass
            self._pubsub = None

        # 取消心跳任务
        if self._ping_task:
            self._ping_task.cancel()
            try:
                await self._ping_task
            except asyncio.CancelledError:
                pass
            self._ping_task = None

        # 清理 ACK 待确认队列
        if self.group_name and self.group_name in _pending_acks:
            for msg_id, entry in list(_pending_acks.get(self.group_name, {}).items()):
                if entry.get('channel') == self.channel_name:
                    task = entry.get('task')
                    if task:
                        task.cancel()
            _pending_acks.pop(self.group_name, None)

        # 离开会话组
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

        if self.is_admin:
            await self.channel_layer.group_discard('chat_admin_broadcast', self.channel_name)

        # 清理连接追踪
        if self.user and _user_connections.get(self.user.id) == self.channel_name:
            _user_connections.pop(self.user.id, None)

        logger.info(f'WebSocket disconnected: user={self.user.username if self.user else "?"}, '
                    f'conv={self.conv_id}, code={close_code}')

    # ══════════════════════════════════════════════════════════
    # 消息接收
    # ══════════════════════════════════════════════════════════

    async def receive(self, text_data=None, bytes_data=None):
        """接收客户端消息"""
        if not text_data:
            return

        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            await self.send(json.dumps({'type': 'error', 'payload': 'Invalid JSON'}))
            return

        msg_type = data.get('type', '')

        if msg_type == 'pong':
            # 心跳回复 — 不做额外处理，ping 定时器自己管理
            self._last_pong = time.time()
            return

        if msg_type == 'ack':
            # ACK 确认 — 取消重试定时器
            msg_id = data.get('msg_id', '')
            await self._handle_ack(msg_id)
            return

        if msg_type == 'message':
            # 限流检查
            if not self.is_admin:
                if not await self._check_rate_limit():
                    await self.send(json.dumps({
                        'type': 'error',
                        'payload': '消息发送过于频繁，请稍后再试（每分钟最多30条）',
                    }))
                    return

            # 解析消息
            payload = data.get('payload', {})
            content = payload.get('content', '')
            msg_type_field = payload.get('msg_type', 'text')
            file_url = payload.get('file_url', '')
            # 前端 product_card 语义字段兜底：product_card = {id,name,main_image,price,order_id}
            card_data = payload.get('card_data') or payload.get('product_card') or None
            metadata = payload.get('metadata', {})
            attachments = payload.get('attachments', None)

            # 管理员发送商品卡片时，自动填充 order/product 信息
            if self.is_admin and msg_type_field == 'product_card' and card_data:
                card_data = await self._enrich_card_data(card_data)
            elif card_data and isinstance(card_data, dict):
                # 非管理员 / 非卡片消息：精简为引用
                card_data = self._strip_card_data_to_refs(card_data)

            # 保存到数据库
            res = await self._save_message(
                content=content,
                msg_type=msg_type_field,
                file_url=file_url,
                card_data=card_data,
                metadata=metadata,
                attachments=attachments,
            )

            if not res:
                await self.send(json.dumps({
                    'type': 'error',
                    'payload': '消息保存失败',
                }))
                return
            if res.get('error') == 'locked':
                await self.send(json.dumps({
                    'type': 'error',
                    'payload': res.get('detail', '会话占线，暂不可发送'),
                }))
                return

            msg = res

            # 广播到会话组
            msg_id = msg['msg_id']
            broadcast_msg = {
                'type': 'chat.message',
                'payload': msg,
                'msg_id': msg_id,
                'timestamp': msg['created_at'],
                'sender_type': msg['sender_type'],
            }
            await self.channel_layer.group_send(self.group_name, broadcast_msg)

            # 启动 ACK 重试机制
            await self._start_ack_retry(msg_id, broadcast_msg)
            return

        # 未知消息类型
        await self.send(json.dumps({
            'type': 'error',
            'payload': f'未知消息类型: {msg_type}',
        }))

    # ══════════════════════════════════════════════════════════
    # 消息广播处理
    # ══════════════════════════════════════════════════════════

    async def chat_message(self, event):
        """转发消息到 WebSocket 客户端"""
        await self.send(json.dumps({
            'type': 'message',
            'payload': event['payload'],
            'msg_id': event['msg_id'],
            'timestamp': event['timestamp'],
            'sender_type': event['sender_type'],
        }))

    async def force_disconnect(self, event):
        """强制断开连接（连接限制）"""
        logger.warning(f'Force disconnecting {self.channel_name}: {event.get("reason")}')
        self._connected = False
        await self.close(code=4005, reason=event.get('reason', 'force_disconnect'))

    # ══════════════════════════════════════════════════════════
    # 心跳机制
    # ══════════════════════════════════════════════════════════

    def _pubsub_worker(self, loop):
        """同步 Redis Pub/Sub 监听（独立线程），收到消息后投递回 asyncio 事件循环。

        用同步 redis + 轮询而非 redis.asyncio：daphne 的 asyncio 事件循环下
        async pubsub listen() 存在唤醒兼容问题，同步方案确定性强且可干净退出。
        """
        import redis as redis_sync

        redis_url = getattr(settings, 'CHANNEL_REDIS_URL', 'redis://redis:6379/4')
        r = None
        try:
            r = redis_sync.from_url(redis_url)
            ps = r.pubsub()
            channels = [self.group_name]
            if self.is_admin:
                channels.append('chat_admin_broadcast')
            ps.subscribe(*channels)
            logger.info('Pub/Sub subscribed: %s conv=%s', channels, self.conv_id)
            while not self._pubsub_stop.is_set():
                msg = ps.get_message(timeout=1.0, ignore_subscribe_messages=True)
                if msg and msg.get('type') == 'message':
                    logger.info('[Pub/Sub] got msg conv=%s connected=%s', self.conv_id, self._connected)
                    if self._connected:
                        data = msg['data']
                        if isinstance(data, bytes):
                            data = data.decode('utf-8')
                        try:
                            event = json.loads(data)
                        except (ValueError, TypeError):
                            continue
                        f = asyncio.run_coroutine_threadsafe(self._push_pubsub(event), loop)
                        f.add_done_callback(lambda fu: logger.info('[Pub/Sub] push future done conv=%s exc=%s', self.conv_id, fu.exception() if not fu.cancelled() else 'cancelled'))
                    else:
                        logger.info('[Pub/Sub] skip: not connected conv=%s', self.conv_id)
        except Exception:
            logger.exception('Pub/Sub listener failed conv=%s', self.conv_id)
        finally:
            if r is not None:
                try:
                    r.close()
                except Exception:
                    pass

    async def _push_pubsub(self, event):
        """将 pub/sub 事件推送到本 WS 客户端（在 daphne 事件循环执行）"""
        logger.info('[Pub/Sub] push_pubsub called conv=%s connected=%s', self.conv_id, self._connected)
        if not self._connected:
            return
        try:
            await self.send(json.dumps({
                'type': 'message',
                'payload': event.get('payload', {}),
                'msg_id': event.get('msg_id', ''),
                'timestamp': event.get('timestamp', ''),
                'sender_type': event.get('sender_type', ''),
            }))
        except Exception:
            logger.warning('Pub/Sub push failed conv=%s', self.conv_id)

    async def _listen_pubsub(self):
        """启动 Pub/Sub 监听线程（跨进程实时推送）"""
        self._pubsub_stop = asyncio.Event()
        loop = asyncio.get_running_loop()
        await loop.run_in_executor(None, self._pubsub_worker, loop)

    async def _ping_loop(self):
        """每 30 秒发送 ping，等待 10 秒内收到 pong"""
        self._last_pong = time.time()

        while self._connected:
            await asyncio.sleep(getattr(settings, 'WS_PING_INTERVAL', 30))

            if not self._connected:
                break

            # 发送 ping
            try:
                await self.send(json.dumps({'type': 'ping'}))
            except Exception:
                break

            # 等待 pong 超时时间
            await asyncio.sleep(getattr(settings, 'WS_PONG_TIMEOUT', 10))

            if not self._connected:
                break

            # 检查上次 pong 时间
            if time.time() - self._last_pong > getattr(settings, 'WS_PING_TOTAL_TIMEOUT', 40):
                logger.warning(f'Ping timeout for user={self.user.username if self.user else "?"}')
                await self.close(code=4006, reason='Ping timeout')
                break

    # ══════════════════════════════════════════════════════════
    # ACK 重试机制（5 秒超时，最多 3 次重试）
    # ══════════════════════════════════════════════════════════

    async def _start_ack_retry(self, msg_id: str, message: dict, retry_count: int = 0):
        """启动 ACK 重试任务 — 最多 3 次，每次间隔 5 秒"""
        if self.group_name not in _pending_acks:
            _pending_acks[self.group_name] = {}

        # 创建重试任务
        task = asyncio.ensure_future(
            self._ack_retry_loop(msg_id, message, retry_count)
        )
        _pending_acks[self.group_name][msg_id] = {
            'channel': self.channel_name,
            'retries': retry_count,
            'task': task,
        }

    async def _ack_retry_loop(self, msg_id: str, message: dict, retry_count: int):
        """ACK 重试循环"""
        MAX_RETRIES = getattr(settings, 'WS_ACK_MAX_RETRIES', 3)
        RETRY_DELAY = getattr(settings, 'WS_ACK_RETRY_DELAY', 5)

        try:
            while retry_count < MAX_RETRIES:
                await asyncio.sleep(RETRY_DELAY)

                if not self._connected:
                    return

                # 检查是否已被 ACK 取消
                group_acks = _pending_acks.get(self.group_name, {})
                if msg_id not in group_acks:
                    return  # 已确认，退出

                # 重发消息
                retry_count += 1
                group_acks[msg_id]['retries'] = retry_count
                logger.info(f'ACK retry {retry_count}/{MAX_RETRIES} for msg {msg_id}')

                try:
                    await self.send(json.dumps({
                        'type': 'message',
                        'payload': message['payload'],
                        'msg_id': msg_id,
                        'timestamp': message['timestamp'],
                        'sender_type': message['sender_type'],
                    }))
                except Exception:
                    return  # 发送失败，停止重试

            # 超过最大重试次数，清理
            if self.group_name in _pending_acks:
                _pending_acks[self.group_name].pop(msg_id, None)
            logger.warning(f'ACK retry exhausted for msg {msg_id}')

        except asyncio.CancelledError:
            # ACK 已确认 — 正常取消
            pass
        except Exception as e:
            logger.error(f'ACK retry error: {e}')

    async def _handle_ack(self, msg_id: str):
        """处理客户端 ACK — 取消重试，并标记消息已读后向会话组广播已读回执"""
        if not msg_id:
            return
        group_acks = _pending_acks.get(self.group_name, {})
        if msg_id in group_acks:
            entry = group_acks[msg_id]
            task = entry.get('task')
            if task and not task.done():
                task.cancel()
            del group_acks[msg_id]

        # 标记该消息为已读，并通知发送方（让对方看到「已读」）
        try:
            await self._mark_message_read(msg_id)
            await self.channel_layer.group_send(self.group_name, {
                'type': 'read.receipt',
                'msg_id': str(msg_id),
            })
        except Exception as e:
            logger.warning(f'Read receipt broadcast failed for msg {msg_id}: {e}')

    @database_sync_to_async
    def _mark_message_read(self, msg_id: str):
        from .models import Message

        try:
            msg = Message.objects.get(id=int(msg_id))
            if not msg.is_read:
                msg.is_read = True
                msg.save(update_fields=['is_read'])
        except (Message.DoesNotExist, ValueError, TypeError):
            return

    async def read_receipt(self, event):
        """把「已读」回执转发给会话组内所有客户端"""
        await self.send(json.dumps({
            'type': 'read_receipt',
            'msg_id': event.get('msg_id'),
        }))

    # ══════════════════════════════════════════════════════════
    # 限流检查
    # ══════════════════════════════════════════════════════════

    async def _check_rate_limit(self) -> bool:
        """滑动窗口限流（MySQL-only 走 DatabaseCache；有 Redis 仍可用 ZSET）。"""
        from utils.sliding_window import check_sliding_window

        key = f'{RATE_LIMIT_PREFIX}:{self.user.id}'
        try:
            return await database_sync_to_async(check_sliding_window)(
                key,
                window_seconds=RATE_LIMIT_WINDOW,
                max_count=RATE_LIMIT_MAX,
                fail_open=True,
            )
        except Exception as e:
            logger.error(f'Rate limit check error: {e}')
            return True

    # ══════════════════════════════════════════════════════════
    # 数据库操作（同步 → 异步）
    # ══════════════════════════════════════════════════════════

    @database_sync_to_async
    def _authenticate(self, token: str):
        """验证 JWT token 并返回用户"""
        from rest_framework_simplejwt.tokens import AccessToken
        from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

        try:
            validated = AccessToken(token)
            user_id = validated.get('user_id')
            if not user_id:
                return None
            return User.objects.filter(id=user_id, is_active=True).first()
        except (TokenError, InvalidToken, Exception) as e:
            logger.warning(f'JWT auth failed: {e}')
            return None

    @database_sync_to_async
    def _can_access_conversation(self) -> bool:
        """检查用户是否有权限访问该会话 — 组级权限隔离"""
        if ConversationAccessPolicy.is_ops(self.user):
            return False
        self.is_admin = ConversationAccessPolicy.is_agent(self.user)
        return ConversationAccessPolicy.get_conversation(
            self.conv_id, self.user,
        ) is not None

    @database_sync_to_async
    def _mark_messages_read(self):
        """标记当前会话所有未读消息为已读"""
        from .models import Message

        if self.is_admin:
            # Admin: 标记用户发的未读消息
            Message.objects.filter(
                conversation_id=self.conv_id,
                sender_type='user',
                is_read=False,
            ).update(is_read=True)
        else:
            # 用户: 标记 admin 发的未读消息
            Message.objects.filter(
                conversation_id=self.conv_id,
                sender_type='admin',
                is_read=False,
            ).update(is_read=True)

    def _is_superadmin_sync(self) -> bool:
        """同步判断当前用户是否超管（在 database_sync_to_async 内调用）"""
        return ConversationAccessPolicy.is_superadmin(self.user)

    @database_sync_to_async
    def _save_message(self, content: str, msg_type: str, file_url: str,
                      card_data: dict | None, metadata: dict,
                      attachments: list | None = None) -> dict | None:
        """保存消息到数据库 — 强制占线保护 + admin 认领/刷新时间戳"""
        from .models import Conversation, Message

        try:
            conv = Conversation.objects.filter(id=self.conv_id).select_related('handled_by').first()
            if not conv:
                return None

            sender_type = 'admin' if self.is_admin else 'user'

            # ── 占线保护（仅 admin）：被他人占用且未超时（非超管）则拒绝 ──
            if sender_type == 'admin' and conv.handled_by_id and conv.handled_by_id != self.user.id:
                if not self._is_superadmin_sync():
                    ttl = getattr(settings, 'CS_ASSIGN_TIMEOUT_MINUTES', 30)
                    expired = bool(
                        conv.handled_at
                        and (timezone.now() - conv.handled_at).total_seconds() > ttl * 60
                    )
                    if expired:
                        conv.handled_by = None
                        conv.handled_at = None
                        conv.save(update_fields=['handled_by', 'handled_at'])
                    else:
                        return {
                            'error': 'locked',
                            'detail': f'该会话正在由 {conv.handled_by.username} 接待中，暂不可接手（占线保护）',
                        }

            # ── Admin 认领 / 刷新占线 ──
            if sender_type == 'admin':
                if not conv.admin:
                    conv.admin = self.user
                    conv.save(update_fields=['admin'])
                if conv.handled_by_id != self.user.id:
                    conv.handled_by = self.user
                conv.handled_at = timezone.now()
                conv.save(update_fields=['handled_by', 'handled_at'])

            msg = Message.objects.create(
                conversation=conv,
                sender=self.user,
                sender_type=sender_type,
                content=content,
                msg_type=msg_type,
                file_url=file_url,
                card_data=card_data or {},
                metadata=metadata,
                is_read=False,
            )

            # 更新用户消息计数
            if sender_type == 'user':
                conv.increment_msg_count()

            # ── 附件消息（图片/视频）单独成消息 ──
            for att in attachments or []:
                if isinstance(att, dict):
                    url = att.get('url')
                    amt = att.get('msg_type', 'image')
                else:
                    url = att
                    amt = 'image'
                if not url:
                    continue
                if amt not in ('image', 'video'):
                    amt = 'image'
                Message.objects.create(
                    conversation=conv,
                    sender=self.user,
                    sender_type=sender_type,
                    content='',
                    msg_type=amt,
                    file_url=url,
                    metadata={'is_attachment': True},
                    is_read=False,
                )
                if sender_type == 'user':
                    conv.increment_msg_count()

            # 构造返回数据
            return {
                'id': msg.id,
                'msg_id': str(msg.id),
                'conversation_id': conv.id,
                'sender_id': msg.sender_id,
                'sender_name': msg.sender.username if msg.sender else '',
                'sender_type': sender_type,
                'content': content,
                'msg_type': msg_type,
                'file_url': file_url,
                'card_data': msg.card_data,
                'metadata': metadata,
                'is_read': False,
                'created_at': msg.created_at.isoformat(),
            }
        except Exception as e:
            logger.error(f'Save message error: {e}')
            return None

    @database_sync_to_async
    def _enrich_card_data(self, card_data: dict) -> dict:
        """
        管理员发送商品卡片时，自动补充订单信息。
        card_data 仅存储 spu_id + order_id + sku_id 引用，
        product_name/price/status 由前端实时查询。
        """
        from apps.order.models import OrderItem

        spu_id = card_data.get('product_id') or card_data.get('spu_id') or card_data.get('id')
        if not spu_id or not self.conv_id:
            # 至少保留 spu_id
            result = {}
            if spu_id:
                result['spu_id'] = spu_id
            return result

        try:
            from .models import Conversation
            conv = Conversation.objects.select_related('user').filter(id=self.conv_id).first()
            if not conv:
                return {'spu_id': spu_id}

            # 查找该用户对该商品的最近订单
            order_item = (
                OrderItem.objects
                .filter(
                    sku__spu_id=spu_id,
                    order__user=conv.user,
                )
                .select_related('order', 'sku')
                .order_by('-order__created_at')
                .first()
            )

            result = {'spu_id': spu_id}

            if order_item:
                result['order_id'] = order_item.order_id
                result['order_no'] = order_item.order.order_no
                result['order_status'] = order_item.order.status
                result['sku_id'] = order_item.sku_id
        except Exception as e:
            logger.warning(f'Enrich card_data error: {e}')
            result = {'spu_id': spu_id}

        return result

    # ══════════════════════════════════════════════════════════
    # 工具方法
    # ══════════════════════════════════════════════════════════

    @staticmethod
    def _extract_token(query_string: str) -> str:
        """从 query string 提取 token 参数"""
        if not query_string:
            return ''
        for part in query_string.split('&'):
            if part.startswith('token='):
                return part[6:]
        return ''

    @staticmethod
    def _extract_auth_token(scope: dict) -> str:
        headers = {name.lower(): value for name, value in scope.get('headers', [])}

        authorization = headers.get(b'authorization', b'').decode('latin-1')
        scheme, _, bearer = authorization.partition(' ')
        if scheme.lower() == 'bearer' and bearer:
            return bearer.strip()

        raw_cookie = headers.get(b'cookie', b'').decode('latin-1')
        if raw_cookie:
            cookies = SimpleCookie()
            try:
                cookies.load(raw_cookie)
            except ValueError:
                cookies = SimpleCookie()
            access_cookie = cookies.get(ACCESS_COOKIE)
            if access_cookie and access_cookie.value:
                return access_cookie.value

        query_string = scope.get('query_string', b'').decode('utf-8')
        return parse_qs(query_string).get('token', [''])[0]

    @staticmethod
    def _strip_card_data_to_refs(card_data: dict) -> dict:
        """
        将 card_data 精简为仅引用字段（spu_id + order_id + sku_id）。
        product_name/price/status 等展示时从 SPU 实时查询。
        """
        if not card_data or not isinstance(card_data, dict):
            return card_data or {}
        refs = {}
        spu_id = card_data.get('spu_id') or card_data.get('product_id') or card_data.get('id')
        if spu_id:
            refs['spu_id'] = spu_id
        order_id = card_data.get('order_id')
        if order_id:
            refs['order_id'] = order_id
        order_no = card_data.get('order_no')
        if order_no:
            refs['order_no'] = order_no
        sku_id = card_data.get('sku_id')
        if sku_id:
            refs['sku_id'] = sku_id
        return refs
