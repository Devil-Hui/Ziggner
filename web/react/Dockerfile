# Stage 1: Build React app
FROM docker.m.daocloud.io/library/node:22-alpine AS builder

RUN npm config set registry https://registry.npmmirror.com

ARG APP_VERSION
ARG GIT_COMMIT
ARG VITE_TURNSTILE_SITE_KEY

ENV VITE_APP_VERSION=${APP_VERSION}
ENV VITE_GIT_COMMIT=${GIT_COMMIT}
ENV VITE_TURNSTILE_SITE_KEY=${VITE_TURNSTILE_SITE_KEY}

WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# Stage 2: Serve with nginx (极轻量，仅 64m mem_limit)
FROM docker.m.daocloud.io/library/nginx:alpine

COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/default.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80 443
