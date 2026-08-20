# =============================================================================
# Ziggner 后端测试入口 —— 大厂「质量内建、分层覆盖、失败阻断」规范落地
#
# 用法（在 backend/ 下）：
#   make test-unit          单元测试（pytest -m unit，领域/服务逻辑）
#   make test-integration   集成测试（依赖 db + redis，见 docker-compose.test.yml）
#   make test-contract      契约测试（DRF Schema 快照基线，破坏性变更阻断）
#   make test-chaos         混沌/并发测试（-m slow，防超卖/一致性断言）
#   make test-all           全量回归（除 e2e；含核心模块覆盖率门禁）
#   make test-e2e           端到端（前端 Playwright，见 web/react）
#
# 覆盖率门禁（里程碑值 → 最终目标，见 docs/testing.md 升级路线）：
#   单元层：当前基线 24%（需求目标 ≥85%）
#   集成层：当前基线 39%（需求目标 ≥80%）
#   全量：  当前基线 42%（累计 unit+integration+slow）
#   核心模块（库存扣减/价格计算/状态机）：里程碑阈值见 scripts/check_core_coverage.py
#           （默认回退 95% = 需求最终目标），随用例补充逐轮上调
#   契约层：不设覆盖门槛（吃 Schema 基线对齐），仅破坏性 diff 阻断
# =============================================================================
PYTHON        ?= python
PYTEST        ?= $(PYTHON) -m pytest
BASE_ARGS     := --strict-markers --tb=short -q
COV_CFG_UNIT  := .coveragerc-unit
COV_CFG_INTG  := .coveragerc-integration
# 并行 worker 数：默认串行（pytest-xdist + --reuse-db 多 worker 并发建库会互相冲突
# 导致假失败；需要加速时手动 `make test-all XDIST=-n 2` 并确保 DB 已就绪）。
XDIST        :=

.PHONY: install test-unit test-integration test-contract test-chaos test-all test-e2e cov core

install:
	$(PYTHON) -m pip install -r requirements/base.txt -r requirements/test.txt

# ── 单元层：领域实体 / 服务层纯逻辑 ───────────────────────────────────────
# 覆盖率：里程碑 24%（目标 85%）；核心模块子门禁由 test-all 统一执行
test-unit:
	$(PYTEST) $(BASE_ARGS) -m 'unit and not slow' $(XDIST) \
	  --cov --cov-config=$(COV_CFG_UNIT) --cov-report=term-missing \
	  --cov-fail-under=24

# ── 集成层：依赖 db+redis（docker compose -f docker-compose.test.yml up -d db redis）──
# 覆盖率：里程碑 39%（目标 80%）
test-integration:
	$(PYTEST) $(BASE_ARGS) -m 'integration and not slow' --reuse-db \
	  --cov --cov-config=$(COV_CFG_INTG) --cov-report=term-missing \
	  --cov-fail-under=39

# ── 契约层：DRF Schema 快照基线比对（自动探测破坏性 API 变更）───────────────
test-contract:
	$(PYTEST) $(BASE_ARGS) -m contract --reuse-db

# ── 混沌/并发：防超卖 / 事务回滚 / 一致性断言 ──────────────────────────────
test-chaos:
	$(PYTEST) $(BASE_ARGS) -m 'slow' --reuse-db -n 1

# ── 全量（除 e2e，需外部依赖）：unit + integration + slow + 核心模块门禁 ─────
test-all:
	$(PYTEST) $(BASE_ARGS) -m 'not e2e' --reuse-db \
	  $(XDIST) --dist loadscope \
	  --cov --cov-config=$(COV_CFG_INTG) --cov-report=term-missing \
	  --cov-fail-under=42
	# 核心模块覆盖率门禁（库存扣减/价格计算/状态机 ≥ 里程碑阈值，目标 95%）
	coverage json -o coverage.json
	$(PYTHON) scripts/check_core_coverage.py

# ── 核心模块覆盖率门禁（独立执行，需先有 coverage.json）───────────────────
core:
	$(PYTHON) scripts/check_core_coverage.py

# ── 前端 E2E（含用户指定的 Chrome 路径） ────────────────────────────────────
test-e2e:
	cd ../web/react && npx playwright test --project=system-chrome

# ── 汇总覆盖率报告 ─────────────────────────────────────────────────────────
cov:
	$(PYTEST) $(BASE_ARGS) -m 'not e2e' --reuse-db \
	  --cov --cov-config=$(COV_CFG_INTG) --cov-report=term-missing
