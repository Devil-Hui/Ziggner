# Ziggner 端到端业务流程文档

> **版本**: v1.0 | **更新日期**: 2026-07-09  
> **覆盖**: 注册/登录/商品/订单/支付/客服/通知/优惠券 8 大核心流程  
> **核查**: 标注 ✅ 已实现 / ⚠️ 部分实现 / ❌ 未实现

---

## 一、角色定义

| 角色 | 身份标识 | 后端权限类 | 可访问页面 | 不可访问页面 |
|------|---------|-----------|-----------|------------|
| **SuperAdmin** 超级管理员 | `is_superuser=True`, `is_staff=True` | `IsSuperUser` | `/admin/*` 全部 17 页 + 用户端全部 | 无 |
| **Leader** 管理员组长 | `AdminGroupMember.role='leader'`, `is_staff=True` | `IsGroupLeader` | `/admin/products` `/chat` `/notifications` `/applications` `/audit-logs` `/recycle-bin` `/import` `/tasks` + 用户端全部 | `/admin/groups` `/admin/coupons` `/admin/activities` `/admin/tags` |
| **Member** 管理员组员 | `AdminGroupMember.role='member'`, `is_staff=True` | `IsStaffOrAbove` | `/admin/products` `/chat` `/notifications` `/applications` `/import` `/tasks` + 用户端全部 | `/admin/categories` `/admin/brands` `/admin/groups` `/admin/coupons` `/admin/tags` `/admin/audit-logs` `/admin/recycle-bin` |
| **User** 已注册用户 | `is_authenticated=True` | 无后台权限 | `/` `/cart` `/checkout` `/profile` `/orders` `/chat` `/support` `/favorites` `/notifications` `/coupons` `/history` | `/admin/*` 全部 |
| **Guest** 游客 | 未登录 | `AllowAny` | `/` `/category` `/product/:id` `/about` `/auth` | `/cart` `/checkout` `/profile` `/orders` `/chat` `/favorites` `/admin/*` |

---

## 二、业务流程端到端逻辑

### 2.1 商品全生命周期 ✅

> 涉及系统：Django + MySQL + Redis + Celery  
> 涉及页面：`/admin/products` → `/admin/products/create` → `/admin/products/:id/audit` → `/admin/recycle-bin`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/admin/products` → 点击"+ 新建商品" | 填写表单 → 保存草稿 | SuperAdmin/Leader/Member | - | Django+MySQL | `SPU.status='draft'` | 跳回列表，显示"草稿"状态新商品 |
| 2 | `/admin/products/create` → 点击"保存并提交审核" | `status='draft'→'submitted'` | SuperAdmin/Leader/Member | Leader | Django+MySQL | `SPU.status='submitted'` | 组长待审核列表出现该商品 |
| 3 | `/admin/products/:id` → 点击"审核" → 选择"通过" | `status='submitted'→'approved'` | Leader(需 `can_audit_spu()`) | 系统 | Django+MySQL | `SPU.status='approved'` | 商品状态变为"已通过" |
| 4 | 步骤3后5分钟 | Celery 定时任务自动上架 | 系统(Celery) | - | Django+Celery | `SPU.status='approved'→'on_sale'` | 前台首页展示该商品 |
| 5 | `/admin/products` → 点击"上架" | `status='approved'→'on_sale'` | SuperAdmin/Leader | - | Django+MySQL | `SPU.status='on_sale'` | 立即上架 |
| 6 | `/admin/products` → 点击"下架" | `status='on_sale'→'suspended'` | SuperAdmin/Leader/Member | - | Django+MySQL | `SPU.status='suspended'` | 前台不再展示 |
| 7 | `/admin/products` → 点击"删除" | `deleted_at=now` 软删除 | SuperAdmin | 回收站 | Django+MySQL | `SPU.deleted_at` 非空 | 商品进入回收站列表 |
| 8 | `/admin/recycle-bin` → 点击"恢复" | `deleted_at=NULL` | SuperAdmin | - | Django+MySQL | `SPU.deleted_at=NULL` | 商品恢复原状态 |
| 9 | `/admin/recycle-bin` → 点击"永久删除" | 物理删除 DB 记录 | SuperAdmin | - | Django+MySQL | SPU 行删除 | 不可恢复 |

### 2.2 用户注册与登录流程 ✅

> 涉及系统：Django + MySQL + Redis + 163SMTP  
> 涉及页面：`/auth` → `/` → `/admin/login`(管理端)

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/auth` → 填写邮箱+密码 → 点击"注册" | `POST /api/users/register/` | 游客 | 系统 | Django+MySQL | User 表插入 `is_active=True` | 注册成功，跳转登录页 |
| 2 | `/auth` → 输入邮箱+密码 → 点击"登录" | `POST /api/users/login/` → JWT签发 | 游客 | 系统 | Django+SimpleJWT | 返回 `{access, refresh}` | Token 写入 localStorage → 跳转首页 |
| 3 | `/admin/login` → 输入邮箱 → 点击"发送验证码" | `POST /api/admin/login/code/send/` | SuperAdmin/Leader/Member | 163邮件 | Django+Redis+163SMTP | 验证码存入 Redis `email_verify:{id}` 10分钟 | 邮箱收到验证码 |
| 4 | `/admin/login` → 输入验证码 → 点击"登录" | `POST /api/users/login/` 校验 code → JWT签发 | SuperAdmin/Leader/Member | 系统 | Django+Redis+SimpleJWT | `EmailVerifyService.verify_code()` 校验 | 登录成功 → 跳转 `/admin/products` |

### 2.3 客服聊天流程 ✅

> 涉及系统：Django + WebSocket + Redis  
> 涉及页面：`/chat`(用户端) → `/admin/chat`(管理端)

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/chat` → 输入消息 → 点击发送 | 创建 Conversation + Message | User | 管理员 | Django+WS | `Conversation.status='open'` | 管理员端显示新会话 |
| 2 | `/admin/chat` → 看到未读 → 点击会话 | `GET /chat/conversations/{id}/` | Leader/Member | - | Django | 读取消息列表 | 显示完整聊天记录 |
| 3 | 管理员点击接听 | 系统自动设置 `handled_by` | Leader/Member | - | Django | `Conversation.handled_by=user` | 其他管理员收到"已有人回复"提示 |
| 4 | `/admin/chat/:id` → 输入回复 → 发送 | `POST /chat/conversations/{id}/messages/` | Leader/Member | User | Django+WS | `Message.sender_type='admin'` | 用户收到实时推送 |
| 5 | `/admin/chat/:id` → 点击"关闭会话" | `status='open'→'closed'` | Leader/Member | 系统 | Django | `Conversation.status='closed'` | 对话结束，双方不可再发消息 |
| 6 | `/admin/chat/:id` → "释放会话" | `handled_by=NULL` | Leader/Member | 系统 | Django | `Conversation.handled_by=NULL` | 其他管理员可接听 |

### 2.4 购物车流程 ✅

> 涉及系统：Django + MySQL + Redis  
> 涉及页面：`/product/:id` → `/cart` → `/checkout`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/product/:id` → 选择规格 → 点击"加入购物车" | `POST /api/cart/add/` | User | 系统 | Django+MySQL | Cart 表新增记录 | 右上角购物车计数+1 |
| 2 | `/cart` → 修改数量 → 点击 +/- | `PUT /api/cart/{id}/update/` | User | 系统 | Django+MySQL | Cart.quantity 更新 | 小计金额实时更新 |
| 3 | `/cart` → 勾选商品 → 点击"结算" | 跳转 `/checkout` | User | - | React Router | - | 确认订单页 |
| 4 | `/cart` → 点击"删除" | `DELETE /api/cart/{id}/` | User | 系统 | Django+MySQL | Cart 记录删除 | 商品从购物车移除 |

### 2.5 订单+支付流程 ⚠️（支付依赖沙箱）

> 涉及系统：Django + MySQL + Redis + 支付宝/PayPal  
> 涉及页面：`/checkout` → `/payment` → `/order/:order_no`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/checkout` → 确认金额 → 点击"提交订单" | `POST /api/order/create/` | User | 支付 | Django+MySQL | Order 表 `status='pending'` | 跳转 `/payment?order=:no` |
| 2 | `/payment` → 选择支付宝 → 点击"支付" | `POST /api/payment/alipay/` | User | 支付宝网关 | Django+支付宝 | 生成支付链接 | 跳转支付宝收银台 |
| 3 | 用户完成支付宝付款 | 支付宝异步通知回调 | 支付宝 | 系统 | Django+支付宝 | `Order.status='paid'` | 订单状态更新 |
| 4 | `/payment` → 选择 PayPal → 点击"支付" | `POST /api/payment/paypal/` | User | PayPal网关 | Django+PayPal | 生成 PayPal 链接 | 跳转 PayPal |
| 5 | 用户完成 PayPal 付款 | PayPal webhook 回调 | PayPal | 系统 | Django+PayPal | `Order.status='paid'` | 订单状态更新 |
| 6 | `/order/:no` → 点击"取消订单" | `POST /api/order/{no}/cancel/` | User | 系统 | Django+MySQL | `Order.status='cancelled'` | 库存回滚，订单取消 |

### 2.6 通知流程 ✅

> 涉及系统：Django + MySQL + Redis + Celery  
> 涉及页面：`🔔(右上角)` → `/notifications` → `/admin/notifications`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | 客服发送消息 / 订单变更 | Django signals 自动创建 | 系统 | User/Admin | Django+MySQL | Notification 表插入 | 右上角🔔显示未读红点 |
| 2 | 用户点击🔔 → 查看通知列表 | `GET /api/notifications/` | User | - | Django+Redis | 读取通知列表 | 通知弹窗或通知页 |
| 3 | 管理员点击🔔 → 查看通知 | `GET /api/notification/` | SuperAdmin/Leader/Member | - | Django+Redis | 读取通知列表 | 右上角通知卡片 |
| 4 | `/admin/notifications` → 切换 Tab | Tab: 全部/未读/过期/系统/操作 | SuperAdmin/Leader/Member | - | Django+MySQL | 按 `type`/`is_read`/`expired` 过滤 | 分类展示通知 |
| 5 | 每小时(定时) | Celery `check_expired_notifications` | 系统(Celery) | - | Django+Celery | 删除 `expires_at≤now` 记录 | 过期通知自动清除 |

### 2.7 优惠券审批流程 ✅

> 涉及系统：Django + MySQL  
> 涉及页面：`/admin/applications` → `/admin/coupons`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/admin/applications` → 填写优惠券 → 提交 | 创建 Application | Leader/Member | SuperAdmin | Django+MySQL | Application 表 `status='pending'` | 超管待审批列表出现 |
| 2 | Django signal → 通知超管 | `Notification.create` | 系统 | SuperAdmin | Django+通知 | Notification 表 `type='application'` | 超管收到通知 |
| 3 | `/admin/coupons` → 查看 → 点击"审批通过" | `Application.status='approved'` → 自动创建 Coupon | SuperAdmin | 系统 | Django+MySQL | Coupon 表新增 | 优惠券可用 |
| 4 | 用户下单时输入优惠码 → 验证 | `POST /api/promotion/apply/` | User | 系统 | Django+Redis | 折扣计算 | 订单金额更新 |

### 2.8 管理组管理流程 ✅

> 涉及系统：Django + MySQL  
> 涉及页面：`/admin/groups`

| 步骤 | 触发条件 | 执行动作 | 负责角色 | 移交对象 | 涉及系统 | 数据流向 | 产出效果 |
|------|---------|---------|---------|---------|---------|---------|---------|
| 1 | `/admin/groups` → 点击"+ 新建组" | 输入组名+描述→创建 | SuperAdmin | - | Django+MySQL | AdminGroup 表新增 | 新管理组出现在列表 |
| 2 | `/admin/groups/:id` → 点击"添加成员" | 选择用户+角色(leader/member) | SuperAdmin | - | Django+MySQL | AdminGroupMember 表新增 | 成员加入管理组 |
| 3 | `/admin/groups/:id` → 点击"移除成员" | 删除 AdminGroupMember | SuperAdmin | - | Django+MySQL | 成员关联删除 | 成员退出管理组 |
| 4 | 步骤1-3全部记录审计日志 | `create_audit_log('admin_group.*')` | 系统 | - | Django+MySQL | GoodsAuditLog 表 | 操作可追溯 |

---

## 三、数据所有权与可见性矩阵

> ✅ = 可见 | ❌ = 不可见 | - = 不适用

| 数据类别 | 创建者 | 存储位置 | SuperAdmin | Leader | Member | 普通用户 | 游客 |
|---------|--------|---------|:----------:|:------:|:------:|:--------:|:----:|
| **SPU** | Admin(组长/超管/组员) | `goods_spu` | ✅ 全部 | ✅ 本组 | ✅ 本组 | ✅ 仅 `on_sale` | ✅ 仅 `on_sale` |
| **SKU** | 系统自动生成 | `goods_sku` | ✅ 全部 | ✅ 本组 SPU | ✅ 本组 SPU | ✅ 仅关联 `on_sale` SPU | ✅ 仅关联 `on_sale` SPU |
| **Category** | SuperAdmin/Leader | `goods_category` | ✅ 全部 | ✅ 全部 | ❌ | ✅ 全部 | ✅ 全部 |
| **Brand** | SuperAdmin | `goods_brand` | ✅ 全部 | ✅ 全部 | ❌ | ✅ 全部 | ✅ 全部 |
| **Tag** | SuperAdmin | `goods_tag` | ✅ 全部 | ❌ | ❌ | ✅ 仅 `is_active=True` | ✅ 仅 `is_active=True` |
| **ProductMedia** | Admin | `goods_product_media` | ✅ 全部 | ✅ 本组 SPU | ✅ 本组 SPU | ✅ 仅关联 `on_sale` SPU | ✅ 仅关联 `on_sale` SPU |
| **Conversation (客服)** | User | `customer_service_conversation` | ✅ 全部 | ✅ 本组 | ✅ 本组 | ✅ 仅自己的 | ❌ |
| **Message (客服消息)** | User/Admin | `customer_service_message` | ✅ 全部 | ✅ 本组 | ✅ 本组 | ✅ 仅自己的 | ❌ |
| **Order** | User | `order_order` | ✅ 全部 | ❌ | ❌ | ✅ 仅自己的 | ❌ |
| **Payment** | 系统+支付网关 | `payment_*` | ✅ 全部 | ❌ | ❌ | ✅ 仅自己的 | ❌ |
| **Coupon** | SuperAdmin | `promotion_coupon` | ✅ 全部 | ❌ | ❌ | ✅ 已领取的 | ❌ |
| **Cart** | User | `cart_cart` | ❌ | ❌ | ❌ | ✅ 仅自己的 | ❌ |
| **Review** | User | `review_review` | ✅ 全部 | ❌ | ❌ | ✅ 仅自己的 | ✅ 公开评价 |
| **Notification** | 系统 | `notification_notification` | ✅ 全部 | ✅ 本组关联 | ✅ 本组关联 | ✅ 仅自己的 | ❌ |
| **AdminGroup** | SuperAdmin | `goods_admin_group` | ✅ 全部 | ✅ 本组 | ✅ 本组 | ❌ | ❌ |
| **AdminGroupMember** | SuperAdmin | `goods_admin_group_member` | ✅ 全部 | ✅ 本组 | ✅ 本组 | ❌ | ❌ |
| **OperationLog** | 系统 | `notification_operation_log` | ✅ 全部 | ❌ | ❌ | ❌ | ❌ |
| **GoodsAuditLog** | 系统 | `goods_audit_log` | ✅ 全部 | ❌ | ❌ | ❌ | ❌ |

---

## 四、已注册用户个人中心

### 4.1 可见内容

| 页面 | URL | 可见内容 |
|------|-----|---------|
| **个人资料** | `/profile` | 用户名、头像(URL)、邮箱(脱敏)、修改密码按钮、退出登录、收货地址管理 |
| **订单列表** | `/orders` | 全部订单(按时间倒序)、订单号/金额/状态/时间、点击进入详情 |
| **订单详情** | `/order/:no` | 商品列表(图+名+价+数量)、物流信息、支付状态、操作按钮(取消/退款) |
| **我的收藏** | `/favorites` | 收藏商品列表(图+名+价)、点击进入详情、取消收藏按钮 |
| **我的优惠券** | `/coupons` | 已领取优惠券列表、可用/已用/已过期 Tab 切换 |
| **客服聊天** | `/chat` | 历史对话列表(主题+最后消息+时间)、点击进入聊天、发送消息 |
| **通知中心** | `/notifications` | 全部通知(按时间倒序)、未读标记、点击标记已读 |
| **浏览历史** | `/history` | 最近浏览的商品列表 |
| **购物车** | `/cart` | 已加入商品(图+名+价+数量±)、勾选结算、删除 |

### 4.2 不可见内容

| 页面/数据 | 不可见原因 | 拦截方式 |
|-----------|----------|---------|
| `/admin/*` 全部 | 路由守卫 `RoleProtectedRoute` 检测 `role==='none'` 拦截 | 重定向 `/admin/login` |
| 他人订单/支付 | DRF 视图 `get_queryset()` 过滤 `user=request.user` | 返回 404/空列表 |
| 非 `on_sale` SPU | 前台接口 `filter(status='on_sale')` | 不在列表/详情中 |
| 管理员聊天 | `adminChatAPI` 调用 `/chat/` 需 JWT + `is_staff` | 前端菜单隐藏 |
| 系统日志/配置 | 无公开 API | 无路由注册 |
| 管理组数据 | `IsStaffOrAbove` 权限类 | 无对应 API |

---

## 五、游客可见范围

### 5.1 可见内容

| 页面 | URL | 可见内容 |
|------|-----|---------|
| **首页** | `/` | 推荐商品、新品上市、限时特惠、品牌推荐、分类导航 |
| **分类** | `/category` | 全部分类树、分类下商品列表(分页) |
| **商品详情** | `/product/:id` | 商品主图、名称、价格、规格选择、描述、评价 |
| **关于** | `/about` | 平台介绍 |
| **注册/登录** | `/auth` | 注册表单、登录表单 |

### 5.2 不可见内容

| 页面/行为 | 拦截方式 | 提示/效果 |
|-----------|---------|----------|
| 加入购物车 | API 返回 401 | 弹窗"请先登录" |
| 进入结算 | React Router 守卫 | 重定向 `/auth?tab=login` |
| 查看个人资料 | API 返回 401 | 重定向 `/auth?tab=login` |
| 查看订单 | API 返回 401 | 重定向 `/auth` |
| 客服聊天 | React Router 守卫 | 重定向 `/auth` |
| 收藏商品 | API 返回 401 | 弹窗"请先登录" |
| 评价商品 | API 返回 401 | 弹窗"请先登录" |
| Admin 全部 | `ProtectedRoute` 守卫 | 重定向 `/admin/login` |

---

## 六、按钮点击完整链路示例

### 示例1：从首页到下单

| 步骤 | 页面 | 按钮/事件 | 前端逻辑 | 后端 API | 数据库变化 | 目标页面 |
|------|------|----------|---------|----------|----------|---------|
| 1 | `/` | 点击商品卡片 | `navigate(/product/${id})` | - | - | `/product/:id` |
| 2 | `/product/:id` | 选择规格+数量 | 更新 state: `{spec, qty}` | - | - | 同页 |
| 3 | `/product/:id` | +"加入购物车" | `cartAPI.add(skuId, qty)` | `POST /api/cart/add/` | Cart 表 insert | 同页(Toast) |
| 4 | `/cart` | 勾选+"结算" | `navigate(/checkout)` | - | - | `/checkout` |
| 5 | `/checkout` | +"提交订单" | `orderAPI.create(items)` | `POST /api/order/create/` | Order 表 insert | `/payment?order=no` |
| 6 | `/payment` | 选择支付方式 | 跳转支付网关 | `POST /api/payment/alipay/` | Order.status='paid' | 支付网关 |
| 7 | 支付成功回跳 | - | `orderAPI.getDetail(no)` | `GET /api/order/{no}/` | - | `/order/:no`(详情) |

### 示例2：管理员创建商品到前台展示

| 步骤 | 页面 | 按钮/事件 | 前端逻辑 | 后端 API | 数据库变化 | 目标页面 |
|------|------|----------|---------|----------|----------|---------|
| 1 | `/admin/products` | +"+ 新建商品" | `navigate(/admin/products/create)` | - | - | 商品编辑页 |
| 2 | `/admin/products/create` | 填表单+"保存草稿" | `adminAPI.createSPU(data)` | `POST /api/goods/spu/create` | SPU 表 insert `status=draft` | `/admin/products` |
| 3 | `/admin/products` | 该商品行+"提交审核" | `adminAPI.submitSPU(id)` | `PUT /api/goods/spu/{id}/submit` | SPU.status='submitted' | `/admin/products` |
| 4 | `/admin/products` | 组长登录+点击审核 | `navigate(/admin/products/${id})` | `GET /api/goods/spu/{id}/admin` | - | 商品详情审核页 |
| 5 | `/admin/products/:id` | 选择"通过"+"确认" | `adminAPI.auditSPU(id, action)` | `POST /api/goods/spu/{id}/audit` | SPU.status='approved' | `/admin/products` |
| 6 | 5分钟后 | Celery 定时任务 | - | 自动执行 | SPU.status='on_sale' | - |
| 7 | `/` | 游客浏览首页 | `publicAPI.getProducts()` | `GET /api/goods/spu?status=on_sale` | - | 首页展示该商品 |

---

## 七、系统一致性核查

| 流程/功能 | 实现状态 | 备注 |
|----------|---------|------|
| 商品草稿→提交→审核→上架 | ✅ 已实现 | 完整链路，含 Celery 自动上架 |
| 管理组数据隔离 | ✅ 已实现 | `can_operate_spu()` + `Category.admin_group` |
| 组长审核权限 | ✅ 已实现 | `IsGroupLeader` + `can_audit_spu()` |
| 回收站(恢复/永久删除) | ✅ 已实现 | 软删除+二元操作 |
| 用户注册 | ✅ 已实现 | 邮箱+密码+JWT |
| 邮箱验证码登录 | ✅ 已实现 | 163SMTP + Redis 10分钟 |
| 客服一对一(handled_by) | ✅ 已实现 | 锁定+释放API |
| 客服浮窗(ChatFloatWidget) | ✅ 已实现 | 右下角💬浮窗+未读计数 |
| 通知浮窗(NotificationFloat) | ✅ 已实现 | 右上角🔔+轮询+关闭 |
| 通知分类Tab | ✅ 已实现 | 全部/未读/过期/系统/操作 |
| 过期通知定时清除 | ✅ 已实现 | Celery beat 每小时 |
| 购物车CRUD | ✅ 已实现 | 增删改查+数量± |
| 支付宝支付 | ⚠️ 部分实现 | API已对接，依赖沙箱环境测试 |
| PayPal支付 | ⚠️ 部分实现 | API已对接，依赖沙箱环境测试 |
| 优惠券申请→审批→创建 | ✅ 已实现 | Application→SuperAdmin审批→Coupon自动创建 |
| 全局配置中心 | ✅ 已实现 | 53项参数集中在 `base.py` + `constants.ts` |
| 中英语言切换 | ✅ 已实现 | 默认中文，LanguageSwitch 下拉切换 |
| 前端路由权限 | ✅ 已实现 | `RoleProtectedRoute` 按角色过滤菜单 |
| 商品批量导入 | ❌ 未实现 | `/admin/import` UI存在但后端未完成 |
| 商品数据导出 | ❌ 未实现 | `/admin/products` "导出"按钮无后端逻辑 |
| JWT黑名单全API校验 | ✅ 已实现 | `JWTBlacklistMiddleware` 覆盖所有 `/api/` 请求 |
| DRF默认权限 | ✅ 已实现 | `DEFAULT_PERMISSION_CLASSES = [IsAuthenticated]` |
| 限流中间件 | ✅ 已实现 | 4个端点独立限流+封禁5分钟 |
| Docker 7服务健康 | ✅ 已实现 | Nginx+Django+Celery Worker+Beat+MySQL+Redis+RabbitMQ |
| 商品SKU自动生成 | ✅ 已实现 | 规格维度笛卡尔积自动生成 |
| 操作日志审计 | ✅ 已实现 | 中间件+GoodsAuditLog双轨记录 |
| 通知按类型标签 | ✅ 已实现 | Badge组件颜色区分(system/operation/error/notification/security) |
| 过期通知模型 | ✅ 已实现 | `Notification.expires_at` 字段+ `is_expired` property |
| 客服WebSocket实时推送 | ✅ 已实现 | JWT认证+心跳+ACK重试+限流 |
