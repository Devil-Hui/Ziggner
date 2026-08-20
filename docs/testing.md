# Ziggner 后端测试体系（大厂规范：质量内建、分层覆盖、失败阻断）

> 本文档描述 Ziggner 后端四层测试体系、六大子系统覆盖、覆盖率门禁与 CI 质量闸门。
> 配套文件：`backend/Makefile`、`backend/conftest.py`、`backend/requirements/test.txt`、
> `backend/.coveragerc-unit|integration`、`backend/docker-compose.test.yml`、
> `backend/tests/contract/`、`backend/scripts/`、`.github/workflows/ci.yml`。

---

## 1. 四层测试架构

| 层 | 技术 | 运行标记 | 覆盖对象 | 外部依赖 |
|---|---|---|---|---|
| 单元层 | pytest + pytest-django | `-m 'unit and not slow'` | Domain 实体方法（SPU/Order 状态机）、Service 纯逻辑（价格计算、券校验）、工具函数（safe_int/脱敏） | MySQL + Redis（pytest-django 管理测试库） |
| 集成层 | pytest-django `@pytest.mark.django_db` + Factory Boy | `-m 'integration and not slow'` | Repository/ORM 查询、RBAC 行级隔离、缓存一致性、类目门禁、客服分组隔离、API 契约行为（错误码映射） | MySQL + Redis（`docker-compose.test.yml`） |
| 契约层 | DRF-Spectacular 基线 diff | `-m contract` | OpenAPI JSON Schema 与前端消费方对齐；删路径/删方法/响应 content 变化 = 破坏性 → 阻断 | 无（进程内生成 schema） |
| 混沌/并发层 | pytest 多线程 + 一致性断言 | `-m slow` | 并发下单防超卖（select_for_update 分布式锁）、事务回滚原子性、幂等键去重 | MySQL + Redis（真实行锁语义） |

> 说明：Django 模型方法/状态机在实现上需要落库（`save()`），故单元层也依赖测试库；
> 「单元」的定义按**被测对象**（领域实体/服务纯逻辑）而非「无 DB」。所有测试数据由
> Factory Boy 构造，pytest-django 每用例事务回滚，无残留。

## 2. 运行方式

```bash
# 1) 拉起测试依赖（与生产同规格：db 320m/0.4c、redis 96m/0.1c；不注入超管变量）
cd backend && docker compose -f docker-compose.test.yml up -d db redis

# 2) 进入测试容器跑 pytest（或在 CI 中直接跑）
docker compose -f docker-compose.test.yml run --rm test

# 3) 分层执行（backend/ 下）
make test-unit           # 单元层，覆盖率 ≥24%（里程碑）
make test-integration    # 集成层，覆盖率 ≥39%（里程碑）
make test-contract       # 契约层（基线 diff，破坏性变更阻断）
make test-chaos          # 混沌/并发（防超卖/回滚）
make test-all            # 全量 = unit+integration+slow+核心模块门禁（覆盖率 ≥42%）
make test-e2e            # 前端 Playwright（system-chrome 项目，复用本机 Chrome）
```

覆盖率门禁值见 §4。更新契约基线（显式人工审批）：

```bash
cd backend && python scripts/update_contract_baseline.py   # 刷新 openapi.baseline.json 并提交
```

## 3. 六大子系统覆盖矩阵

| 子系统 | 测试文件 | 关键断言 |
|---|---|---|
| 用户与权限 | `apps/rbac/tests/`、`apps/order/tests/test_row_level_isolation.py`、`apps/users/tests/`、`apps/goods/tests/test_admin_group_perms.py`、`test_admin_global_catalog_perms.py` | 5 角色 × 权限点矩阵（超管短路/ops 只读/组长 17 项/组员 9 项/客户拒绝）；组长不可见跨组订单、组员无组 → none()；防自提权；匿名拒绝；管理员创建错误码映射；改密旧密码/强度/同密码校验；**组内自治 vs 全局审批边界**：组员管理组长自治（本组加普通成员 201、不可提组长/跨组 403）、组增删改 403；品牌/标签创建 403（全局资源）；分类审核/迁移 403（审批动作）；组长管辖范围内建分类 201 PENDING（组内自治+超管审核闭环） |
| 商品运营 | `apps/goods/tests/test_spu_state_machine.py`、`test_admin_permissions.py`、`test_cache_service.py` | SPU 全跃迁 + 非法跃迁 ValueError；D1（SUBMITTED 必须 submitted_by）；D2（实体无图拒提交）；类目门禁 can_operate/audit（含子类目继承、非 active 组失效）；缓存失效（spu/sku/category-tree/hot/clear_by_prefix）与 L1+L2 两级读 |
| 交易履约 | `apps/order/tests/test_checkout_integrity.py`、`test_order_state_machine.py` | 库存精确扣减；不足回滚（库存/购物车不变）；边界（恰好相等可买/超卖拒/0 库存拒）；4 并发 10 库存仅 3 单成功（防超卖）；满减券下单扣减与回滚；幂等键去重；订单状态机全跃迁 + 取消回滚库存 |
| 促销营销 | `apps/promotion/tests/test_coupon_math.py` | calc_discount：满减门槛/封顶/百分比/max_discount 触顶/0 元订单返回 0；_validate_payload：INVALID_QUANTITY、PER_USER_LIMIT_EXCEEDED、INVALID_TIME_RANGE、INVALID_DISCOUNT、INVALID_PERCENT、合法放行；券可用性 remaining/is_available |
| 客户服务 | `apps/customer_service/tests/test_conversation_policy.py` | 客服身份判定（is_agent/is_ops/is_superadmin）；组员可发消息、客户不可；**客服分组隔离**（agent1 仅见本组会话、跨组不可见）；ops/超管全量只读；买家仅见自己；WS 组级 get_conversation 校验 |
| 运营辅助 | `apps/goods/tests/test_export_audit.py` | 导出数据隔离（超管全量/组长仅本类目）；CSV 转义（逗号/引号/注入防御）；导出审计留痕（count/scope）；审计按 action 筛选；**流式导出**（generator 惰性、分块 500、1024 条跨 3 chunk 行数对账、StreamingHttpResponse 无 OOM） |

## 4. 覆盖率门禁（现状 → 目标）

| 层 | 当前基线（2026-08-20 实测） | 门禁 | 需求目标 |
|---|---|---|---|
| 单元层 | 24.24% | `--cov-fail-under=24` | **≥85%** |
| 集成层 | 39.68% | `--cov-fail-under=39` | **≥80%** |
| 全量累计（unit+integration+slow） | 42.09% | `--cov-fail-under=42` | —— |
| 核心模块（`scripts/check_core_coverage.py`） | order/services 59.9%、promotion/services 33.6%、goods/services 22.1%、goods/models 87.0% | 里程碑阈值 55/30/20/85（`CORE_THRESHOLDS` 环境变量覆盖） | **≥95%** |

**升级路线**（每轮迭代随用例补充逐步上调门禁，直至 85/80/95）：
1. 补 `apps/goods/services.py` 用例（当前 22%，核心缺口最大）：缓存失效联动、SPU 校验路径
2. 补 `apps/promotion/services.py` 领券/核销/退款返还（33%）
3. 补 `apps/order/services.py` 售后/取消补偿路径（60%）
4. 补 API 级契约用例（serializers/views），拉升集成层
5. 各层门禁按「当前基线取整」上调，避免长期红闸

## 5. 测试驱动发现并修复的生产缺陷（本次）

| 缺陷 | 现象 | 修复 |
|---|---|---|
| 审核组权限边界确认 | v3 矩阵曾标组长拥有 `goods.group.write`，但组增删改为**全局组织架构操作**，产品决策：全局一律超管审批 → 组长不含该权限；组内自治靠 `AdminGroupMembersView` 内置组长级校验（本组可加普通成员/不可提组长/不可跨组/不可移除组长） | `apps/rbac/constants.py` 注释 + `test_admin_group_perms.py` 固化 |
| 品牌/标签全局资源收归超管 | 品牌/标签无组归属、无审核流，组长创建即全局生效 → 移除组长 `goods.brand.write`/`goods.tag.write`，仅超管 | `test_admin_global_catalog_perms.py` |
| 分类审核可被组长自审 | `CategoryAdminAuditView` docstring 声明"仅超管"但无校验，组长可 approve 自己提交的分类 → 补超管校验（403） | `admin_category.py` + `test_admin_global_catalog_perms.py` |
| 分类迁移无范围校验 | `CategoryAdminMigrateView` 可跨分类/跨组批量迁移 SPU → 补超管校验（403） | `admin_category.py` + `test_admin_global_catalog_perms.py` |
| `change_password` 引用 `updated_at` | 改密成功路径必 500（字段不存在） | `apps/users/services.py` update_fields 移除 |
| 日志脱敏顺序错误 | `Authorization: Bearer <JWT>` 的 JWT 泄漏进日志 | `utils/json_logging.py` token-space 先于 key-value |
| 错误中间件剥离语义码 | 视图的 EMAIL_INVALID 等被统一换成 BAD_REQUEST | `utils/exception_middleware.py` 优先保留 body.code/error_code |
| 导出非流式 | 10 万条导出全量物化内存 → OOM 风险 | `admin_import_export.py` StreamingHttpResponse + 500/chunk |

## 6. CI 质量闸门（`.github/workflows/ci.yml`）

- `backend-unit` / `backend-integration` / `backend-full`（含核心模块门禁）/ `backend-contract` / `backend-slow`：**任一失败阻断合并**（PR required status checks）
- `backend-slow` 失败（超卖/数据不一致）→ `scripts/chaos_fail_issue.py` 自动生成 JIRA 问题单（需配置 `JIRA_URL/JIRA_USER/JIRA_API_TOKEN`，未配置降级打印）
- `frontend`：eslint → tsc → vitest 覆盖率门禁；`frontend-e2e`：Playwright 公网冒烟（`continue-on-error`，抖动容忍）
- 性能门禁 `.github/workflows/perf-gate.yml`：P95>500ms 或 TPS<设定值 80% → **WARNING + 强制人工 Review**（钉钉告警 + Issue 创建），不阻断正常 CI
- `nightly-regression`：每日 20:00 UTC（北京 04:00）全量回归 + Allure 报告上传 artifacts + 钉钉群推送（`scripts/notify_dingtalk.py`，需配置 `DINGTALK_WEBHOOK`）

## 7. 已知限制与约定

- pytest-xdist 并行（`-n`）与 `--reuse-db` 在多 worker 并发建库时会冲突产生假失败，默认串行；加速需手动 `make test-all XDIST=-n 2`
- 契约基线由 `update_contract_baseline.py` 显式刷新，**必须与 API 变更同提交**，否则 CI 契约 job 失败
- 测试中间产物（压测结果、Allure 原始 JSON、coverage json 等）一律放仓库外 `change/test/workbuddyt/`，不入库
- 审核组权限模型：组长仅组内自治（组员管理、管辖范围内分类创建走 PENDING 审核），
  全局操作（组增删改/品牌/标签/分类审核/分类迁移/矩阵/角色分配）仅超管 `goods.group.write`
  等权限点。生产 `RolePermission` 种子从未包含这些全局权限（仅回退常量引用），无需生产迁移；
  如曾手动授过需撤销。
