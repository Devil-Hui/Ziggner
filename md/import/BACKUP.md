# Ziggner 数据备份说明

## 备份位置

所有数据库备份存储在宿主机目录：`Ziggner-backups/`

此目录独立于 Docker 容器，即使容器全部删除，备份文件也不会丢失。

## 备份文件命名

```
ziggner_20260707_235110.sql.gz
ziggner_20260708_040000.sql.gz
ziggner_20260709_040000.sql.gz
```

格式：`ziggner_YYYYMMDD_HHmmss.sql.gz` — 精确到秒的时间戳，保证每个备份文件名唯一，永不覆盖。

## 触发方式

### 自动备份（每日）

Celery Beat 定时任务 `database-backup-daily`，每天凌晨 04:00 自动执行。

```bash
# 查看任务状态
docker exec ziggner-django python manage.py shell -c "
from django_celery_beat.models import PeriodicTask
t = PeriodicTask.objects.get(name='database-backup-daily')
print(f'启用: {t.enabled}, 调度: {t.crontab}')
"
```

### 手动备份（随时）

```bash
docker exec ziggner-db sh -c 'mysqldump -u root -p"$MYSQL_ROOT_PASSWORD" --single-transaction --routines --triggers --events ziggner' | gzip > ../Ziggner-backups/ziggner_$(date +%Y%m%d_%H%M%S).sql.gz
```

## 恢复

```bash
# 列出所有可用备份
cd Ziggner-backups && ls -lh ziggner_*.sql.gz

# 恢复到指定时间点
zcat ziggner_20260707_235110.sql.gz | docker exec -i ziggner-db mysql -u root -p ziggner
```

## 备份内容

`mysqldump --single-transaction --routines --triggers --events` 包含：
- 所有表数据（事务一致性快照）
- 存储过程和函数
- 触发器
- 定时事件

## 保留策略

不自动删除。所有历史备份永久保留。如需清理旧备份，手动删除对应文件即可。
