#!/usr/bin/env bash
#
# ============================================================================
# Ziggner 数据库自动备份脚本 (backup_db.sh)
# ----------------------------------------------------------------------------
# 依赖 (Dependencies):
#   - docker        : 进入 MySQL 容器执行 mysqldump
#   - aws CLI v2    : 上传 / 清理 Cloudflare R2（S3 兼容）
#   - gzip / date / find / flock / logger : GNU coreutils / util-linux
#   - 宿主机以 root 身份运行
#
# 用法 (Usage):
#   sudo ./backup_db.sh
#   可选环境变量覆盖：BACKUP_DIR、LOG_FILE、LOCAL_RETENTION_DAYS、
#   R2_RETENTION_DAYS、R2_PREFIX、ENV_FILE、MYSQL_CONTAINER、MYSQL_DATABASE
#
# 保留策略 (Retention):
#   - 本地 (/var/backups/ziggner) : 保留最近 7 天
#   - Cloudflare R2               : 保留最近 30 天
#
# 凭证 (Secrets): 所有密码 / 密钥均从环境变量读取，禁止硬编码。
#   脚本会尝试加载 ENV_FILE（默认 ../../.env.production，相对脚本所在目录），
#   也可由系统环境直接提供。
# ============================================================================

set -euo pipefail

# ---------------------------------------------------------------------------
# 0. 基础配置（均可通过环境变量覆盖）
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 配置文件：优先使用 ENV_FILE，否则尝试脚本目录上两级的 .env.production
ENV_FILE="${ENV_FILE:-${SCRIPT_DIR}/../../.env.production}"

MYSQL_CONTAINER="${MYSQL_CONTAINER:-ziggner-db}"
MYSQL_DATABASE="${MYSQL_DATABASE:-ziggner}"

BACKUP_DIR="${BACKUP_DIR:-/var/backups/ziggner}"
LOG_FILE="${LOG_FILE:-/var/log/ziggner/backup.log}"
LOCK_FILE="${LOCK_FILE:-/var/run/ziggner-backup.lock}"

LOCAL_RETENTION_DAYS="${LOCAL_RETENTION_DAYS:-7}"
R2_RETENTION_DAYS="${R2_RETENTION_DAYS:-30}"
R2_PREFIX="${R2_PREFIX:-}"          # 可选：R2 桶内子目录，例如 "db/"
AWS_REGION="${AWS_REGION:-auto}"

# ---------------------------------------------------------------------------
# 1. 工具函数
# ---------------------------------------------------------------------------
log() {
  local msg="$1"
  echo "[$(date '+%F %T')] INFO:  $msg" | tee -a "$LOG_FILE"
}

die() {
  local msg="$1"
  logger -t ziggner-backup -p user.err "ERROR: $msg"
  echo "[$(date '+%F %T')] ERROR: $msg" | tee -a "$LOG_FILE" >&2
  exit 1
}

require_var() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    die "缺少必需环境变量：$name（请在 .env.production 或系统环境中配置）"
  fi
}

# 退出时清理临时文件，避免残留半成品
trap 'rm -f "${TMP_FILE:-}"' EXIT
# 未预期错误时报警并退出（非零码）
trap 'die "未预期错误，脚本以非零状态退出（ERR trap）"' ERR

# ---------------------------------------------------------------------------
# 2. 环境检查
# ---------------------------------------------------------------------------
# 预检：aws CLI
if ! command -v aws >/dev/null 2>&1; then
  die "未检测到 aws CLI。请先安装 AWS CLI v2，例如：
    curl \"https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip\" -o /tmp/awscliv2.zip
    unzip -o /tmp/awscliv2.zip -d /tmp && sudo /tmp/aws/install
  详见 backup-runbook.md 第 1 节「前置依赖」。"
fi

# 预检：docker
if ! command -v docker >/dev/null 2>&1; then
  die "未检测到 docker 命令，无法执行容器内的 mysqldump。"
fi

# 载入 .env.production（临时关闭 set -u，避免引用未定义变量报错）
set +u
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source "$ENV_FILE"
  set +a
  log "已从 $ENV_FILE 载入配置环境变量。"
else
  log "未找到 $ENV_FILE，将直接使用当前系统环境变量。"
fi
set -u

# 校验必需变量（全部为敏感凭证，绝不可硬编码）
require_var MYSQL_ROOT_PASSWORD
require_var R2_ACCOUNT_ID
require_var R2_ACCESS_KEY_ID
require_var R2_SECRET_ACCESS_KEY
require_var R2_BUCKET_NAME
require_var R2_ENDPOINT

# 映射 R2 凭证给 aws CLI 使用
export AWS_ACCESS_KEY_ID="$R2_ACCESS_KEY_ID"
export AWS_SECRET_ACCESS_KEY="$R2_SECRET_ACCESS_KEY"
# 统一 R2 endpoint（若未显式给出则按账户 ID 推导）
if [ -z "${R2_ENDPOINT:-}" ]; then
  R2_ENDPOINT="https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
fi

# 规范化 R2 前缀（确保以 / 结尾）
if [ -n "$R2_PREFIX" ] && [ "${R2_PREFIX: -1}" != "/" ]; then
  R2_PREFIX="${R2_PREFIX}/"
fi

# ---------------------------------------------------------------------------
# 3. 准备目录 / 互斥锁
# ---------------------------------------------------------------------------
mkdir -p "$BACKUP_DIR" "$(dirname "$LOG_FILE")"

# 互斥锁，避免同一时间并发执行多次备份
exec 200>"$LOCK_FILE"
if ! flock -n 200; then
  die "已有备份进程在运行（锁文件 $LOCK_FILE 被占用）。"
fi

DATE="$(date +%Y%m%d)"
FILENAME="ziggner-db-${DATE}.sql.gz"
LOCAL_FILE="${BACKUP_DIR}/${FILENAME}"
TMP_FILE="${BACKUP_DIR}/.${FILENAME}.tmp"

# ---------------------------------------------------------------------------
# 4. 执行备份（容器内 mysqldump -> gzip）
# ---------------------------------------------------------------------------
log "开始备份数据库 '$MYSQL_DATABASE'（容器 $MYSQL_CONTAINER）..."

# 说明：
#   --single-transaction  : 对 InnoDB 提供一致性快照且不加全局锁，不影响线上读写
#   --routines / --triggers : 一并导出存储过程与触发器
#   密码通过宿主 shell 变量展开后传入，不会以明文出现在容器 ps 中
docker exec "$MYSQL_CONTAINER" sh -c \
  "mysqldump -u root -p\"$MYSQL_ROOT_PASSWORD\" \
   --single-transaction --routines --triggers --default-character-set=utf8mb4 \
   '$MYSQL_DATABASE'" \
  | gzip > "$TMP_FILE"

# 原子重命名，避免产生半成品文件（pipefail 已保证 mysqldump 失败时不会写入 LOCAL_FILE）
mv -f "$TMP_FILE" "$LOCAL_FILE"
log "本地备份完成：$LOCAL_FILE ($(du -h "$LOCAL_FILE" | cut -f1))"

# ---------------------------------------------------------------------------
# 5. 上传至 Cloudflare R2（双写）
# ---------------------------------------------------------------------------
R2_KEY="${R2_PREFIX}${FILENAME}"
R2_URI="s3://${R2_BUCKET_NAME}/${R2_KEY}"

log "上传至 R2：$R2_URI"
aws s3 cp "$LOCAL_FILE" "$R2_URI" \
  --endpoint-url "$R2_ENDPOINT" \
  --region "$AWS_REGION"

log "R2 上传完成。"

# ---------------------------------------------------------------------------
# 6. 本地保留策略：删除 7 天前的文件
# ---------------------------------------------------------------------------
log "清理本地超过 ${LOCAL_RETENTION_DAYS} 天的备份..."
find "$BACKUP_DIR" -maxdepth 1 -name 'ziggner-db-*.sql.gz' -type f \
  -mtime "+${LOCAL_RETENTION_DAYS}" -print -delete || true

# ---------------------------------------------------------------------------
# 7. R2 保留策略：删除 30 天前的对象
# ---------------------------------------------------------------------------
log "清理 R2 中超过 ${R2_RETENTION_DAYS} 天的备份..."
CUTOFF_TS="$(date -d "${R2_RETENTION_DAYS} days ago" +%s)"

# aws s3 ls 输出形如：2025-07-04 12:34:56      12345 ziggner-db-20250704.sql.gz
aws s3 ls "s3://${R2_BUCKET_NAME}/${R2_PREFIX}" \
  --endpoint-url "$R2_ENDPOINT" --region "$AWS_REGION" \
  | awk '{print $1, $2, $4}' \
  | while read -r fdate ftime key; do
      # 仅处理形如 2025-01-01 的日期行（跳过 PRE 目录行）
      [ "${#fdate}" -eq 10 ] || continue
      file_ts="$(date -d "${fdate} ${ftime}" +%s 2>/dev/null || echo 0)"
      if [ "$file_ts" -lt "$CUTOFF_TS" ]; then
        log "删除过期 R2 对象：${R2_PREFIX}${key}"
        if ! aws s3 rm "s3://${R2_BUCKET_NAME}/${R2_PREFIX}${key}" \
              --endpoint-url "$R2_ENDPOINT" --region "$AWS_REGION"; then
          log "警告：删除过期对象 ${key} 失败，请稍后手动处理。"
        fi
      fi
    done

# ---------------------------------------------------------------------------
# 8. 完成
# ---------------------------------------------------------------------------
log "备份任务成功完成 ✅"
logger -t ziggner-backup -p user.info "备份成功：$FILENAME"
exit 0
