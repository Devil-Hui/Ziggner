# 使用官方 Python 镜像
FROM python:3.10-slim

# 设置工作目录
WORKDIR /backend

# 设置环境变量
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    pkg-config \
    python3-dev \
    default-libmysqlclient-dev \
    build-essential \
    binutils \
    vim \
    procps \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# 复制项目代码
COPY . .

# 安装 Python 依赖
RUN pip install --upgrade pip && \
    pip install --no-cache-dir -r requirements/dev.txt

# 创建日志目录
RUN mkdir -p logs

RUN chmod +x setup.sh

# ⚠️ 开发容器以 root 运行，生产环境请使用 Dockerfile.prod（已配置 appuser 非 root 用户）

# ENTRYPOINT ["./setup.sh"] 