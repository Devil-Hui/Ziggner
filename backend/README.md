# 开发环境搭建

## Docker & Docker Compose

### 一、克隆项目

```bash
git clone 
```

### 二、完善配置

```bash
cd backend-template
cp .evn.example .env
cp project/config/settings/dev.py.example project/config/settings/dev.py
```

### 三、构建镜像&启动容器

```bash
docker compose up -d
```

### 四、新增数据库

```bash
# 登录db容器
docker container exec -it db /bin/bash
# 登录数据库
mysql -u root -p
# 密码 root

# 创建数据库
create database backend;
# 退出数据库
exit;
# 退出容器
exit
```

### 四、登录 web 容器&启动服务

```bash
# 登录容器
docker container exec -it web /bin/bash
# 执行迁移
python manage.py migrate
# 插入首个用户: 执行下面的命令，依照提示输入
python manage.py createsuperuser
# 启动服务
./setup

# 1. 安装正确的 Python ES 客户端
docker exec web pip install elasticsearch==7.17.0 elasticsearch-dsl==7.4.0

# 2. 下载并安装 IK 插件（内存充足且有要求中文分词在安装）
wget -O /tmp/elasticsearch-analysis-ik-7.17.20.zip https://release.infinilabs.com/analysis-ik/stable/elasticsearch-analysis-ik-7.17.20.zip
docker cp /tmp/elasticsearch-analysis-ik-7.17.20.zip elasticsearch:/tmp/
docker exec elasticsearch /usr/share/elasticsearch/bin/elasticsearch-plugin install file:///tmp/elasticsearch-analysis-ik-7.17.20.zip
docker restart elasticsearch
rm /tmp/elasticsearch-analysis-ik-7.17.20.zip
docker exec elasticsearch rm /tmp/elasticsearch-analysis-ik-7.17.20.zip

# 3. 重建索引
docker exec web python manage.py rebuild_es_index
```
### 五、访问测试

在浏览器打开

- 后台页面 http://127.0.0.1:8000/admin
- api 文档 http://127.0.0.1:8000/api/swagger-ui
