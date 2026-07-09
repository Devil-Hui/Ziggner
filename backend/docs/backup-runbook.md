# Ziggner 数据库备份与恢复手册（Backup Runbook）

> 适用范围：Django 5.1 + MySQL 8（容器 `ziggner-db`）单机部署
> 关联文档：`OPS.md` §6 P0#1 与 §4.2「数据备份」
> 配套脚本：`backend/scripts/backup_db.sh`、`backend/scripts/restore_db.sh`

本文档说明如何部署自动化数据库备份（每日全量 → 本地 + Cloudflare R2）、如何验证、以及如何进行恢复演练。

---

## 1. 前置依赖

| 组件 | 用途 | 备注 |
|------|------|------|
| `docker` | 进入 `ziggner-db` 容器执行 `mysqldump` / `mysql` | 已随 Docker Compose 安装 |
| `aws` CLI v2 | 上传 / 下载 / 清理 Cloudflare R2（S3 兼容） | 需单独安装 |
| `gzip` / `date`(GNU) / `find` / `flock` / `logger` | 压缩、日期计算、清理、互斥锁、系统日志 | 标准 Linux 工具 |
| root 权限 | 写入 `/var/backups/ziggner`、操作 systemd | 宿主机以 root 运行 |

### 1.1 安装 AWS CLI v2

```bash
# 下载官方安装包
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o /tmp/awscliv2.zip
unzip -o /tmp/awscliv2.zip -d /tmp
sudo /tmp/aws/install

# 验证
aws --version          # 应显示 aws-cli/2.x
```

### 1.2 校验 R2 连通性（可选但推荐）

```bash
# 在已载入 R2 变量的环境下执行
aws s3 ls --endpoint-url "$R2_ENDPOINT" --region auto
# 能列出桶内对象即表示凭证 / 网络正常
```

---

## 2. `.env.production` 需填的 R2 变量

备份脚本**不硬编码任何密钥**，全部从环境变量读取。请确认生产环境 `.env.production`（项目根目录 `Ziggner/.env.production`）已包含以下变量：

| 变量名 | 说明 | 示例 |
|--------|------|------|
| `MYSQL_ROOT_PASSWORD` | MySQL root 密码 | `S3cure-R00t-P4ss-2025!` |
| `R2_ACCOUNT_ID` | Cloudflare 账户 ID | `a1b2c3d4...` |
| `R2_ACCESS_KEY_ID` | R2 API 访问密钥 ID | `xxxxxxxxxxxx` |
| `R2_SECRET_ACCESS_KEY` | R2 API 密钥 | `yyyyyyyyyyyy` |
| `R2_BUCKET_NAME` | 目标存储桶名称 | `ziggner-backups` |
| `R2_ENDPOINT` | R2 S3 端点 | `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` |

> 脚本在启动时也会尝试 `source` 该文件；若由 systemd 托管，可同时通过 `EnvironmentFile=` 注入。二者提供其一即可。

---

## 3. 首次手动执行验证

**切勿直接对线上容器执行未经验证的脚本。** 请按以下步骤手动跑一次：

```bash
# 1) 进入脚本目录
cd /opt/ziggner/backend/scripts        # 或你的实际部署路径

# 2) 确保凭证已就位（手动 export 或确认 .env.production 存在）
#    export MYSQL_ROOT_PASSWORD=... R2_ACCOUNT_ID=... R2_ACCESS_KEY_ID=... \
#           R2_SECRET_ACCESS_KEY=... R2_BUCKET_NAME=... R2_ENDPOINT=...

# 3) 手动执行一次备份
sudo ./backup_db.sh

# 4) 检查产物
ls -lh /var/backups/ziggner/                       # 应有 ziggner-db-YYYYMMDD.sql.gz
aws s3 ls s3://$R2_BUCKET_NAME/ --endpoint-url "$R2_ENDPOINT" --region auto   # R2 上应有同名对象
tail -n 20 /var/log/ziggner/backup.log             # 查看运行日志
journalctl -t ziggner-backup -e                    # 查看 logger 系统日志
```

验证要点：
- 本地与 R2 均出现当日备份文件，且大小合理（非 0 字节）。
- 日志最后一行显示 `备份任务成功完成 ✅`。

---

## 4. 定时任务部署

### 方案 A：systemd（推荐，本机长期运行）

```bash
# 复制单元文件到系统目录
sudo cp ziggner-backup.service ziggner-backup.timer /etc/systemd/system/

# 赋予脚本可执行权限（若服务指向 /usr/local/bin）
sudo install -m 0755 backup_db.sh /usr/local/bin/ziggner-backup.sh

# 重新加载并启用定时器
sudo systemctl daemon-reload
sudo systemctl enable --now ziggner-backup.timer

# 查看定时器状态
systemctl status ziggner-backup.timer
systemctl list-timers ziggner-backup.timer
```

> 默认每日 **03:00** 触发（`OnCalendar=*-*-* 03:00:00`，含 5 分钟随机抖动）。日志见 `journalctl -u ziggner-backup.service -e`。

### 方案 B：cron（备选）

若不希望使用 systemd，可执行 `crontab -e` 添加：

```cron
# 每日 03:00 执行备份，输出追加到日志
0 3 * * * /usr/local/bin/ziggner-backup.sh >> /var/log/ziggner/backup.cron.log 2>&1
```

---

## 5. 恢复演练步骤

恢复会**覆盖现有数据**，务必先在预发 / 测试环境演练，并确认已有可用备份。

```bash
# 语法 / 帮助
./restore_db.sh --help

# 从本地备份恢复指定日期（交互确认）
./restore_db.sh --date 20250704

# 从 R2 下载并恢复（跳过交互确认，脚本内仍需谨慎）
./restore_db.sh --date 20250704 --source r2 --force
```

恢复流程说明：
1. 解析 `--date YYYYMMDD`，校验格式与 `--source` 合法性。
2. 本地源：直接使用 `/var/backups/ziggner/ziggner-db-YYYYMMDD.sql.gz`；R2 源：先 `aws s3 cp` 下载到 `/tmp`。
3. 交互确认（除非 `--force`）：提示将覆盖目标库。
4. 在容器内 `CREATE DATABASE IF NOT EXISTS ziggner`（utf8mb4）。
5. `gunzip -c <备份> | docker exec -i ziggner-db mysql ... ziggner` 完成导入。
6. 若来自 R2，导入后清理 `/tmp` 下的临时文件。

演练检查：
- 导入后业务可正常连接数据库、核心表行数与预期一致。
- 建议在测试库先 `DROP` 部分数据再恢复，确认数据可还原。

---

## 6. 保留策略

| 存储位置 | 保留时长 | 清理方式 |
|----------|----------|----------|
| 本地 `/var/backups/ziggner` | **7 天** | 脚本内 `find -mtime +7 -delete` |
| Cloudflare R2 | **30 天** | 脚本内 `aws s3 ls` 比对日期后 `aws s3 rm` |

- 每日一个全量文件，命名 `ziggner-db-YYYYMMDD.sql.gz`。
- 本地清理在每次备份成功后执行；R2 清理同理。
- 如需更长保留，提高 `R2_RETENTION_DAYS` 环境变量，或直接在 R2 桶配置生命周期规则作为兜底。

---

## 7. 故障排查

### 7.1 R2 权限 / 凭证错误
- 现象：`aws s3 cp` 报 `AccessDenied` / `InvalidAccessKeyId`。
- 排查：
  - 确认 `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` 与 R2 桶的 API Token 权限（需 `Object Read & Write`）匹配。
  - 确认 `R2_BUCKET_NAME` 与 `R2_ENDPOINT` 拼写正确（endpoint 必须含账户 ID）。
  - 用 `aws s3 ls --endpoint-url "$R2_ENDPOINT" --region auto` 单独验证。

### 7.2 网络问题
- 现象：上传 / 下载超时、连接被拒。
- 排查：
  - 宿主机能否访问 `R2_ENDPOINT`（防火墙 / 出网策略）。
  - 若经代理，需为 `aws` 配置 `HTTPS_PROXY`。
  - `systemctl status ziggner-backup.timer` 确认定时触发时网络已在线（`Wants=network-online.target`）。

### 7.3 磁盘空间不足
- 现象：本地备份写入失败、`No space left on device`。
- 排查：
  - `df -h /var/backups` 检查磁盘。
  - 临时文件写在与最终文件相同的 `BACKUP_DIR`，确保该分区有足够空间容纳一次全量（压缩后）。
  - 若长期紧张，可下调 `LOCAL_RETENTION_DAYS` 或挂载更大卷。

### 7.4 MySQL / 容器问题
- 现象：`docker exec ziggner-db ... mysqldump` 失败。
- 排查：
  - 容器是否运行：`docker ps | grep ziggner-db`。
  - `MYSQL_ROOT_PASSWORD` 是否正确（与容器初始化一致）。
  - 备份库是否为 InnoDB（一致快照依赖 `--single-transaction`）。

### 7.5 通用排错命令
```bash
# 查看最近一次备份日志
tail -n 50 /var/log/ziggner/backup.log

# 查看系统日志中的备份告警
journalctl -t ziggner-backup -e

# systemd 方式下查看单元运行记录
journalctl -u ziggner-backup.service -e

# 手动语法检查脚本
bash -n backup_db.sh
bash -n restore_db.sh
```

---

## 8. 文件清单

| 文件 | 作用 |
|------|------|
| `backend/scripts/backup_db.sh` | 每日全量备份 + 双写本地/R2 + 保留清理 |
| `backend/scripts/restore_db.sh` | 按日期从本地或 R2 恢复 |
| `backend/scripts/ziggner-backup.service` | systemd 服务单元 |
| `backend/scripts/ziggner-backup.timer` | systemd 定时器（每日 03:00） |
| `backend/docs/backup-runbook.md` | 本手册 |
