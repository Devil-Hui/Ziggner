# Ziggner 项目配置

| 文件 | 说明 |
|------|------|
| `config/settings/base.py` | 通用配置 + 业务参数（客服/限流/通知等） |
| `config/settings/prod.py` | 生产环境覆盖 |
| `config/settings/dev.py` | 开发环境覆盖 |
| `celery.py` | Celery 任务 + Beat 调度 |
| `gunicorn.conf.py` | Gunicorn 2worker×4threads |
