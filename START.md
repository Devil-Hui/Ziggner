# Ziggner 命令速查

## 开发环境（本地调试用）

**创建容器**
```

docker compose up -d
```

**进入 db 容器**
```
docker compose exec db bash
```

**进入 web 容器**
```
docker compose exec web bash
```

**迁移**
```
python manage.py migrate
```

**创建超级管理员**
```
python manage.py createsuperuser
```

**访问地址**
```
商城前端：  http://localhost:12700
Django后台：http://localhost:8000/admin/
```

## 生产环境（对外部署用）

**创建容器**
```
docker compose -f docker-compose.prod.yml --env-file .env.production up -d
```

**进入 db 容器**
```
docker compose -f docker-compose.prod.yml --env-file .env.production exec db bash
```

**进入 web 容器**
```
docker compose -f docker-compose.prod.yml --env-file .env.production exec web bash
```

**迁移**
```
python manage.py migrate
```

**创建超级管理员**
```
python manage.py createsuperuser
```

**访问地址**
```
商城：    https://ziggner.huigeli666.workers.dev
管理后台： https://ziggner.huigeli666.workers.dev/admin
本机后台： https://127.0.0.1/admin/
```

## 更新代码

```
git add -A
git commit -m "xxx"
git push origin master
```
