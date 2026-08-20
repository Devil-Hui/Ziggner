"""
契约基线生成器（大厂规范 - 契约测试）。

在故意变更 API（新增/修改/删除接口）且确认前端兼容后，显式更新入库基线：

    python scripts/update_contract_baseline.py

会刷新 backend/contracts/schemas/openapi.baseline.json 并打印 diff 摘要；
提交时必须一并提交该基线文件，否则 CI 的 make test-contract 会失败（破坏性阻断）。

实现：进程内调用 drf-spectacular 生成器（与 tests/contract/test_api_contract.py
的 _fresh_schema() 完全同源），无需额外管理命令。
"""
from __future__ import annotations

import json
import os
import subprocess
import sys
from pathlib import Path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = BACKEND_ROOT / "contracts" / "schemas"
OUT = OUT_DIR / "openapi.baseline.json"

# 以脚本方式运行时 sys.path[0] 为 scripts/，需显式加入 backend 根
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))


def _generate_fresh_schema() -> dict:
    """进程内生成全量 OpenAPI schema（与契约测试 _fresh_schema 同源）。"""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "project.config.settings.dev")
    import django

    django.setup()
    from drf_spectacular.settings import spectacular_settings

    generator_cls = spectacular_settings.DEFAULT_GENERATOR_CLASS
    return generator_cls().get_schema(request=None, public=True)


def update() -> int:
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    schema = _generate_fresh_schema()
    # 归一化排序，保证 diff 稳定
    normalized = json.loads(json.dumps(schema, sort_keys=True, ensure_ascii=False))

    prev = ""
    if OUT.exists():
        prev = OUT.read_text(encoding="utf-8")
    OUT.write_text(json.dumps(normalized, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    n_paths = len(normalized.get("paths", {}))
    print(f"契约基线已更新：{OUT}")
    print(f"  路径 {n_paths} 条；字段类型已归一化排序。")
    print("  变更后请提交本 baseline 文件，并确保前端已同步消费。")
    enclosing = BACKEND_ROOT.parent
    try:
        status = subprocess.run(
            ["git", "status", "--short"],
            cwd=enclosing,
            capture_output=True,
            text=True,
        )
        print("  git status:\n" + status.stdout + (status.stderr or ""))
    except Exception:  # noqa: BLE001 - 非仓库场景仅提示
        print("  (非 git 仓库或 git 不可用，忽略状态检查)")
    return 0


if __name__ == "__main__":
    sys.exit(update())
