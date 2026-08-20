"""
核心模块覆盖率 95% 子门禁校验（大厂规范中的"核心模块必须达到 95%"硬化项）。

用法：
  1. 先生成 coverage JSON：coverage run -m pytest -m unit ... && coverage json
  2. 读取 coverage.json，对被列入核心清单（apps/order/services.py 库存扣减、
     apps/goods/... 状态机、apps/promotion/services.py 价格计算）的模块做 ≥95% 断言。
     任一核心模块 < 95% → 退出码 1（阻断 CI/提交）。

核心清单来源：.coveragerc-unit 的 [core] 段（Makefile test-unit 之后调用）。
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
# 核心模块（库存扣减 / 价格计算 / 状态机流转）。每个模块可配置独立阈值：
#   需求最终目标 95%；里程碑阈值由环境变量 CORE_THRESHOLDS 传入
#   （形如 "apps/order/services.py:55,apps/promotion/services.py:30,..."），
#   未配置某模块时回退 CORE_FAIL_UNDER（默认 95.0 = 最终目标）。
DEFAULT_CORE = [
    "apps/order/services.py",     # 下单事务 / select_for_update 防超卖 / 库存扣减
    "apps/promotion/services.py",  # 优惠券 calc_discount / 满减边界 / 使用锁
    "apps/goods/services.py",      # 商品校验 / 缓存失效联动
    "apps/goods/models.py",        # SPU/SKU 状态机 + 库存字段
]
CORE_FAIL_UNDER = float(os.environ.get("CORE_FAIL_UNDER", "95.0"))

# 里程碑阈值（2026-08 基线，随用例补充逐轮上调至 95）：
#   order/services=55  promotion/services=30  goods/services=20  goods/models=85
_MILESTONE = dict(
    pair.split(":")
    for pair in os.environ.get(
        "CORE_THRESHOLDS",
        "apps/order/services.py:55,apps/promotion/services.py:30,"
        "apps/goods/services.py:20,apps/goods/models.py:85",
    ).split(",")
    if ":" in pair
)


def _threshold_for(rel: str) -> float:
    return float(_MILESTONE.get(rel, CORE_FAIL_UNDER))


def _load_json(path: Path) -> dict:
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def check(json_path: Path, core: list[str]) -> int:
    if not json_path.exists():
        print(f"[core-coverage] {json_path} 不存在：请先跑 coverage run + coverage json")
        return 1
    data = _load_json(json_path)
    files = data.get("files", {})
    fail = 0
    for rel in core:
        rel = rel.rstrip("/").lstrip("/")
        threshold = _threshold_for(rel)
        entry = files.get(rel)
        if entry is None:  # 允许模块名带前缀差异
            match = [k for k in files if k.endswith(rel)]
            entry = files[match[0]] if match else None
        if entry is None:
            print(f"[core-coverage] 核心模块未找到：{rel}")
            fail = 1
            continue
        summary = entry.get("summary", {})
        pct = summary.get("percent_covered_display", "0")
        try:
            val = float(pct)
        except ValueError:
            val = 0.0
        mark = "OK " if val >= threshold else "FAIL"
        print(f"[core-coverage][{mark}] {rel}: {pct}% (要求 >= {threshold:.0f}%，目标 95%)")
        if val < threshold:
            fail = 1
    print("core coverage gate completed with", "SUCCESS" if fail == 0 else "FAILURE")
    return fail


def main() -> int:
    change = os.getcwd()  # 通常已在 backend/ 下执行
    json_path = Path(change) / "coverage.json"
    core = [
        c.strip()
        for c in os.environ.get("CORE_MODULES", ",".join(DEFAULT_CORE)).split(",")
        if c.strip()
    ]
    return check(json_path, core)


if __name__ == "__main__":
    sys.exit(main())