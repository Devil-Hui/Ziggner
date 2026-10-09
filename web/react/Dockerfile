# Stage 1: 使用宿主已构建好的 dist（不在镜像内跑 npm，2 核小机单次构建 80 分钟扛不住）
# 构建步骤在宿主机执行: cd web/react && npm run build
FROM docker.m.daocloud.io/library/nginx:alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY dist /usr/share/nginx/html

EXPOSE 80 443