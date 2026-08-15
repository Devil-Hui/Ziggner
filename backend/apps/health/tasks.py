"""DB 备份任务 — 每日 mysqldump 到 /backups（backup_data 卷），保留最近 7 份。"""
import gzip
import logging
import os
import subprocess
from datetime import datetime

from celery import shared_task
from django.conf import settings

logger = logging.getLogger('biz')

BACKUP_KEEP = int(os.getenv('BACKUP_KEEP', '7'))


@shared_task(name='health.db_backup', bind=True, max_retries=3, default_retry_delay=300)
def db_backup(self):
    """mysqldump --single-transaction 全库备份，gzip 压缩，输出到 BACKUP_DIR。

    由 celery-beat 每日调度；worker 容器挂载 backup_data:/backups。
    凭据经 MYSQL_PWD 环境变量传递，避免出现在进程命令行。
    """
    backup_dir = os.getenv('BACKUP_DIR', '/backups')
    os.makedirs(backup_dir, exist_ok=True)

    db_conf = settings.DATABASES['default']
    ts = datetime.now().strftime('%Y%m%d_%H%M%S')
    out_path = os.path.join(backup_dir, f'db_{ts}.sql.gz')

    env = {**os.environ, 'MYSQL_PWD': db_conf.get('PASSWORD') or ''}
    cmd = [
        'mysqldump',
        f'--host={db_conf.get("HOST", "db")}',
        f'--port={db_conf.get("PORT") or 3306}',
        f'--user={db_conf.get("USER", "")}',
        '--single-transaction',
        '--routines',
        '--triggers',
        '--default-character-set=utf8mb4',
        db_conf.get('NAME', ''),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, env=env, timeout=600)
    except subprocess.TimeoutExpired as exc:
        logger.error('DB backup timed out')
        raise self.retry(exc=exc)

    if proc.returncode != 0:
        stderr = proc.stderr.decode(errors='replace')[:800]
        logger.error('DB backup mysqldump failed: %s', stderr)
        raise RuntimeError(f'mysqldump failed: {stderr}')

    with gzip.open(out_path, 'wb') as f:
        f.write(proc.stdout)

    # 保留最近 N 份，清理更早的
    backups = sorted(
        name for name in os.listdir(backup_dir)
        if name.startswith('db_') and name.endswith('.sql.gz')
    )
    removed = []
    for old in backups[:-BACKUP_KEEP]:
        os.remove(os.path.join(backup_dir, old))
        removed.append(old)

    size_mb = os.path.getsize(out_path) / 1024 / 1024
    logger.info('DB backup created: %s (%.1f MB), removed=%s', out_path, size_mb, removed)
    return {'path': out_path, 'size_mb': round(size_mb, 1), 'removed': removed}
