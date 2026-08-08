# Ziggner 命令速查

## 本地（在你电脑上操作）

**创建容器**
```
cd D:\下载\浏览器下载\change\Ziggner\Ziggner
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**进入 db 容器**
```
docker compose -f docker-compose.prod.yml --env-file .env.production exec db bash
```

**进入 web 容器**
```
docker compose -f docker-compose.prod.yml --env-file .env.production exec django-app bash
```

**迁移**
```
python manage.py migrate
```

**创建超级管理员**
```
python manage.py createsuperuser
```

**本机 Django 后台**（只有你这台电脑能打开）
```
https://127.0.0.1/admin/
```

## 公网（浏览器直接访问，别人也能访问）

```
商城：    https://ziggner.huigeli666.workers.dev
管理后台： https://ziggner.huigeli666.workers.dev/admin
```

## 更新代码

```
git add -A
git commit -m "xxx"
git push origin master
```
