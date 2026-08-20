# Ziggner 管理后台 · 设计资产盘点（Design Asset Inventory）

> 文档定位：基于**当前已上线**的管理后台，从「设计资产」视角完整盘点全局框架、通用组件、业务页面、操作流程与交互规范，供**设计评审、前端开发对齐、第三方协作**使用。
>
> 基线版本：前端 Cloudflare Pages `cca73a26`（2026-08-21 发布）· 后端 `ziggner-django:v1.0.5`（Django 5.2.17 / DRF 3.15.2）
>
> 仓库：`github.com/Devil-Hui/Ziggner` · master @ `3898eb5`

---

## 1. 上线信息（可访问地址与版本）

| 端 | 地址 | 承载 | 版本 |
|---|---|---|---|
| 管理后台 | https://admin.ziggner.com | Cloudflare Pages（SPA） | Version `cca73a26-747c-4f5e-8b34-322b9ec0dfc2` |
| 商城（用户端） | https://www.ziggner.com | Cloudflare Pages | 同上（同构部署，多域同桶） |
| 商城（独立站别名） | https://shop.ziggner.com | Cloudflare Pages | 同上 |
| API 后端 | https://api.ziggner.com | Docker Compose（2C4G）· gunicorn 2×gevent | `ziggner-django:v1.0.5` |
| 基础设施 | — | MySQL（命名卷 mysql_data）· Redis 7.4 · Cloudflare R2（媒体） | 与后端同版编排 |

- 管理后台路由前缀：`/admin/*`；入口 `/admin/login`；未登录访问任意 `/admin/*` 由 `RoleProtectedRoute` 重定向至登录页；已登录访问登录页自动跳 `/admin/products`。
- 后端 API 统一响应信封 `{code, data, status, message}`；管理接口使用独立 Admin Token 认证。

---

## 2. 技术栈与设计令牌（Design Tokens）

### 2.1 技术栈
React 18 + TypeScript（strict）+ Vite + **styled-components**（页面内 CSS-in-JS）+ react-router-dom v6 + 中英双语 i18n（`src/i18n`）。设计令牌集中定义于 `src/theme/tokens.ts`（`Color / Spacing / Radius / Shadow / FontSize / FontWeight / Layout / Breakpoint / Transition / FocusRing`），修改即全局联动。

### 2.2 颜色令牌
| Token | 值 | 用途 |
|---|---|---|
| `Color.primary` | `#1a56db`（Ziggner Blue） | 品牌主色 / 主按钮 / 链接 |
| `Color.primaryHover / Light / Dark` | `#1e40af / #dbeafe / #1e3a8a` | 交互反馈 |
| `Color.bg.page / card / dark` | `#f8f9fa / #fff / #1a1a1a` | 页面底 / 卡片 / 深色 |
| `Color.text.primary / body / secondary / muted` | `#111827 / #374151 / #6b7280 / #767676` | 文字层级（muted 满足 WCAG AA 4.5:1） |
| `Color.status.success / warning / error / info` | `#059669 / #d97706 / #dc2626 / #2563eb` | 状态色 |
| `Color.border.light / medium / dark` | `#e5e7eb / #d1d5db / #9ca3af` | 边框层级 |
| `FocusRing` | `0 0 0 3px rgba(26,86,219,.25)` | 全局焦点环 |

### 2.3 度量令牌
- **间距**：8px 基准网格 → 4/8/12/16/20/24/32/40/48
- **圆角**：2/4/8/12/16/9999；**阴影**：card/md/lg/dropdown/modal/focus 六级
- **字号**：12/13/14(基准)/15/17/20/24/28/36；**字重**：400/500/600/700
- **过渡**：fast 0.15s / normal 0.2s / slow 0.3s
- **断点**：mobile 768 / tablet 1024 / desktop 1280（后台当前以桌面为主）

> ⚠️ 已知不一致：token 主色为**品牌蓝 `#1a56db`**，但部分早期列表页（订单页 Tab/主按钮、分页激活态、商品列表操作按钮）**硬编码红色 `#e74c3c`**。数据表 `DataTable` 采用「Lumiere」奶油色系（墨色 `#1a1712`、灰 `#8a8175`、CLAY 蓝 `#1a56db`）。建议设计评审阶段统一主色体系。

---

## 3. 全局框架（AdminLayout，`/admin/*` 壳层）

整体为「左侧菜单树 + 顶部导航栏 + 右侧内容区」三段式（`AdminLayout.tsx`），flex 布局、`min-height:100vh`。

### 3.1 左侧菜单树（Sidebar）
- **宽 220px，折叠态 64px**（仅图标 + title 提示）；折叠状态持久化于 `localStorage('admin_sidebar_collapsed')`；**视口 <1366px 自动折叠**。
- 深色底 `#1a1a2e`，文字 `#a0aec0`；顶部品牌区 `Ziggner`（Playfair Display 衬线）。
- 导航按 5 个分组（大写英文小标题）：**商品运营**（商品/分类/品牌/标签）、**履约**（订单）、**沟通**（客服会话/通知/申请单）、**营销**（营销券/活动）、**系统管理**（用户组/审计日志/回收站/异步任务/RBAC/邮件模板）。
- 菜单项 `NavLink`：hover 浅白底；**激活态**左侧 3px 蓝边条 `#1a56db` + 浅蓝底 + 加粗。
- **红点徽章**：客服会话未处理数（进页面拉取 + **60s 轮询**），显示于「客服会话」菜单项右上角。
- **RBAC 菜单裁剪**：`useAllowedMenuPaths()` 按当前用户权限过滤菜单项，空分组自动隐藏（组长/成员看不到无权限入口）。
- 底部折叠开关按钮（chevron 旋转动画）。

### 3.2 顶部导航栏（Header，56px）
- 白底卡片式，左侧**面包屑**（`首页 › 分组 › 页面`，按路由自动生成）；右侧依次：
  - **语言切换**（中/英下拉）
  - **通知铃** `NotificationBell`（未读红点角标，点击跳通知页）
  - **用户菜单**：用户名 + 角色标签（超级管理员 / 组长 / 成员）；下拉卡片含账户信息（用户名+角色）与「退出登录」；登出先 `fire-and-forget` 调后端失效 token 再清本地态并跳 `/admin/login`。

### 3.3 右侧内容区（Content）
- 内边距 `Spacing.xxl`(24px)，`overflow-y:auto`；**<768px 时降为 16px**。
- 页面内容经 `<Outlet/>` 渲染；懒加载路由统一 `Suspense fallback`（居中 "Loading..."）。

### 3.4 底部状态栏
- **当前无**全局底部状态栏。系统级状态通过页面内 Toast / 徽章 / 顶部通知承载。
- 若后续需要，可在 Layout 底部增加「异步任务进度 / 系统健康」全局状态栏（现任务进度在 `/admin/tasks` 页内展示）。

---

## 4. 通用组件库（`components/admin/common`）

### 4.1 按钮族（`ui.ts`，统一 BaseBtn 骨架：圆角/光标/禁用 opacity .6/过渡）
| 组件 | 形态 | 用途 |
|---|---|---|
| `PrimaryBtn` | 实心蓝 `#1a56db` | 创建/新增/提交 |
| `SecondaryBtn` | 描边灰 | 取消/返回 |
| `DangerBtn` | 红描边 → hover 红填充 | 删除/移除 |
| `OutlinePrimaryBtn` | 蓝描边 → hover 蓝填充 | 行内肯定操作（添加成员） |
| `SuccessBtn` | 绿描边 → hover 绿填充 | 通过/批准/上线 |
| `WeChatBtn` | 微信绿实心 `#07c160` | 微信语义操作 |

按钮禁用态：`opacity:.6` + `cursor:not-allowed`；行级操作按钮常以 `busyNo===id` 在请求中禁用。

### 4.2 表单控件
`Input`（高 38px，compact 32px；focus 蓝边框+焦点环）、`Select`（32px）、`FormGroup/Label/Hint/ErrorText`（字段分组/标签/提示/行内错误红字）。

### 4.3 数据表格 `DataTable`
- 白卡圆角 14px、细边框、轻阴影；表头 11px 大写灰色 + 字母间距（Lumiere 风格）；**可排序列**（`sortable`）hover 变蓝 + pointer。
- **四态内置**：`loading`（骨架屏）→ `error`（内联红字 + 重试按钮）→ `empty`（空态文案/标题/图标）→ `data`；支持 `onRowClick` 可点行（hover 浅蓝底）、自定义列渲染、`rowKey`。

### 4.4 分页 `Pagination`
- 右对齐；首/尾 + 当前页±2 省略号折叠；前后箭头；「共 N 条」；单页隐藏；激活页红底白字（沿用页面级红色系，见 2.3 不一致说明）。服务端分页，默认 20 条/页。

### 4.5 筛选器
- `FilterBar`：状态下拉 + 「重置」按钮 + 可扩展 children（品牌/分类等）。
- `SearchFilter`：搜索输入框（占位符可配）。多数列表页为「搜索框回车触发 / 筛选下拉即改即查，并重置页码」。

### 4.6 对话框族（全屏遮罩 `rgba(0,0,0,.4)`，点击 Dialog 内部阻止冒泡）
| 组件 | 尺寸 | 特性 |
|---|---|---|
| `ConfirmDialog` | 400px | 确认/取消；**Esc 关闭**；遮罩点击关闭；`danger` 确认按钮红底；用于取消订单/退款/删除等 |
| `DeleteConfirmDialog` | max 420px | 删除专用：高亮删除对象名 +「此操作不可撤销」；确认按钮**加载态**（"删除中..."）禁用双按钮 |
| `FormDialog` | max 560px / 85vh | 表单弹窗：头部 X 关闭 + 底部取消/提交（`submitVariant` primary/danger，默认 danger）；**遮罩默认不关闭**（`closeOnOverlayClick=false`，防误触丢失已填内容）；Body 可滚动；提交可禁用 |
| `PromptDialog` | 420px | 单输入：自动聚焦、**Enter 提交**、Esc 关闭；用于填物流单号/审核备注/驳回原因 |

### 4.7 状态徽章 `StatusBadge`
预置色块映射：SPU（草稿灰/待审核蓝/已通过绿/已驳回红/已上架绿/已挂起粉/已下架灰）、任务（等待橙/处理中蓝/成功绿/失败红）、申请（待审核橙）。统一圆角小标签 + 中文文案。

### 4.8 其他通用
- `PageHeader`：页标题 + 面包屑 + 右侧操作区（各列表页标准头部）。
- `RoleBadge`：组长（琥珀）/ 成员（蓝）角色徽章。
- 全局反馈（`components/common`）：`AppErrorBoundary`（渲染错误兜底）、`ErrorState`/`ErrorRetry`/`EmptyState`、`LoadingSkeleton`（table 等类型骨架）、`LoadingState`、`GlobalLoading`、`GlobalErrorToast`、`ReauthModal`（401 强制重登）、`Breadcrumb`、`Button`、`Input`、`HorizontalScroll`、`Honeypot`。
- 客服悬浮件：`ChatFloatWidget`（页面右下角）、`NotificationFloat`（已弃用，与铃铛重复）。

---

## 5. 业务页面盘点（路由 · 布局 · 交互）

### 5.1 商品域
| 页面 | 路由 | 关键设计 |
|---|---|---|
| **商品列表** `AdminProducts` | `/admin/products` | 顶部：新建商品 + 客服入口 + 右下 ChatFloatWidget；筛选：状态下拉（7 态）+ 搜索（回车）；列：复选框｜商品（名称+品牌·SKU数）｜价格区间｜状态徽章｜分类路径｜操作。**行内操作按状态机切换**：编辑；草稿→上架/提交审核；待审核→审核（跳转）；已通过→上架；已上架→暂停/下架；已挂起→恢复；删除仅超管。**批量操作**：勾选多行浮现批量上架/下架/审核。删除用 ConfirmDialog(danger)。性能：memo 行组件 + Set 选中集 |
| **商品表单** `AdminProductForm` | `/admin/products/create`、`/admin/products/:id` | 单页 4 分区（基础信息｜媒体｜分类与规格｜定时上下架）+ 左侧 sticky 分节导航（完成度计数 + 概览摘要：类型/品牌/分类/变体数/总库存）+ 底部上一节/下一节。字段：商品类型（实体/虚拟联动免运费）、名称/描述、品牌/分类（树形缩进 L1-L3）、标签多选、**动态规格**（规格维度 + 值 chip）、**Shopify 风格 SKU 卡片**（变体名自动拼接、价格、库存 -/+ 长按增减、track_inventory 开关、折扣、SKU Code、条码）。媒体：`MediaManager` 四尺寸（thumb/list/large/original）WebP 上传，新建模式暂存 IndexedDB，提交时全屏进度遮罩（进度条+文件数+百分比）。提交流：校验 → createSPU → 逐张上传 → batchCreate/UpdateSKU → 可选提交审核 → 打标签 → 定时。**防抖保存 800ms** + `beforeunload` 未保存守卫 |
| **商品审核** `AdminProductAudit` | `/admin/products/:id/audit` | 三 Tab（基本信息｜SKU 规格｜标签）；仅 submitted 显示审核区：备注（**驳回必填**）+ 拒绝(红)/通过(绿)，提交中禁用显示「处理中」；审核成功 1s 后跳回列表；相关聊天会话 Popup（跳 `/admin/chat?product_id=`） |
| **分类** `AdminCategories` | `/admin/categories` | 左右分栏：左分类树（展开/缩进/L 级 tag/选中红左边条）+ 右详情表单；模式机 view/create/edit/migrate（**仅超管**）；创建含父级 Select（自动算 level）、管理组；迁移：L2→L3 执行商品迁移 |
| **品牌** `AdminBrands` | `/admin/brands` | 新建（仅超管）+ 搜索；列：Logo 缩略图｜名称(可排序)｜描述(ellipsis)｜状态｜操作；编辑弹窗含 Logo 上传（压缩至 0.5MB/512px + 上传进度，预览可移除） |
| **标签** `AdminTags` | `/admin/tags` | 新建（仅超管）+ 搜索；列：名称(可排序)｜**颜色圆点**｜状态｜创建时间；弹窗含圆形 swatch 色板（`TAG_COLOR_PALETTE`，选中描边+hover 放大） |
| **回收站** `AdminRecycleBin` | `/admin/recycle-bin` | 列：ID(等宽)｜名称｜品牌｜分类｜SKU 数｜删除时间｜操作：恢复(绿)/永久删除(红，**二次确认**流：第一次"继续"后再弹"再次确认"）；Toast 为 fixed 右上角浮层 |
| **批量导入** `AdminImport` | （未接入路由，孤儿页） | 五态状态机 upload→parsing→preview→importing→result；虚线拖拽区（拖入红色高亮）+ 点击选文件（.csv/.xlsx/.xls）；预览前 50 行 + 记录数徽章；异步 task_id + 结果卡 |

### 5.2 履约域
| 页面 | 路由 | 关键设计 |
|---|---|---|
| **订单管理** `AdminOrders` | `/admin/orders` | **双 Tab：订单 / 售后**。订单筛选：状态下拉（6 态）+ 支付状态下拉（4 态）+ **渠道下拉（动态）**——「全部渠道(总数) / 商城(mall)(订单数) / 各代言人渠道(名称+订单数)」，选项由 `/order/admin/channel-stats/` 实时聚合（`channelStats`），选中即按 channel 请求；关键词搜索（回车）。列：订单号｜渠道名｜状态色块徽章（Bootstrap 色系）｜支付状态｜实付($)｜商品数｜时间｜操作（详情；paid→发货填单号；pending_payment/paid→取消）。**详情为右侧粘性 SidePanel（380px）**：状态/支付/金额/支付方式/收件人/物流/地址 + 商品明细表 + 关联售后表；<820px 变纵向。操作反馈：取消/退款用 ConfirmDialog(danger)，发货/审核备注用 PromptDialog |
| **售后管理**（订单页 Tab2） | `/admin/orders` | 筛选：状态（待审/通过/驳回/处理中/完成）+ 类型（退货/换货/补发）+ 搜索；列：售后单号｜订单号｜类型｜状态｜金额｜原因｜操作：待审→审批(绿，填备注)/驳回(红)；已通过→完成退款（ConfirmDialog） |

### 5.3 沟通域
| 页面 | 路由 | 关键设计 |
|---|---|---|
| **客服会话列表** `AdminChatList` | `/admin/chat` | 列：会话ID(#灰)｜用户名｜主题(截断)｜状态徽章｜**未读红角标**｜最后消息时间(今天/昨天/HH:mm)；搜索 + 状态筛选；**12s 轮询**（无 WS） |
| **客服会话详情** `AdminChatDetail` | `/admin/chat/:id` | **三栏**：会话列表(含占用者🙋)/聊天区/订单面板(可收起，窄屏浮动)。头部：open→「标记已回复」绿、「关闭会话」红。ContextBar：客户、咨询商品、首单（单号/数量/金额/状态）。消息 `ChatBubble` 按 sender_type 左右分侧，支持 text/image/video/product_card；自己消息显 sending/sent/read 回执；消息过滤 Tab + 向上加载更早。**实时**：WS `wss://api.ziggner.com/ws/chat/<id>/`（增量合并 + ACK + 指数退避重连）+ **3s 静默轮询**兜底；进入会话批量 ACK + HTTP 已读。**占用锁定**：他人占用显 LockBanner，超管/组长可「强制接手」；`can_reply` 控制输入禁用；发送含图片压缩、乐观插入、失败 ErrorBar |
| **通知中心** `AdminNotifications` | `/admin/notifications` | Tab：全部/未读/已过期/系统/操作；顶部刷新 + 全部已读(有未读才显示)；列：类型徽章(system/operation/notification/security/error/客服)｜标题｜内容｜已读(红绿)｜时间｜操作(未读→标记已读)；乐观更新 |
| **申请单** `AdminApplications` | `/admin/applications` | Tab：我的/待审核；顶部下拉发起：类目改名/品牌改名/组长变更/优惠券；列：类型｜摘要(改名→、组长:、券:面额)｜状态｜申请人｜时间｜操作（待审→审核弹窗批/驳+评论；我的券 draft/rejected→编辑+提交）；leader_change 含变更类型(晋升/调岗/替换/离职)、生效日期、交接计划；Esc/遮罩可关 |

### 5.4 营销域
| 页面 | 路由 | 关键设计 |
|---|---|---|
| **营销券管理** `AdminCoupons` | `/admin/coupons` | 列：ID｜券码｜类型徽章(满减/折扣)｜优惠｜门槛｜最高抵扣｜可叠加｜有效期｜使用量(used/total)｜状态(进行中/未开始/已过期/已停用)｜审核状态｜操作(编辑/推广码/提交审核/删除)。**表单 FormDialog(560px，遮罩不关窗、关窗留草稿)**：券码(可随机 8 位大写数字，编辑锁定)、类型、面额、最低消费、最高抵扣、可叠加/启用开关、起止(datetime-local，默认+30 天)、发行量(默认 1000)、每人限领；**800ms 防抖保存**；删除=软删除停用(ConfirmDialog)。**提交审核流**：DRAFT/REJECTED 可提交 |
| **代言人券/推广码生成**（券行内「推广码」） | — | 弹窗(760px)：生成数量(1-200)/前缀(≤8 大写)/名称/备注 → 批量生成推广码；列表列：券码｜状态｜领取数｜去重用户｜已支付订单｜GMV（**含合计行**）；行操作：**二维码**(QRCodeSVG→`/coupon/<code>`)｜复制直达链接(admin.域名回退)｜启停｜删除。**看板即该统计表**（无卡片式 KPI；聚合字段即代言人渠道看板数据源） |
| **营销活动** `AdminActivities` | `/admin/activities` | 列：名称｜类型(满减/折扣/每满)｜起止｜状态徽章｜编辑/删除；顶部创建+搜索+旋转刷新；表单：名称、类型、**阶梯规则 builder**（min_amount/discount/max_discount 行可增删，>1 禁用删）、起止；编辑模式加 **SKU 关联**（300ms 防抖搜索 + 已选 chip + 活动价）；校验失败汇总错误 |

### 5.5 系统域
| 页面 | 路由 | 关键设计 |
|---|---|---|
| **RBAC 权限管理** `AdminRbac` | `/admin/rbac` | 双 Tab：**矩阵 / 用户**。矩阵页：左列角色列表(180px，单选高亮) + 右侧权限矩阵（权限按 domain 分组、`PermGrid` `minmax(220px,1fr)` 自适应勾选网格）；勾选存 draft，点「保存」提交当前角色（**superadmin 不展示**并提示条）。用户表列：account_no｜username｜email｜角色(超管+小徽章)｜is_active(绿灰状态)｜编辑角色；搜索 + 创建管理员。弹窗：①编辑角色 Modal(420px，勾选角色，遮罩不关防误触)；②创建管理员 FormDialog：用户名/密码(≥8 位含大小写+数字或符号)/邮箱/姓名/角色/部门/电话/国家码/启用 Toggle/绑定管理组(选中才显组长或成员下拉)/备注；成功显示**账号号(等宽字体)+「再创建一个」** |
| **用户组管理** `AdminGroups` | `/admin/groups` | 左侧组列表 DataTable + 右侧**成员面板 MemberPanel(400px，max-height 72vh)**；弹窗内「建组/建管理员」双 Tab。组列表列：name(可排序)/slug(可排序)/created_at/操作(查看成员+删除)；**默认组 pending 删除被拦截**。成员列：account_no/username/RoleBadge(组长/成员)/移除；头部「添加成员」。弹窗：创建组(name+slug 校验)、创建管理员(同 RBAC 全字段)、添加成员(account_no 占位 ZG-… + 角色下拉，**仅超管可选 leader**)、删除成员/组(ConfirmDialog 展示成员数)。**模块级草稿**：关闭弹窗保留已填内容（密码/用户名不入草稿，安全） |
| **审计日志** `AdminAuditLogs` | `/admin/audit-logs` | FilterBar（输入框 + 红色搜索按钮）按 SPU 名筛选（实时改参重置页码）；列：user｜action｜resource_type｜resource_id(等宽 MonoText 底色)｜**changes(JSON 缩进预览块，高 80px 可滚动)**｜ip_address｜created_at |
| **异步任务** `AdminTasks` | `/admin/tasks` | 列：task_id(>24 字符省略 + title 悬浮)｜type(浅蓝标签)｜state(StatusBadge)｜**progress**｜created_at；**进度条 120×6px 圆角轨道 + 红色填充**（width 过渡 0.6s）+ 百分比；**2s 轮询**（仅当存在 PENDING/PROCESSING 任务时启动，无任务自动停止）；顶部手动刷新 |
| **邮件模板可视化编辑器** `AdminEmailTemplates` | `/admin/email-templates` | **三栏**：左 Sidebar(200px 模板列表，选中项主题色左边条) + 中 EditorCol(flex) + 右 **Palette(248px，position:sticky 顶部吸附)**；整体 max-width 1280px 居中。中栏顶部 SegBtn 三段切换「**编辑 / 预览 / 代码**」；主题输入框；画布 `Canvas`(600px 固定宽=主流邮件客户端宽度，contentEditable，内联样式 h1/h2/.btn/img)；预览用 `iframe srcDoc`；代码模式等宽 textarea；底部 Active 复选框 + 「恢复默认」(ConfirmDialog) + 保存。**右侧调色板分组**：排版(H1/H2/段落)、样式(B/I/U)、颜色(12 圆点 Swatch 预设 + `<input type=color>` 自定义)、对齐(左⇤/中↔/右⇥)、插入(图片/按钮/分割线/间距)；全部经 `document.execCommand` 执行并 `syncFromCanvas` 回写 htmlBody。占位符 `{code}` 随画布/代码直接编辑，底部 Hint 提醒勿删，预览与保存原样保留 |
| **后台登录** `AdminLogin` | `/admin/login`（独立无 Layout） | 奶油底 `#f7f4ef` 满屏居中 420px 白卡 + 右下巨型衬线 'Z' 水印；品牌名 Playfair Display 衬线、CLAY 蓝主题（与 C 端一致）。**三重认证**：用户名/邮箱 + 验证码(数字过滤+字距 4px +「发送验证码」倒计时) + 密码 + Turnstile 人机验证。已登录自动重定向；未发码/缺码/缺 token 前置提示；失败保留验证码与 token 直接重试；提交按钮 loading 态 |

---

## 6. 核心操作流程

### 6.1 商品审核流
```
草稿 draft ──提交审核──▶ 待审核 submitted ──通过──▶ 已通过 approved ──上架──▶ 已上架 on_sale
   ▲                        │                                          │
   └──编辑/重新提交──────────┴──驳回(必填备注)──────────────────────▶ 已驳回 rejected
已上架 on_sale ──暂停▶ 已挂起 suspended ──恢复▶ on_sale；on_sale/suspended ──下架▶ off_sale
```
- 列表页按状态渲染可用操作；审核页仅 submitted 可审，驳回必填备注，成功 1s 后跳回列表。
- **组长/成员自治**：组内自治（本组分类建子项→提交审核→超管终审）；组创建/改名/删除、品牌/标签写操作**仅超管**。

### 6.2 批量操作
商品列表勾选多行（复选框 + Set 选中集）→ 浮动批量工具条：批量上架 / 批量下架 / 批量提交审核。

### 6.3 导入/导出
- **导入**：拖拽/选择文件 → 前端解析预览前 50 行 → 确认 → 异步 `task_id` → 结果卡（成功绿/失败红）→ 继续导入。
- **导出**：商品域与订单域当前**无内置导出按钮**（导出能力以异步任务形式预留于 `/admin/tasks` 的任务框架；若需报表导出可复用任务框架扩展）。

### 6.4 实时搜索与筛选
- 搜索框**回车触发**（防抖请求）；状态下拉/渠道下拉/支付状态**即改即查**；所有筛选变更**重置页码至 1**。
- 渠道下拉为**动态聚合**：选项与订单数来自 `channel-stats` 接口（全部/商城/代言人A/B…），支持渠道归因筛选。

### 6.5 售后审核流
```
待审 pending_review ──审批(备注)/驳回(备注)──▶ 已通过 approved ──完成退款──▶ completed
                                            └─驳回 rejected（可重新发起）
```

### 6.6 代言人券（推广码）运营流
新建/编辑券（草稿）→ 行内「推广码」批量生成（数量/前缀/名称）→ 生成带二维码的直达链接 `/coupon/<code>` → 用户领券（`claim_via_promo_code`，归属代言人）→ 核销按码累计 → **看板统计**（领取数/去重用户/已支付订单/GMV，含合计行）→ 券可提交审核（DRAFT/REJECTED→待审）→ 启停控制。

---

## 7. 交互反馈规范

| 类型 | 实现 | 规格 |
|---|---|---|
| **成功/失败 Toast** | 页面内顶部 `Toast`（绿 `#e8f5e9`/红 `#fde8e8`） | 3s 自动消失；回收站/全局使用 fixed 右上角浮层（fadeIn） |
| **警告** | 表单 `ErrorText`（字段级红字）/ `AlertBar`（红色错误条+icon）/ 内联红字 | 随提交/校验即时呈现 |
| **确认对话框** | `ConfirmDialog`（danger 红确认钮） | 用于删除/取消订单/完成退款/恢复默认等高风险操作；Esc 或遮罩关闭 |
| **二次确认** | 回收站永久删除：第一次「继续」→ 再弹「再次确认」 | 最高风险操作双保险 |
| **进度指示** | 按钮 loading 态（禁用+文案"处理中/删除中…"）；上传全屏进度条+文件计数+百分比；任务进度条 120×6px 红色填充+百分比+2s 轮询 | 长任务必有可见进度 |
| **乐观更新** | 通知已读、会话消息发送（sending→sent→read 回执） | 失败回滚 + ErrorBar |
| **全局兜底** | `AppErrorBoundary`、`GlobalErrorToast`、`ReauthModal`（401 强制重登）、`ErrorRetry` | 渲染/请求/会话三重兜底 |
| **防抖** | 表单保存 800ms、活动 SKU 搜索 300ms | 高频写操作防抖 |

---

## 8. 响应式适配

- **现状：桌面优先，仅适配少量窄屏**（管理后台定位为运营桌面工具）：
  - 侧边栏 <1366px 自动折叠（64px 图标态）；
  - 内容区 <768px 内边距 24→16px；
  - 订单页 <820px 详情 SidePanel 变为纵向、非 sticky；
  - RBAC 权限矩阵网格 `auto-fill minmax(220px,1fr)` 自适应列数。
- 断点令牌已定义（768/1024/1280），**移动端完整适配未实现**（表单/表格/侧栏抽屉化等为后续工作项）。

---

## 9. 数据展示规范

- **列排序**：`DataTable` `sortable` 列（品牌/标签名称等）表头可点击排序，hover 蓝色提示。
- **筛选**：服务端筛选（状态/支付/渠道/关键词），筛选变更重置页码；渠道选项携带实时订单数。
- **分页**：服务端分页，20 条/页（`PAGE_SIZE=20`，后端上限 100）。
- **行级权限过滤**：
  - 前端：`useAllowedMenuPaths()` 按用户权限裁剪菜单与空分组；
  - 后端：列表接口按登录用户 `scope_orders` 行级隔离（组长仅见本组数据），按钮级权限（创建/删除/迁移等仅超管）前后端双校验；
  - 详情展示：`account_no` 替代内部自增 id 对外，杜绝 IDOR。
- **金额/数字**：金额统一 `$xx.xx` 两位小数；任务/资源 id 用等宽字体；超长文本 ellipsis + title 悬浮。

---

## 10. 已知不一致与后续建议（供设计评审）

1. **主色双轨**：令牌品牌蓝 `#1a56db` vs 部分页面硬编码红 `#e74c3c`（订单 Tab/主按钮、分页激活、商品列表操作）。建议统一为主蓝 + 语义色体系。
2. **表格双轨**：多数页用 `DataTable`（Lumiere 白卡），订单/售后页保留本地 `Table`。建议统一迁至 DataTable 并补齐排序/筛选规范。
3. **Toast 双轨**：页面内顶部 Toast 与 fixed 右上角浮层并存。建议统一为全局 Toast 队列。
4. **孤儿页**：`AdminImport` 未接入路由与侧边栏，如需开放请挂载。
5. **底部状态栏缺失**：如需全局任务/健康状态常驻，可新增 Layout 底部状态栏。
6. **导入导出**：当前无订单/商品导出按钮，导出能力可复用异步任务框架补充。

---

*本文档由代码实盘盘点生成（2026-08-21），以 `master @ 3898eb5` 为基准；如有设计变更请同步更新。*
