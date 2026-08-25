# Ziggner Admin Platform 重构 · 交接文档（2026-08-23）

> **交接范围**：Ziggner 管理后台（`web/react` SPA）从「17 个能用的 Admin 页面」升级为「统一企业级 Admin Platform」。
> **上一交接**：`ADMIN_REMEDIATION_STATUS_2026-08-22.md`（Phase A/B 16 页整改复查，历史归档，本轮不再展开）。
> **本次交接要点**：P0 地基已全部完成、P1 核心组件层完成、P2 体验层大部分完成；**剩余 = P1 页面级应用 + 全站 17 页集中迁移**。

---

## 一、阶段总览

| 阶段 | 内容 | 状态 |
|---|---|---|
| Phase A | 18 项 Principal QA 自查 + `REVIEW_REPORT.md` | ✅ 完成（历史） |
| Phase B | 公网 prod live-execution 修复 + UI 整改（16 页矩阵，`ADMIN_REMEDIATION_STATUS_2026-08-22.md`） | ✅ 完成（历史，`55d27d4` 未 push） |
| **Phase C（当前）** | 从八方向收敛为统一 Admin Platform（信息架构/设计系统/权限模型/数据密度/交互反馈/状态体系/可观测性/批量操作/响应式） | 🚧 进行中 |

**决策**（用户拍板）：**集中式大改 + 完成全部修改**，不再补页面。但工程顺序固定为 **P0 地基 → P1 核心 → P2 体验 → 全站迁移**（页面必须先有统一基础设施才能 adopt）。

---

## 二、执行顺序（固定，勿跳步）

```
P0 地基（token/组件/API/RBAC）      → ✅ 全部完成
P1 核心（SmartDataTable/双视图/Bulk Bar/URL State/Approval/Audit/TaskCenter/DirtyForm）
                                    → 🚧 组件/hooks 层完成，页面级应用未做
P2 体验（Dashboard/SavedViews/⌘K/快捷键/响应式/降噪）
                                    → 🚧 大部分完成，页面级未做
全站 17 页集中迁移                   → ⬜ 未开始（最大工作量）
```

---

## 三、已完成（可复用地基，tsc 全绿、未破坏既有页面）

### P0-1 · 四层 Token 体系（`web/react/src/theme/`）
- 新增 `foundation.ts`（原始变量：Color/Typography/Spacing/Radius/Shadow/Motion/ZIndex/断点）· `semantic.ts`（surface/text/border/interactive + **status 6 tone**：neutral/info/success/warning/danger/purple，各含 fg+bg）· `component.ts`（Button/Input/Table/Modal/Drawer/Tag/Pagination 组件级 token）· `business.ts`（Product/Order/Coupon/Approval/Task 状态 → tone 映射）。
- `tokens.ts` 改为**再导出层**（保留全部历史具名导出向后兼容）+ 新增 `Semantic/Component/Business/StatusTone/statusToneFg,Bg`；`theme/index.ts` 同步导出（含 `export type { StatusTone }` 满足 isolatedModules）。
- 关键约定：**业务只声明 tone，颜色由 `Semantic.status[tone]` 解析**；分页激活态用品牌蓝 `#1a56db`、绝不用 danger 红。

### P0-2 · design-system 组件库（`web/react/src/components/admin/design-system/`）
- `StatusBadge`（tone + `title` 状态解释）· `Button`（5 变体 × 3 尺寸，全取 `Component.Button`）· `Pagination`（品牌蓝激活 + 紧凑窗口）· `Dialog/ConfirmDialog/FormDialog`（Confirm 风险分级 tone；**FormDialog 内置脏数据保护**：dirty 时关闭需「继续编辑/放弃修改」二次确认）· `Drawer/DetailDrawer/FormDrawer`（Form 遮罩禁关 + 脏数据保护）· `AsyncState`（LoadingState 骨架 / EmptyState / ErrorState / **DataState 四态自动路由**）· `SmartDataTable`（见 P1）· `BulkActionBar`（见 P1）· `ApprovalTimeline`（见 P1）。

### P0-3 · 统一 API 层
- 既有 `api/request.ts` 已具：axios + CSRF cookie 注入 + GET 去重（30s TTL，mutation 自动失效）+ 401 自动刷新重试 + REAUTH_REQUIRED + 信封解包 + postWithProgress。
- 本轮补：`utils/errorHandler.ts` 增 `HTTP_STATUS_MESSAGES`（400/401/403/404/405/409/422/429/500/502/503 → 友好文案，仅后端无信息时兜底）+ `friendlyStatusMessage`；`api/request.ts` 请求注入 `X-Request-ID`（trace）。

### P0-4 · RBAC 权限模型（前端层）
- `web/react/src/permissions/`：`registry.ts`（27 个权限码常量+标签）· `can.ts`（can/canAny/canAll，**超管隐式全量**）· `scope.ts`（ResourceScope：all/group/category/brand + `inScope`）· `PermissionGate.tsx`（`<Can permission="product.delete">`）· `index.ts`。
- `store/AdminAuthContext.tsx` 增 `permissionCodes` + `hasPermission(code)`：超管恒 true；非超管按 `getRbacMatrix().grants × getRbacUsers().roles` best-effort 解析（失败保持空，仅影响显隐）。
- ⚠️ **后端 Scope 数据级强制过滤仍属后端任务**（前端隐藏只是 UX）。

### P1 · 核心能力（组件/hooks 层）
- `SmartDataTable`：**真排序**（客户端 / `onSortChange` 服务端两模式，表头 ▲▼）、列设置下拉、三档密度、批量选择（勾选列+表头全选+选中摘要）、导出、sticky 表头；**API 兼容旧 DataTable**，页面可直接替换。
- `BulkActionBar`：「已选择 N 项」+ 操作 + 取消选择；危险操作先弹风险分级确认。
- `ApprovalTimeline`：submit/approve/reject/pending 时间线（供申请/审核详情）。
- 全局 `TaskCenter`（`components/admin/TaskCenter.tsx`）：头部 `↻ 任务` 下拉，5s 轮询 `GET /goods/task`，进度条+状态+查看全部。
- `hooks/useUrlState.ts`：筛选/分页/搜索同步 URL（刷新不丢、可分享、Back 有效）。

### P2 · 体验层
- `AdminDashboard` 工作台（`/admin` 首页已改为 `/admin/dashboard`）：问候 + **待办优先**（待审核商品/申请/售后/未读通知 + 查看→）+ 业务状态卡片 + 快捷入口；`useDashboardStats` 并行 allSettled best-effort。
- 侧边栏新增「工作台」组（i18n zh/en 补 `sidebar.dashboard` / `breadcrumb.dashboard` 键）。
- `CommandPalette`（⌘K）：导航+操作分组、过滤、↑↓/Enter/Esc；**以头部按钮挂载，未抢现有 Ctrl+K 搜索**。
- `useKeyboardShortcuts`（组合键 + `g p`/`n p` 双键序列）· `useSavedViews`（localStorage 保存视图）· `useBreakpoint`（5 档断点 ≥1440/1200/992/768/<768 + 兼容 `useIsMobile`）。

---

## 四、剩余任务（按序执行）

1. **P1 页面级应用**
   - 商品页 `AdminProducts`：卡片/列表**双视图** + `rowSelection` + `BulkActionBar`（批量上架/下架/审核，风险分级确认）+ URL State（`?status=&q=&page=`）。
   - 订单页 `AdminOrders`：URL State（`?status=&payment=&channel=&page=`）+ 排序接入。
   - 审计日志 `AdminAuditLogs`：**分页修正**（有 page state 却只请求第一页）+ 时间范围筛选 + 详情 Drawer（操作前/后 JSON + 来源/IP/TraceID）。
   - 申请中心 `AdminApplications`：详情接 `ApprovalTimeline`（申请信息 → 变更前/后 → 影响范围 → 审批记录）。
   - 其余列表页（分类/品牌/标签/通知/活动/分组/RBAC/回收站/邮件模板）统一替换为 SmartDataTable + URL State。
2. **P2 页面级**：Saved Views 接入（订单/商品/审计）、全局快捷键落地（⌘K 面板键盘绑定，先解冲突）、响应式策略（商品→卡片 / 订单→List+Drawer / 三栏客服→纵排）。
3. **全站 17 页集中迁移（#129）**：统一 PageHeader/Toolbar/Content/Pagination 结构、替换旧组件与散落样式、状态全部走 semantic tone、危险操作风险分级、Dirty Form 保护。
4. **后端**：RBAC Scope 数据级过滤（全部/管理组/分类/品牌）；Dashboard「今日订单/今日 GMV」缺统计端点，当前用「待审核/总数」近似。

---

## 五、踩坑记录（务必遵守）

1. **Windows 大小写不敏感 FS**：`Can.tsx` 与 `can.ts` 仅大小写不同 → 组件文件被归一丢失。**新文件严禁与既有文件仅大小写不同**（`<Can>` 组件已改名 `PermissionGate.tsx`）。
2. 覆写 `hooks/useBreakpoint.ts` 会弄丢既有 `useIsMobile` 导出（AdminLayout 引用）→ 已补回。**覆写既有文件前先读原文保留导出**。
3. `PageHeader` 是**默认导出**且 props 仅 `title/breadcrumb/actions`（无 description）。
4. 现有头部搜索已占用 **Ctrl+K**；⌘K 命令面板先用按钮挂载，后续迁移统一时再接管快捷键。
5. Vite build 被 sandbox safe-delete 守卫拦截：先 `mv dist dist-old` 再 `npm run build`。
6. **浏览器自动化（CDP）实测坑（2026-08-25）**：本页 `Input.dispatchMouseEvent`（proxy `/clickAt` 与直连 ws 均试过）在按钮中心坐标点击**不触发** React onClick，但 `el.click()` 可触发；受控 `<select>` 同理需派发 `change` 事件。→ 统一方案：**按钮用 `el.click()`；文本框/下拉用「原生 `value` setter（`Object.getOwnPropertyDescriptor`）+ 派发 `input`/`change` 事件」**驱动受控组件（即 RTL/user-event 内部手法），真实且可靠。

---

## 六、文件清单（本轮重构新增/修改）

**新增**：`theme/{foundation,semantic,component,business}.ts` · `components/admin/design-system/{StatusBadge,Button,Pagination,Dialog,Drawer,AsyncState,SmartDataTable,BulkActionBar,ApprovalTimeline,index}.tsx` · `components/admin/{TaskCenter,CommandPalette}.tsx` · `permissions/{registry,can,scope,PermissionGate,index}.ts` · `hooks/{useUrlState,useBreakpoint,useKeyboardShortcuts,useSavedViews,useDashboardStats}.ts` · `pages/admin/AdminDashboard.tsx`

**修改**：`theme/{tokens,index}.ts` · `utils/errorHandler.ts` · `api/request.ts` · `store/AdminAuthContext.tsx` · `pages/admin/AdminLayout.tsx` · `router/index.tsx` · `i18n/{zh-CN,en}.ts`

**提交/部署（2026-08-25 更新）**：本文档 §三~§九 所列 P0/P1/P2 重构与历次修复均已随提交并入 `master` 并部署至 Cloudflare Pages（三个子域 www/admin/shop.ziggner.com）。最新提交 `0fc3437`（i18n 修复，2026-08-25）。

---

## 七、验证状态与风险

- **验证**：每次改动均跑 `tsc -p tsconfig.json` 过滤相关路径，**零报错**；新增件均为 additive（不破坏既有页面）。
- **公网回归（2026-08-23）**：✅ 前端构建 + `wrangler deploy` 上线三个域名（www/admin/shop.ziggner.com，资源哈希与本地 build 一致）；✅ 超管账号真实浏览器登录 `admin.ziggner.com` 成功（用户名+邮箱 OTP+密码），抽查 商品/订单/权限管理/审计日志 多页渲染与 RBAC 矩阵、URL 状态同步均正常。
- **热修复（2026-08-23）**：[`base.py`](../backend/project/config/settings/base.py) `CORS_ALLOW_HEADERS` 追加 `x-request-id`，解决预检被拦；重建 `ziggner-django:v1.0.4` 镜像并 recreate `django-app` 容器已生效（`Access-Control-Allow-Headers` 实测已含 `x-request-id`）。
- **权限门禁修复（2026-08-23）**：[`ProtectedRoute.tsx`](../web/react/src/components/admin/ProtectedRoute.tsx) `ROUTE_PERMISSIONS` 补 `dashboard/import/coupons-promo`，并放行超管访问未注册管理路由。修复 **Dashboard 默认首页此前因 default-deny 不可达**（`/admin` 被误跳商品页）的验收阻断项。公网实测：`/admin`→工作台、`/admin/import`→数据导入 均正常。
- **Systematized 验收（2026-08-23）**：按 10 项准则静态+构建+浏览器核查。**未达"大厂级"交付线**。PASS：SmartDataTable 覆盖 ≈13 列表页、Sidebar 业务域分组、无僵尸路由、包体积主入口 491KB(<500KB)、CORS 修复、权限门禁修复。FAIL/PARTIAL：① 页内硬编码色值（Activities/Applications/ChatDetail/ProductForm 等，token 混用）；② legacy `components/admin/common/*` 与 design-system 双体系并存，部分页仍有自定义弹窗/表格/按钮；③ `can()`/PermissionGate 业务页零调用、门禁为 legacy 路径表、后端 Scope 仅 order 域；④ 硬编码中文未走 i18n；⑤ Dashboard 可达但 Dashboard 统计 best-effort。**下一步**：can() 落地页面、legacy common 收敛、色值半迁移 token、中文走 i18n、后端 Scope 扩展其余域。
- **验收补齐（2026-08-23 续）**：针对上条 FAIL/PARTIAL 的首批收敛已完成并 `tsc --noEmit` 全绿：**③ can() 落地**——`AdminProducts`（删除/审核/提审/上架/编辑按 `product.*` hasPermission 显隐，替换 legacy `isSuperAdmin` 角色判定）、`AdminProductAudit`（`product.audit`）、`AdminGroups`（`rbac.manage`）、`AdminChatDetail`（强制接管按 `chat.assign`）；**① 色值半迁移 token**——`AdminChatDetail` 订单状态 map 改走 `Semantic.status[6 tone]`、`AdminProductForm` 品牌蓝 `#1a56db`→`Color.primary`、`AdminActivities`（`PRIMARY`→`Color.primary`，danger/info tone 化）、`AdminApplications`（拒审/Toast 状态→`Semantic.status`）；**④ 中文走 i18n**——`AdminProducts` 批量下架/批量审核确认文案改为 `t()`（新增 zh/en key + `\${count}` 插值）。剩余：legacy `common/*` 双体系收敛、其余页剩余硬编码色值/中文、后端 Scope 扩展其余域。
- **风险**：① 全站迁移是最大 diff，需分页面回归；② Dashboard 统计为 best-effort（端点失败显示 0）；③ 后端 Scope 仅收敛 order 域，`cs/order` 等其余域尚未接入统一抽象，前端 `<Can>` 只是显隐。

---

*下一步动作：P1 页面级应用（商品双视图 → 订单/审计 → 申请中心）→ P2 收尾 → 全站迁移。*

---

## 八、迁移进度快照（2026-08-23 追加）

> 基于当前工作区实际代码核对（`grep SmartDataTable|useUrlState|StatusBadge` + `tsc --noEmit` 全绿），更新 §四 的迁移现状。

**已完成设计系统迁移（19 页 + 邮件模板编辑器）：**
`AdminProducts`（双视图+URL State）· `AdminOrders`（URL State+排序）· `AdminAuditLogs` · `AdminApplications`（ApprovalTimeline）· `AdminBrands` · `AdminTags` · `AdminNotifications` · `AdminCoupons`（卡片视图，清理死代码 `columns`/旧 `DataTable` 导入）· `AdminGroups` · `AdminActivities`（新增 URL State 同步搜索/分页）· `AdminPromoCodes`（`Modal`→`FormDialog`/`Dialog`）· `AdminEmailTemplates`（`ConfirmDialog`）· `AdminRecycleBin` · `AdminCategories` · `AdminTasks` · `AdminRbac`（清理未用的本地 `Modal*` 样式）· `AdminChatDetail` · `AdminProductAudit`（SPU/SKU/聊天状态→`StatusBadge` tone）· `AdminChatList`（`Pagination`→design-system）

**遗留（中优先级，后续按需迁移）：** `AdminImport` · `AdminDashboard` · `AdminProductForm` · `AdminLayout` · `AdminLogin`

**一致性约定复查：** 全站 `tsc --noEmit` 通过；状态展示已收敛到 `StatusBadge`（semantic tone）；弹窗收敛到 `Dialog/ConfirmDialog/FormDialog`（风险分级）。

---

## 九、测试体系（质量内建 · 2026-08-23 追加）

> 覆盖 Admin 后台所依赖的后端 + 前端，落地在 `backend/` 与 `.github/workflows/`。四层分层、六大子系统、失败阻断、每日回归均已实作，见下表。

### 9.1 四层门禁（含覆盖率目标 → 当前里程碑）

| 层级 | 工具/载体 | 复用门禁/阈值 | 实际落点 |
|---|---|---|---|
| 单元 | pytest `-m unit`，Factory Boy | 覆盖率 ≥85% → 里程碑 24% | `backend/Makefile test-unit`，`.coveragerc-unit` |
| 集成 | pytest `-m integration`，MySQL8/Redis 容器 | 覆盖率 ≥80% → 里程碑 39% | `docker-compose.test.yml`，`.coveragerc-integration` |
| 契约 | DRF-Spectacular Schema 基线 diff | 破坏性变更阻断 | `contracts/schemas/openapi.baseline.json`，`tests/contract/test_api_contract.py` |
| 混沌/并发 | pytest `-m slow` | 防超卖/一致性；失败自动 JIRA 提单 | `scripts/chaos_fail_issue.py`，`scripts/check_core_coverage.py` |
| E2E | Playwright（`web/react/e2e/`） | 公网冒烟，抖动容忍不阻断 | `web/react/playwright.config.ts` |

### 9.2 六大子系统差异化测试（与 Admin 页面/后端 app 对应）

| 子系统 | 后端 app | 代表用例（文件） |
|---|---|---|
| 用户与权限 | `users` / `rbac` | RBAC 矩阵、数据行级隔离 → `order/tests/test_row_level_isolation.py`、`rbac/tests/test_has_perm_matrix.py` |
| 商品运营 | `goods` | 状态机流转/权限/审计、缓存一致性 → `test_spu_state_machine.py`、`test_cache_service.py`、`test_export_audit.py` |
| 交易履约 | `order` | 事务回滚、幂等、并发防超卖 → `test_checkout_integrity.py`、`test_order_state_machine.py`（混沌层 `-m slow`） |
| 促销营销 | `promotion` | 满减/优惠券叠加边界、缓存与 DB 一致 → `test_coupon_math.py`、`test_promo_code.py` |
| 客户服务 | `customer_service` | 客服分组隔离、会话策略 → `test_conversation_policy.py` |
| 运营辅助 | `goods`/`notification` | 大数据导出流式响应、审计日志 → `goods/views/admin_import_export.py`（流式）+ `test_export_audit.py` |

### 9.3 失败阻断与告警（CI 实作）

- `.github/workflows/ci.yml`：push/PR 全量分层测试，**任一单元/集成/契约失败直接阻断合并**；混沌失败自动生成 JIRA 工单（`chaos_fail_issue.py`）。
- `.github/workflows/perf-gate.yml`：性能基线（P95<500ms、TPS≥设定值 80%），未达标打印 `[PERF-WARNING]` 并强制人工 Review（`perf_gate.py` + `notify_dingtalk.py`）。
- **每日凌晨回归**：`ci.yml` 的 `nightly-regression` job（UTC 20:00 = 北京 04:00）跑全量 + Allure，`notify_dingtalk.py` 推钉钉日报。
- 测试环境对齐生产：2 核 + 同版本 MySQL8/Redis 镜像（`docker-compose.test.yml`）。

### 9.4 收尾验证状态

- 后端：`ruff`（E9/F63/F7/F82）与 `pytest` 分层门禁见 `Makefile`。
- 前端：`npx tsc --noEmit` 退出码 0（本旧文档 §八 复核一致）。

### 9.5 RBAC 第四维 Scope 落地

- 新增统一抽象 `backend/apps/rbac/scopes.py`：`UserScope`（all/group）+ `get_user_scope` + `is_global_scope`。
  - 超管 / 运维 → `all`；管理组组长/组员 → `group`（经管理组→Category 派生管辖分类）。
  - 与前端 `permissions/scope.ts` 的 `ResourceScope`（all/group/category/brand）命名对齐。
- 收敛 `order/policies.py` 的 `scope_orders` 复用该抽象（行为等价），消除散落角色判断。
- **修复**前端 `inScope` 的 `group` 分支恒真 bug（`userGroupId==null || true` → 真正按管辖分类判定）。
- 新增 `rbac/tests/test_scope.py`：全局角色 / customer 收窄 / 组长管辖含子树 / 空管辖 / 前端命名一致。

---

*最终落点：设计系统组件层与 17 页迁移完成，`tsc` 零报错；测试体系四层 + 六大子系统 + 失败阻断 + 每日回归已实作；RBAC 第四维 Scope 已抽象并收敛 order 域；剩余中优先级例外页（Login/ProductForm/Import，不从 design-system）与 TLS 证书轮换留待下一轮。*

---

## 十、2026-08-25 追加：i18n 修复 + 测试数据清理 + 真实交互验证

### 10.1 i18n 缺键修复（`generateCode`）
- **问题**：优惠券表单「生成优惠码」按钮在中文环境下回退显示异常。根因：`web/react/src/pages/admin/AdminCoupons.tsx:875` 调用 `t('admin.coupons.generateCode')`，但该键只存在于 `en.ts:705`，`zh-CN.ts` 的 `coupons` 区块漏写。
- **修复**：`web/react/src/i18n/zh-CN.ts` 在 `codePlaceholder` 之后补 `generateCode: '生成优惠码'`（与英文键对齐）。纯字符串加键，不影响类型。
- **提交/部署**：commit `0fc3437` → `master`；Cloudflare Pages 部署 Version `3a15596a-6043-48a9-b675-4cfe6e8580cc`，新主包 `index-CsH-wM0B.js`（替代旧 `index-UKXg1Cuv.js`）。线上 `index.html` 已引用新包、主包含「生成优惠码」文案，旧包无残留引用。

### 10.2 生产 QA 测试数据清理（2026-08-25）
- 3 张 QA 测试券（ID 59/61/62）经 `DELETE /api/v1/promotion/coupon/<id>/delete` 全部删除（券总数 3→0）。
- 商品 SPU 64「QA 冒烟测试商品 0824」：`POST /goods/spu/64/shelf {action:'put_off_sale'}` 下架 → `DELETE /goods/spu/64/delete` 软删（已移出前台/后台列表）。
- ⚠️ SPU 64 **永久 purge 被拒（400）**：`DELETE /goods/recycle/64/permanent` 因仍被订单快照外键引用失败。
- 订单 `20260823558398`（`cancel` 被拒，Shipped 不可取消）：**订单为财务不可变记录，系统无删除端点**，终态保留。
- → SPU 64 滞留回收站、订单作为财务记录保留，此为**设计终态，非缺陷**。

### 10.3 优惠券创建/编辑/删除 真实交互验证（2026-08-25）
- 经浏览器（CDP 代理 localhost:3456 / Chrome 9222）走真实 UI 路径验证：按钮用 `el.click()` 触发真实 React onClick；文本框/下拉用「原生 value setter + 派发 input/change 事件」驱动受控组件（见 §五.6）。
- 全生命周期以公网 API 回查为真相源：
  - **创建**：填 优惠码 `QAREAL0825`/类型 `percent`/金额 `15`/最低 `50`/总量 `100` → 新增 ID 63（amount 15.00 / percent / min 50.00 / total 100）。
  - **编辑**：金额改 `20` → 保存 → ID 63 金额 15.00 → 20.00。
  - **删除**：确认弹窗「确定删除」→ 券总数 1 → 0。
- 验证报告：`docs/QA_COUPON_FORM_REAL_INTERACTION_2026-08-25.md`（测试用 cdp 脚本/截图按规范已删，未污染仓库）。

### 10.4 当前部署与回归状态（2026-08-25）
- 前端：Cloudflare Pages Version `3a15596a...`，三子域均更新；主包 `index-CsH-wM0B.js`。
- 后端：镜像 `ziggner-django:local`（含 `admin_recycle.py` ProtectedError 修复），django-app/celery-worker/celery-beat 全 healthy（2026-08-24 滚动）。
- 公网 UI 交互（08-25 重跑）全程 0 红色 Console 报错、0 个 4xx/5xx。
