# Ziggner「新增管理员」功能重设计 — 技术方案与任务分解（增量）

> 产出：架构师高见远（Bob）。增量开发，严格不动现有登录四要素机制（用户名+密码+邮箱+邮箱验证码）。
> 代码事实均已读取核实（见各节引用路径），路径相对仓库根 `/d/下载/浏览器下载/change/Ziggner/Ziggner`。

---

## 0. 核实结论与关键修正

1. **两个前端对话框都调用 `createAdminUser`，团队主理人原假设"不在 AdminGroups.tsx"不成立。**
   - `web/react/src/pages/admin/AdminRbac.tsx`（权限管理 → 用户角色 Tab）：用 `admin.rbac.*` i18n 键，当前字段仅 `username / password / email(可选)`，调用 `adminAPI.createAdminUser({username,password,email})`（L351）。
   - `web/react/src/pages/admin/AdminGroups.tsx`（管理员分组 → 新建 → 管理员账号 Tab）：用 `admin.groups.*` i18n 键（即主理人提到的 L884-1006 那批 `admin.*` 键），当前字段 `username / password / email(可选) / phone / country_code / role`，调用 `adminAPI.createAdminUser({...})`（L336）。
   - **结论：本期前端改动必须同时覆盖两个组件，否则会出现一处已强制 email 必填、另一处仍可空提交的不一致。** 这是我阅读代码后的重要修正，请主理人知悉。

2. **Celery 已可用且已在用**：`docker-compose.yml` 有 `celery_worker` 服务；`apps/users/email_service.py` 的 `EmailService._send_email` 已通过 `send_verification_email.delay()` 异步发送并带同步兜底（`try/except → _send_email_sync`）。详情见 §1。

3. 现有创建端点 `AdminUserCreateView.post`（`apps/users/admin_views.py` L50-106）当前：仅校验 `username/password` 必填，`email` 可选，`role` 可选；返回 `{account_no,username,email,is_active,roles}`。本期在其上增强，不重写。

4. `UserProfile`（`apps/users/models.py` L50-114）现有 `country_code/phone/account_no/security_stamp`，无 `department/email_verified/note/locale/must_reset_password`。`EmailTemplate`（L205-243）类型仅 `verify_code/order_notice/reset_password`，缺 `admin_welcome`。

---

## 1. 实现方案 + 框架选型

**技术栈**：完全沿用现有栈（Django 5.2 + DRF + gunicorn/daphne；React 19 + Vite + TS + i18n）。**不引入任何新框架/重依赖**。

### 1.1 分层与职责
| 层 | 文件 | 职责 |
|---|---|---|
| 校验层 | `apps/users/validators.py`（**新增**） | 共用 validator：`validate_username` / `validate_email` / `validate_password`，register 与 admin 创建两端复用，避免规则漂移 |
| 序列化层 | `apps/users/serializers.py` | 新增 `AdminCreateSerializer`，承载字段格式校验；`RegisterSerializer` 改为复用同一 validator |
| 业务层 | `apps/users/services.py` | `UserService.create_user` 增强：收 `first_name/last_name/department/is_active/note/locale/must_reset_password/email_verified`，email 归一化小写、大小写不敏感唯一性校验，落 `User`+`UserProfile` |
| 视图层 | `apps/users/admin_views.py` | `AdminUserCreateView.post` 用 `AdminCreateSerializer` 校验→映射错误码→`create_user`→指派 role→`transaction.on_commit` 派发欢迎邮件任务→返回 201 |
| 邮件层 | `apps/users/email_service.py` + `tasks.py` | 新增 `send_admin_welcome_email(user,context)` 与 Celery 任务 `send_admin_welcome_email.delay(user_id)`；重构 `_deliver_verify_email` 为通用模板发送 |
| 验证端点 | `apps/users/views.py` + `urls.py` | 新增公开端点 `AdminEmailVerifyView`，解码欢迎邮件中的 JWT 令牌，将 `email_verified` 置 true |

### 1.2 email 必填校验放哪一层
- **视图层（`AdminUserCreateView`）直接校验必填**：`email` 为空 → 立即 400（code=`EMAIL_INVALID`，见 §4 错误码词典说明）。
- **业务层（`UserService.create_user`）增强唯一性**：email 归一化小写后做 `email__iexact` 唯一性校验，冲突抛 `ValueError('EMAIL_EXISTS')`。
- 两层都做（视图挡格式/必填，service 挡唯一性），与现有 `username` 的处理方式一致。

### 1.3 欢迎邮件如何不阻塞创建（异步）
- **Celery 可用（已核实）**：沿用现有 `send_verification_email.delay()` 模式。在 `AdminUserCreateView` 中通过 `django.db.transaction.on_commit(lambda: send_admin_welcome_email.delay(user.id))` 派发——**仅当事务成功提交后才发邮件**，且邮件发送完全在请求/事务之外。
- **失败不影响建号**：Celery 任务内部 `try/except` 包裹 SMTP，仅记日志（参考现有 `_send_email_sync` 的兜底）。即使邮件彻底失败，创建已返回 201，账号可用。
- **无 Celery 的兜底**：复用 `EmailService._send_email` 已有的"Celery 不可用→同步发送"逻辑，部署环境已有 worker，正常走异步。

### 1.4 密码强度（避免重依赖）
- 用轻量正则（不引 `django.contrib.auth.password_validation` 之外的依赖；实际上 Django 自带、零新增包）。规则：**长度 ≥ 8，含大写、含小写、且（含数字 或 含特殊符）**。集中到 `validators.validate_password`，register 与 admin 共用。

---

## 2. 文件列表及相对路径

### 后端（backend/）
| 文件 | 动作 | 改什么 |
|---|---|---|
| `apps/users/validators.py` | **新增** | `USERNAME_REGEX = ^[A-Za-z0-9_\-]{4,32}$`；`validate_username(v)`、`validate_email(v)`、`validate_password(v)`，统一抛 `django.core.exceptions.ValidationError` 或约定错误码 |
| `apps/users/services.py` | 改 | `UserService.create_user` 扩展签名（见 §3）；email 小写归一化 + `email__iexact` 唯一性；新 Profile 字段落库 |
| `apps/users/serializers.py` | 改 | 新增 `AdminCreateSerializer`（全字段+共用 validator）；`RegisterSerializer` 的 `validate_username/validate_password` 改为调用 `validators` |
| `apps/users/models.py` | 改 | `UserProfile` 增 5 字段（§3）；`EmailTemplate.TEMPLATE_TYPES` 增 `'admin_welcome'` |
| `apps/users/admin_views.py` | 改 | `AdminUserCreateView.post` 改用 `AdminCreateSerializer` + 错误码映射 + 全字段透传 + `on_commit` 派发欢迎邮件；保持返回 201 结构 |
| `apps/users/views.py` | 改 | 新增 `AdminEmailVerifyView(PublicApiView)`（公开邮箱验证端点） |
| `apps/users/urls.py` | 改 | 挂载 `AdminEmailVerifyView`：`POST email/admin-verify/` |
| `apps/users/email_service.py` | 改 | 新增 `issue_admin_email_verify_token(user)` / `decode_admin_email_verify_token(token)`（JWT，type=`admin_email_verify`）；新增 `send_admin_welcome_email(user,context)`；重构 `_deliver_verify_email` → 通用 `_deliver_template_email(recipient, template_type, context)` 复用账号池路由 |
| `apps/users/tasks.py` | 改 | 新增 `@shared_task send_admin_welcome_email(user_id)`：加载 user→构建 context（platform_name/real_name/username/email/role/login_url/support_url/year）→`EmailService.send_admin_welcome_email`→`try/except` 记日志 |
| `apps/users/migrations/00XX_userprofile_new_fields.py` | **新增（生成）** | `UserProfile` 5 个新字段（均带默认值，安全 additive） |
| `apps/users/migrations/00XY_seed_admin_welcome_template.py` | **新增（数据迁移）** | `EmailTemplate.objects.get_or_create(template_type='admin_welcome', defaults={subject,html_body,text_body})` 写入默认欢迎模板 |
| `apps/users/tests/test_admin_create.py` | **新增** | 后端单测（见 §6 T05） |
| `project/settings.py`（或 settings 包） | 改 | 新增 `PLATFORM_NAME`（默认 `'Ziggner'`）、`FRONTEND_URL`、`SUPPORT_URL`（欢迎邮件 verify 链接与文案用）；无新增 Celery 配置 |

### 前端（web/react/src/）
| 文件 | 动作 | 改什么 |
|---|---|---|
| `api/admin.ts` | 改 | `createAdminUser` 入参类型：email 由可选改**必填**；增 `first_name`、`last_name`、`role`（必填）、`department`（可选）；保留 `country_code/phone/is_active/note/locale` |
| `pages/admin/AdminRbac.tsx` | 改 | 表单增 `first_name/last_name/role`（必填）、`country_code/phone/department`（可选，"建议填写"）；email 改必填校验；`createAdminUser` 调用补新字段；`createForm` 状态扩字段 |
| `pages/admin/AdminGroups.tsx` | 改 | 已有 `username/password/email/phone/country_code/role`；增 `first_name/last_name`（必填）、`department`（可选）；email 改必填；调用补新字段 |
| `i18n/zh-CN.ts` | 改 | `admin.rbac.*` 与 `admin.groups.*` 两个命名空间补充键（§8） |
| `i18n/en.ts` | 改 | 同上英文键 |
| `pages/admin/__tests__/createAdmin.test.tsx` | **新增（可选）** | 字段必填/邮箱必填的前端 smoke 测试 |

---

## 3. 数据模型变更

### 3.1 UserProfile 新增字段（`apps/users/models.py`）
| 字段 | 类型 | 默认 | 校验/说明 |
|---|---|---|---|
| `department` | `CharField(max_length=50, blank=True)` | `''` | 自由文本，主理人决策①；不引入枚举管理页 |
| `email_verified` | `BooleanField` | `False` | 邮箱是否已验证；仅验证端点可置 true |
| `note` | `TextField(blank=True)` | `''` | P2 仅存储 |
| `locale` | `CharField(max_length=10, blank=True)` | `'zh-CN'` | P2 仅存储，暂不影响后端逻辑 |
| `must_reset_password` | `BooleanField` | `True` | P2 仅落字段+默认值；登录强制改密拦截列为后续项（**本期不实现**） |

> 注：以上字段均可空或有默认值，迁移为纯 additive，旧数据自动取默认值，**无需 data migration 回填**。

### 3.2 EmailTemplate 类型扩展
`TEMPLATE_TYPES` 增加 `('admin_welcome', '管理员欢迎邮件')`。占位符统一用**单花括号** `{key}`（与现有 `EmailTemplate.render` 的 `{k}` 替换机制一致；PRD 写的 `{{}}` 为约定差异，实现以单花括号为准）：
`{platform_name} {real_name} {username} {email} {role} {login_url} {support_url} {year}`。

### 3.3 迁移顺序
1. `00XX_userprofile_new_fields.py`：schema 迁移（加 5 列）。
2. `00XY_seed_admin_welcome_template.py`：数据迁移（seed 默认 `admin_welcome` 模板行，便于运营在后台编辑）。
> 部署步骤：`python manage.py makemigrations users` → `migrate`。需在主分支最新迁移之后生成，避免冲突。

---

## 4. 接口契约（API）

### 4.1 `POST /api/admin/users/create/`（命名空间 `/api/v1/admin/users/` 与 `/api/admin/users/` 均挂载，见 `admin_urls.py`）
**请求体**
| 字段 | 必填 | 类型 | 校验规则 |
|---|---|---|---|
| `username` | ✅ | string | `^[A-Za-z0-9_\-]{4,32}$`，全局唯一（大小写敏感，与登录一致） |
| `password` | ✅ | string | ≥8，含大写+小写+（数字或特殊符） |
| `email` | ✅ | string | RFC 格式，全局唯一，**大小写不敏感**（存储归一化小写） |
| `first_name` | ✅ | string | 真实名，非空 |
| `last_name` | ✅ | string | 真实姓，非空 |
| `role` | ✅ | enum | `superadmin` \| `ops`（派生角色不可在此指派） |
| `country_code` | ⬜ | string | 可选；`^\+\d{1,4}$`；填则须同时填 phone |
| `phone` | ⬜ | string | 可选；`^\d{5,20}$`；与 country_code 构成唯一约束 |
| `department` | ⬜ | string | 可选；≤50 |
| `is_active` | ⬜ | bool | 默认 `true`，可传 `false` 创建即禁用 |
| `note` | ⬜ | string | 可选，P2 存储 |
| `locale` | ⬜ | string | 默认 `'zh-CN'`，P2 存储 |
| `email_verified` | ⬜ | bool | **创建时服务端强制为 `false`**，忽略前端传入的 true（仅验证端点可置 true） |
| `must_reset_password` | ⬜ | bool | 服务端默认 `true`，P2 存储，前端不传 |

**成功响应 201**
```json
{
  "account_no": "ZG-xxxx",
  "username": "alice",
  "email": "alice@example.com",
  "first_name": "Alice",
  "last_name": "Wang",
  "is_active": true,
  "roles": ["ops"]
}
```
（相对现有响应新增 `first_name/last_name`，为纯增量，不影响现有前端字段。）

**失败错误码**（统一返回 `400 { "detail": "<中文/英文消息>", "code": "<CODE>" }`，沿用现有 `_bad_request` 信封）
| code | 触发 |
|---|---|
| `USERNAME_EXISTS` | username 已存在 |
| `EMAIL_EXISTS` | email 已存在（大小写不敏感） |
| `EMAIL_INVALID` | email 缺失/为空 或 格式不合法 |
| `PASSWORD_WEAK` | 密码强度不达标 |
| `NAME_REQUIRED` | `first_name` 或 `last_name` 缺失 |
| `PHONE_INVALID` | phone/country_code 格式非法，或只填其一 |
| `ROLE_INVALID` | role 非 `superadmin`/`ops`，或为派生角色 |
| `USERNAME_INVALID` | username 格式不符 `^[A-Za-z0-9_\-]{4,32}$`（PRD 原列表未列，建议补充，见 §9） |

### 4.2 新增邮箱验证端点 `POST /api/users/email/admin-verify/`（**公开，无需登录**）
- **请求体**：`{ "token": "<JWT from welcome email link>" }`
- **行为**：解码令牌（type=`admin_email_verify`，含 `account_no`/`email`）→ 定位 user → 置 `profile.email_verified = True` → 返回 `200 { "verified": true, "email": "..." }`。
- **失败**：令牌无效/过期 → `400 { "detail": "...", "code": "TOKEN_INVALID" }`。
- **挂载**：`apps/users/urls.py`（公开命名空间），由前端欢迎邮件链接触发。

---

## 5. 程序调用流程（创建管理员）

见 `docs/sequence-diagram.mermaid`（已生成）。文字摘要：

1. 超管提交 → `AdminUserCreateView.post` 用 `AdminCreateSerializer` 做字段格式校验（失败即 400 带 code）。
2. 校验通过 → `UserService.create_user(...)` 在事务内：建 `User`（含 first_name/last_name/is_active/email 小写）、建 `UserProfile`（含 country_code/phone/department/note/locale/must_reset_password/email_verified）、做 email/username/phone 唯一性校验。
3. 建 `UserRole`（role 指派，派生角色拒绝）。
4. `transaction.on_commit` 派发 `send_admin_welcome_email.delay(user.id)`（Celery 异步，失败仅记日志）。
5. 视图返回 201（建号成功，**不等待邮件**）。
6. Celery worker 执行邮件任务：`EmailService.send_admin_welcome_email` 渲染 `admin_welcome` 模板（含验证链接 token）→ 多账号池 SMTP 发送。
7. （异步）新管理员点击欢迎邮件链接 → 前端取 token → `POST /api/users/email/admin-verify/` → `email_verified=True`。

**关键不变量**：email 发送失败 / 验证端点未点击，**均不影响账号创建与登录可用性**。

---

## 6. 任务列表（有序、含依赖、按后端/前端/迁移/测试分组）

> 约束：分组任务化、依赖清晰、单任务≥3 文件。增量开发无新增配置/入口，故首个任务为"模型+迁移"（自然基座）。

| Task | 名称 | 分组 | 源文件（≥3） | 依赖 | 优先级 |
|---|---|---|---|---|---|
| **T01** | 数据模型 + 迁移 | 后端/迁移 | `models.py`、`migrations/00XX_userprofile_new_fields.py`、`migrations/00XY_seed_admin_welcome_template.py` | — | P0 |
| **T02** | 共用校验器 + create_user 增强 | 后端 | `validators.py`(新)、`services.py`、`serializers.py` | T01 | P0 |
| **T03** | 创建视图改造 + 欢迎邮件 + 验证端点 | 后端 | `admin_views.py`、`views.py`、`urls.py`、`email_service.py`、`tasks.py`、`settings.py` | T01,T02 | P0 |
| **T04** | 前端对话框 + 类型 + i18n | 前端 | `api/admin.ts`、`pages/admin/AdminRbac.tsx`、`pages/admin/AdminGroups.tsx`、`i18n/zh-CN.ts`、`i18n/en.ts` | T03(契约确定后) | P0 |
| **T05** | 测试 | 测试 | `tests/test_admin_create.py`(后)、`pages/admin/__tests__/createAdmin.test.tsx`(前)、复用 `serializers`/`services` | T02,T03,T04 | P1 |

**依赖图**：`T01 → T02 → T03 → T04 → T05`（线性主干；T05 亦可并行于 T04 之后）。

---

## 7. 依赖包

**无需新增任何第三方依赖。**
- 密码强度：轻量正则（`re`），零新增。
- 异步邮件：Celery 已在 `requirements/base.txt`（`celery==5.5.1`），worker 已部署。
- JWT 令牌：复用现有 ` PyJWT`（`email_service.py` 已用）。
- 多账号池 SMTP：现有 `django.core.mail` + 项目账号池，无需新增。

---

## 8. 共享知识（跨系统约定）

- **前后端字段命名**：snake_case 全链路一致（`first_name`、`last_name`、`country_code`、`is_active`、`email_verified`、`must_reset_password`、`account_no`）。前端 TS 类型同形。
- **错误码词典**（后端 400 统一 `{detail, code}`）：`USERNAME_EXISTS / EMAIL_EXISTS / EMAIL_INVALID / PASSWORD_WEAK / NAME_REQUIRED / PHONE_INVALID / ROLE_INVALID / USERNAME_INVALID / TOKEN_INVALID`。新增端点沿用同一信封。
- **i18n key 命名约定**（复用现有 `admin.rbac.*` 与 `admin.groups.*` 两套，不新增命名空间）：
  - `rbac` 命名空间（AdminRbac.tsx 用）：`createAdminFirstName`、`createAdminLastName`、`createAdminRole`、`createAdminEmailRequired`、`createAdminDepartment`、`createAdminPhoneHint`、`createAdminCountryCodeHint` 等。
  - `groups` 命名空间（AdminGroups.tsx 用）：`adminFirstNameLabel`、`adminLastNameLabel`、`adminEmailRequired`、`adminDepartmentLabel`、`adminRoleRequired` 等。
  - 文案：email 标注"必填"，phone/country_code/department 标注"建议填写 / 可选"。
- **邮件模板占位符**：单花括号 `{key}`，`render(context)` 做字符串替换；`admin_welcome` 必含 `{platform_name}{real_name}{username}{email}{role}{login_url}{support_url}{year}`。
- **email 存储归一化**：创建时 `email.lower()` 存储，登录 `user.email != email` 精确比对因此一致；唯一性用 `email__iexact`。

---

## 9. 待明确事项（设计层面仍未决）

1. **register 端校验规则是否同步升级为 admin 统一规则？** 现有 `RegisterSerializer` 为 username 3-15、password ≥6 含大小写+数字；本期 admin 用 `^[A-Za-z0-9_\-]{4,32}$`、password ≥8 含大小写+(数字|特殊)。PRD 要求"跨系统一致、抽共用 validator"。**建议**：抽出 `validators.py` 并统一为更严格规则（两端一致）。**风险**：会改变 register 现有策略，可能影响存量用户/测试。需主理人/PM 拍板是否统一，或仅 admin 用更严规则（轻微漂移）。
2. **邮箱验证端点机制**：复用 Redis 验证码流程（发码→输码置 true），还是 JWT 验证链接（欢迎邮件带签名 token，点击即置 true）？PRD 说"复用现有邮箱验证码/令牌机制思路"。**我倾向 JWT 链接**（体验好、无需二次输入、复用现有 JWT 工具），见 §4.2。请确认。
3. **验证端点路径与鉴权**：建议 `POST /api/users/email/admin-verify/`（公开、token 绑定）。路径命名请确认。
4. **welcome 邮件是否走现有多账号池**（`_deliver_verify_email` 改造为通用模板发送）？建议复用账号池以保证送达，请确认。
5. **创建时 `email_verified` 是否允许前端直接置 true**？建议强制 false（仅验证端点可置 true）。请确认。
6. **`username` 大小写**：DB 唯一为大小写敏感，登录精确匹配。建议保持原样（与 register 一致），文档已说明；是否统一小写存储请确认。
7. **`is_active=False` 创建即禁用**：新建即禁用账号将无法登录（SimpleJWT 亦校验 is_active）。PRD 允许"默认 true 可禁用"，确认本期开放此能力。
8. **`locale` / `must_reset_password` / `note` 仅落字段不生效逻辑**：确认本期纯存储，无后端切换/拦截（与决策②一致）。
9. **`FRONTEND_URL` / `SUPPORT_URL` / `PLATFORM_NAME`** 在 settings 中的取值来源（是否已有环境变量），需部署侧确认；否则用默认值 `'Ziggner'` 与占位 URL。

---

## 附：图
- 类图：`docs/class-diagram.mermaid`
- 时序图：`docs/sequence-diagram.mermaid`
