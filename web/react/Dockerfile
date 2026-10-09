# Ziggner 前端 nginx 镜像
# 前端 SPA 由 Cloudflare Workers 托管（见 wrangler.toml），nginx 仅做 API/静态代理，
# 镜像内无需 npm 构建，也无需前端 dist（避免每次重建跑 npm install 打爆小 CPU）。
FROM docker.m.daocloud.io/library/nginx:alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
