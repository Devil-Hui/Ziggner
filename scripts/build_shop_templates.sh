#!/usr/bin/env bash
# =============================================================================
# 重建「网页搭建」模板预览站
# =============================================================================
# 做什么
#   1. 逐个 shop_templates/<slug> 执行 npm ci + vite build（vite-plugin-singlefile
#      → 产出自包含单文件 dist/index.html，可直接 iframe 嵌入）
#   2. 把 dist/index.html 同步到 web/react/public/templates/<slug>/index.html
#      Vite 会把 public/ 原样拷进 dist/，因此产物由 Cloudflare Worker 在边缘直出：
#        https://shop.ziggner.com/templates/<slug>/index.html
#      （不用 api.ziggner.com —— 那是内部域名，不应对外暴露）
#
# 为什么不在源站上跑
#   5 个模板的 vite 构建峰值内存远超 2GB 源站的余量（源站常态已用 ~72%，
#   且要留给 MySQL / gunicorn / celery）。构建一律放在 CI 或本地开发机执行，
#   产物提交进仓库，源站只做静态托管 —— 零内存开销。
#
# 用法
#   ./scripts/build_shop_templates.sh            # 全量重建
#   ./scripts/build_shop_templates.sh bevel-design-style-reference   # 只重建一个
#   截图封面另见 scripts/shot_template_covers.py（同样只在 CI 跑）
# =============================================================================
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$REPO_ROOT/shop_templates"
OUT_DIR="$REPO_ROOT/web/react/public/templates"

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
  echo "  + public/templates/$slug/index.html ($(du -h "$OUT_DIR/$slug/index.html" | cut -f1))"
done

echo "完成。封面截图（需 Chromium，只在 CI 跑）："
echo "  python3 scripts/shot_template_covers.py"
echo
echo "产物由 Cloudflare Worker 在边缘直出，push 后自动生效："
echo "  https://shop.ziggner.com/templates/<slug>/index.html"
echo "源站 nginx 同步挂载同一目录作为兜底："
echo "  docker exec ziggner-nginx-1 nginx -s reload"
