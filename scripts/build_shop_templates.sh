#!/usr/bin/env bash
# =============================================================================
# 重建「网页搭建」模板预览站
# =============================================================================
# 做什么
#   1. 逐个 shop_templates/<slug> 执行 npm ci + vite build（vite-plugin-singlefile
#      → 产出自包含单文件 dist/index.html，可直接 iframe 嵌入）
#   2. 把 dist/index.html 同步到 templates_static/<slug>/index.html
#      （该目录由 docker-compose.prod.yml 挂进 nginx 的 /var/www/templates）
#   3. 重新生成封面图 templates_static/<slug>/cover.svg
#
# 为什么不在源站上跑
#   5 个模板的 vite 构建峰值内存远超 2GB 源站的余量（源站常态已用 ~72%，
#   且要留给 MySQL / gunicorn / celery）。构建一律放在 CI 或本地开发机执行，
#   产物提交进仓库，源站只做静态托管 —— 零内存开销。
#
# 用法
#   ./scripts/build_shop_templates.sh            # 全量重建
#   ./scripts/build_shop_templates.sh bevel-design-style-reference   # 只重建一个
#   SKIP_COVERS=1 ./scripts/build_shop_templates.sh                  # 跳过封面生成
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/shop_templates"
OUT_DIR="$REPO_ROOT/templates_static"

cd "$REPO_ROOT"

if [[ $# -gt 0 ]]; then
  SLUGS=("$@")
else
  SLUGS=()
  for d in "$SRC_DIR"/*/; do
    SLUGS+=("$(basename "$d")")
  done
fi

for slug in "${SLUGS[@]}"; do
  src="$SRC_DIR/$slug"
  if [[ ! -f "$src/package.json" ]]; then
    echo "  ! 跳过（无 package.json）: $slug"
    continue
  fi

  echo "── 构建 $slug"
  (cd "$src" && npm ci --no-audit --no-fund && npm run build)

  if [[ ! -f "$src/dist/index.html" ]]; then
    echo "  ! 未产出 dist/index.html: $slug" >&2
    exit 1
  fi

  mkdir -p "$OUT_DIR/$slug"
  cp "$src/dist/index.html" "$OUT_DIR/$slug/index.html"
  echo "  + templates_static/$slug/index.html ($(du -h "$OUT_DIR/$slug/index.html" | cut -f1))"
done

if [[ "${SKIP_COVERS:-0}" != "1" ]]; then
  echo "── 生成封面图"
  python3 "$REPO_ROOT/scripts/gen_template_covers.py"
fi

echo "完成。源站刷新（无需重建镜像，目录为宿主挂载）："
echo "  docker exec ziggner-nginx-1 nginx -s reload"
