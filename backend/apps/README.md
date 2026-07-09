## 应用目录
用于存放所有项目下的应用

### 新建应用
```bash
进入apps 目录

python ../manage.py startapp myapp
```

### 注册应用
```bash
打开 当前app下的 apps.py 文件，修改 name = app.myapp

打开 project/settings.py

在 INSTALLED_APPS 中添加 apps.myapp

```