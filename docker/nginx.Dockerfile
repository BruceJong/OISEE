# ============================================================
# OISee 前端构建 + Nginx（静态托管 + API 反向代理）
# 构建上下文 = 仓库根目录
#   docker build -f docker/nginx.Dockerfile .
# ============================================================

# ---------- Stage 1: 构建两个前端 ----------
FROM node:22-alpine AS builder
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/lib/package.json ./shared/lib/
COPY backend/package.json ./backend/
COPY frontend-user/package.json ./frontend-user/
COPY frontend-admin/package.json ./frontend-admin/
RUN pnpm install --frozen-lockfile

COPY shared ./shared
COPY frontend-user ./frontend-user
COPY frontend-admin ./frontend-admin
# 先构建 shared（前端依赖它），再分别构建用户端 / 管理端
RUN pnpm --filter @oisee/shared build \
 && pnpm --filter @oisee/web build \
 && pnpm --filter @oisee/cms build

# ---------- Stage 2: Nginx ----------
FROM nginx:1.27-alpine
COPY docker/nginx.conf /etc/nginx/nginx.conf
# 用户端挂根路径；管理端 base=/cms/，挂 /cms/ 子目录
COPY --from=builder /app/frontend-user/dist /usr/share/nginx/html/
COPY --from=builder /app/frontend-admin/dist /usr/share/nginx/html/cms/
EXPOSE 80 443
