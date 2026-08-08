# Ziggner 常用命令

## 创建容器

```
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

## 进入 db 容器

```
docker compose -f docker-compose.prod.yml --env-file .env.production exec db bash
```

## 进入 web 容器

```
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app bash
```

## 迁移

```
python manage.py migrate
```

## 创建超级管理员

```
python manage.py createsuperuser
```

## 访问地址

| 地址 | 是什么 |
|------|--------|
| `https://ziggner.huigeli666.workers.dev` | 商城 |
| `https://ziggner.huigeli666.workers.dev/admin` | 管理后台 |
| `https://127.0.0.1/admin/` | Django 后台（本机） |

## 更新代码

```
git add -A
git commit -m "xxx"
git push origin master
```
