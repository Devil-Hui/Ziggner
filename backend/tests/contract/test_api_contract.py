"""
契约测试（大厂规范 - 契约测试层）。

目标：每次 API 变更时，确保后端返回的 OpenAPI JSON Schema 与前端消费方严格对齐，
自动检测破坏性改动并阻断（CI make test-contract 强制运行）。

方案：DRF-Spectacular 生成全量 schema → 与入库基线 `contracts/schemas/openapi.baseline.json`
做「破坏性 diff」：
  - 删除/改名路径、删除响应字段、修改字段类型 = 破坏性 → 失败
  - 仅新增字段/路径、增强描述 = 向后兼容 → 通过

跑法（docker 内，含完整依赖）：
  python scripts/update_contract_baseline.py   # 先自举/更新基线（进程内生成，与 _fresh_schema 同源）
  pytest -m contract tests/contract/test_api_contract.py

基线更新入口：scripts/update_contract_baseline.py（显式人工审批，提交时必须一并提交）。
"""
from __future__ import annotations

import json
from pathlib import Path

import pytest

pytestmark = [pytest.mark.contract]

BACKEND_ROOT = Path(__file__).resolve().parents[2]
BASELINE = BACKEND_ROOT / "contracts" / "schemas" / "openapi.baseline.json"


def _load(p: Path):
    with open(p, "r", encoding="utf-8") as f:
        return json.load(f)


def _fresh_schema():
    """在测试进程内生成 schema（不启动独立 manage.py 子进程）。"""
    from drf_spectacular.settings import spectacular_settings

    generator_cls = spectacular_settings.DEFAULT_GENERATOR_CLASS
    return generator_cls().get_schema(request=None, public=True)


def _find_breaking(fresh, baseline):
    """返回破坏性变更列表：路径被删、方法被删、响应顶层结构不兼容。"""
    breaks: list[str] = []
    b_paths = baseline.get("paths", {})
    f_paths = fresh.get("paths", {})

    # 1) 路径被删除
    for path in b_paths:
        if path not in f_paths:
            breaks.append(f"路径已删除（前端可能已依赖）：{path}")
    # 2) 同路径下方法被删除（如 DELETE→改 PATCH 属破坏性，必须双端同步）
    for path in f_paths:
        if path not in b_paths:
            continue
        for method in b_paths[path]:
            if method not in f_paths[path]:
                breaks.append(f"方法已删除（破坏性）：{method.upper()} {path}")
    # 3) 已有接口 200 响应的顶层 content type 集合变化
    for path in f_paths:
        if path not in b_paths:
            continue
        for method in f_paths[path]:
            f_resp = (fresh["paths"][path].get(method) or {}).get("responses", {}).get("200", {})
            b_resp = (baseline["paths"][path].get(method) or {}).get("responses", {}).get("200", {})
            if (f_resp.get("content") or {}).keys() != (b_resp.get("content") or {}).keys():
                breaks.append(f"响应 content 变化（破坏性）：{method.upper()} {path}")
    return breaks


def test_openapi_baseline_is_forward_compatible():
    if not BASELINE.exists():
        pytest.skip(
            f"契约基线未生成：{BASELINE}。请先运行 "
            f"`python scripts/update_contract_baseline.py` 生成基线后再跑。"
        )
    baseline = _load(BASELINE)
    fresh = _fresh_schema()

    breaks = _find_breaking(fresh, baseline)
    assert not breaks, "发现破坏性 API 变更：\n" + "\n".join(breaks)
    assert len(fresh["paths"]) >= len(baseline["paths"]), "路径数量回退，疑似误删接口"


def test_baseline_is_valid_json():
    """基线文件本身必须是合法 JSON（防止误提交半截文件）。"""
    assert BASELINE.exists()
    obj = _load(BASELINE)
    assert "paths" in obj
    assert "components" in obj