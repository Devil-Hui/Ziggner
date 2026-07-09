# =============================================================================
# Ziggner Frontend — Multi-Stage Dockerfile
# Stage 1: Node.js → Build React app
# Stage 2: Nginx Alpine → Serve static files + reverse proxy
# Target: 2 vCPU / 4GB RAM Server
#
# Build with Chinese mirrors:
#   docker build --build-arg NPM_REGISTRY=https://registry.npmmirror.com \
#                -t ziggner-nginx -f Dockerfile .
# =============================================================================

# ── Stage 1: Builder ─────────────────────────────────────────────────────────
FROM node:22.14.0-alpine3.21 AS builder

# npm mirror (override for China: https://registry.npmmirror.com)
ARG NPM_REGISTRY=https://registry.npmjs.org

WORKDIR /app

# Copy package files first → cache layer for npm install
COPY package.json package-lock.json* ./

# Install ALL deps (devDependencies needed for TypeScript/Vite build)
RUN npm install --registry=${NPM_REGISTRY}

# Copy source code
COPY . .

# Build for production
RUN npm run build

# ── Stage 2: Runtime (Nginx) ─────────────────────────────────────────────────
FROM nginx:1.27.4-alpine3.21-slim

# Remove default nginx config
RUN rm -f /etc/nginx/conf.d/default.conf /etc/nginx/nginx.conf

# Copy custom nginx main config (sets pid to /tmp for non-root container)
COPY --chown=nginx:nginx ./nginx/nginx.conf /etc/nginx/nginx.conf

# Copy custom nginx server config
COPY --chown=nginx:nginx ./nginx/default.conf /etc/nginx/conf.d/default.conf

# Copy built frontend from builder
COPY --from=builder --chown=nginx:nginx /app/dist /usr/share/nginx/html

# Create required directories with correct permissions
RUN mkdir -p /var/cache/nginx /var/run \
    && chown -R nginx:nginx /var/cache/nginx /var/run /usr/share/nginx/html

# Create health check endpoint
RUN mkdir -p /usr/share/nginx/html/health \
    && echo "ok" > /usr/share/nginx/html/health/index.html

# Non-root user (nginx image already has nginx user)
USER nginx

HEALTHCHECK --interval=15s --timeout=5s --start-period=5s --retries=3 \
    CMD wget -qO- http://localhost:80/healthz || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
