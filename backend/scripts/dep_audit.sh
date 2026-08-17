#!/usr/bin/env bash
# Ziggner 依赖漏洞扫描 — 基于 pip-audit（OSV 数据库）
#
# 用法:
#   ./scripts/dep_audit.sh                 # 扫描 requirements/*.txt，发现高危漏洞时退出码非 0
#   ./scripts/dep_audit.sh --json out.json # 输出 JSON 报告
#
# 说明:
#   - pip-audit 对照 PyPI/OSV 已知漏洞库扫描「固定版本」依赖（requirements/*.txt）。
#   - 建议在 CI 与发布前执行；Critical/High 漏洞应阻断发布。
#   - 首次运行需要网络（拉取 OSV 漏洞库）。
#   - 本脚本不修改任何依赖，仅做只读审计。
set -euo pipefail

# 回到 backend 目录（scripts/ 的上一级）
cd "$(dirname "$0")/.."

REQS_DIR="requirements"
OUT=""
if [ "${1:-}" = "--json" ]; then
  OUT="${2:?--json 需要一个输出路径，例如 --json report.json}"
fi

if ! command -v pip-audit >/dev/null 2>&1; then
  echo "[dep_audit] pip-audit 未找到，尝试 pip install pip-audit ..." >&2
  python -m pip install --quiet pip-audit \
    || { echo "[dep_audit] 安装失败：请在 CI 镜像中预装 pip-audit（pip install pip-audit）" >&2; exit 2; }
fi

AUDIT_ARGS=( -r "$REQS_DIR/base.txt" -r "$REQS_DIR/prod.txt" --progress-spinner off )
if [ -n "$OUT" ]; then
  AUDIT_ARGS+=( --json )
  echo "[dep_audit] 扫描 $REQS_DIR/{base,prod}.txt -> $OUT" >&2
  pip-audit "${AUDIT_ARGS[@]}" > "$OUT"
else
  echo "[dep_audit] 扫描 $REQS_DIR/{base,prod}.txt ..." >&2
  pip-audit "${AUDIT_ARGS[@]}"
fi
