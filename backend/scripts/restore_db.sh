#!/usr/bin/env bash
#
# ============================================================================
# Ziggner 数据库恢复脚本 (restore_db.sh)
# ----------------------------------------------------------------------------
# 依赖 (Dependencies):
#   - docker      : 进入 MySQL 容器执行 mysql 导入
#   - aws CLI v2  : 当 --source r2 时，从 Cloudflare R2 下载备份
#   - gunzip      : 解压 .sql.gz
#
# 用法 (Usage):
#   ./restore_db.sh --date YYYYMMDD [--source local|r2] [--force]
#   ./restore_db.sh --help
#
# 说明:
#   - 默认从本地 (/var/backups/ziggner) 恢复；--source r2 则先从 R2 下载到 /tmp。
#   - 恢复前会自动 CREATE DATABASE IF NOT EXISTS，再 gunzip | mysql 导入。
#   - 该操作会覆盖现有数据，请务必谨慎，并先确认存在可用备份。
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/../../.env.production}"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-ziggner-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-ziggner}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ziggner}"
R2_PREFIX="${R2_PREFIX:-}"
AWS_REGION="${AWS_REGION:-auto}"

RESTORE_DATE=""
SOURCE="local"
FORCE=0

# ---------- 工具函数 ----------
log() { echo "[$(date '+%F %T')] INFO:  $*"; }
die() {
  echo "[$(date '+%F %T')] ERROR: $*" >&2
  logger -t ziggner-restore -p user.err "ERROR: $*"
  exit 1
}
usage() {
  cat <<EOF
Ziggner 数据库恢复脚本

用法:
  $(basename "$0") --date YYYYMMDD [--source local|r2] [--force]
  $(basename "$0") --help

参数:
  --date YYYYMMDD   指定要恢复的备份日期（必填）
  --source local    从本地 /var/backups/ziggner 恢复（默认）
  --source r2       先从 Cloudflare R2 下载再恢复
  --force           跳过交互式确认（谨慎使用）
  --help, -h        显示本帮助

示例:
  $(basename "$0") --date 20250704
  $(basename "$0") --date 20250704 --source r2 --force
EOF
  exit 0
}
require_var() {
  local name="$1"
  [ -z "${!name:-}" ] && die "缺少必需环境变量：$name"
}

# ---------- 参数解析 ----------
while [ $# -gt 0 ]; do
  case "$1" in
    --date)   RESTORE_DATE="${2:-}"; shift 2;;
    --source) SOURCE="${2:-local}"; shift 2;;
    --force)  FORCE=1; shift;;
    --help|-h) usage;;
    *) die "未知参数：$1（使用 --help 查看用法）";;
  esac
done

# ---------- 校验 ----------
[ -z "$RESTORE_DATE" ] && die "必须指定 --date YYYYMMDD（使用 --help 查看用法）"
if ! [[ "$RESTORE_DATE" =~ ^[0-9]{8}$ ]]; then
  die "--date 格式应为 YYYYMMDD（8 位数字），收到：$RESTORE_DATE"
fi
case "$SOURCE" in
  local|r2) ;;
  *) die "--source 仅支持 local 或 r2，收到：$SOURCE";;
esac

# ---------- 载入环境 ----------
set +u
if [ -f "$ENV_FILE" ]; then
  set -a; source "$ENV_FILE"; set +a
fi
set -u
require_var MYSQL_ROOT_PASSWORD
require_var R2_ACCOUNT_ID
require_var R2_ACCESS_KEY_ID
require_var R2_SECRET_ACCESS_KEY
require_var R2_BUCKET_NAME
require_var R2_ENDPOINT
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
[ -z "${R2_ENDPOINT:-}" ] && R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
[ -n "$R2_PREFIX" ] && [ "${R2_PREFIX: -1}" != "/" ] && R2_PREFIX="${R2_PREFIX}/"

FILENAME="ziggner-db-${RESTORE_DATE}.sql.gz"

# ---------- 定位备份文件 ----------
if [ "$SOURCE" = "local" ]; then
  LOCAL_FILE="${BACKUP_DIR}/${FILENAME}"
  [ -f "$LOCAL_FILE" ] || die "本地备份不存在：$LOCAL_FILE"
  RESTORE_FILE="$LOCAL_FILE"
  log "使用本地备份：$RESTORE_FILE"
else
  RESTORE_FILE="/tmp/${FILENAME}"
  R2_URI="s3://${R2_BUCKET_NAME}/${R2_PREFIX}${FILENAME}"
  log "从 R2 下载：$R2_URI -> $RESTORE_FILE"
  aws s3 cp "$R2_URI" "$RESTORE_FILE" --endpoint-url "$R2_ENDPOINT" --region "$AWS_REGION" \
    || die "从 R2 下载备份失败：$R2_URI"
  [ -f "$RESTORE_FILE" ] || die "下载后未找到文件：$RESTORE_FILE"
fi

# ---------- 安全确认 ----------
if [ "$FORCE" -ne 1 ]; then
  read -r -p "确认要将 $FILENAME 恢复到数据库 '$MYSQL_DATABASE' 吗？该操作会覆盖现有数据！[y/N] " answer
  case "$answer" in
    y|Y) ;;
    *) log "已取消恢复操作。"; exit 0;;
  esac
fi

# ---------- 执行恢复 ----------
log "确保数据库存在：$MYSQL_DATABASE"
docker exec "$MYSQL_CONTAINER" sh -c \
  "mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" -e 'CREATE DATABASE IF NOT EXISTS \`$MYSQL_DATABASE\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;'"

log "开始导入数据（gunzip | mysql）..."
gunzip -c "$RESTORE_FILE" \
  | docker exec -i "$MYSQL_CONTAINER" sh -c \
      "mysql -u root -p\"$MYSQL_ROOT_PASSWORD\" --default-character-set=utf8mb4 '$MYSQL_DATABASE'"

log "恢复完成 ✅：$FILENAME -> 数据库 '$MYSQL_DATABASE'"

# 清理从 R2 下载的临时文件
if [ "$SOURCE" = "r2" ]; then
  rm -f "$RESTORE_FILE"
  log "已清理临时下载文件：$RESTORE_FILE"
fi
exit 0
