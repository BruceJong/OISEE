# ============================================================
# OISee API（NestJS）生产镜像
# 构建上下文 = 仓库根目录
#   docker build -f docker/api.Dockerfile .
# ============================================================

# ---------- Stage 1: 构建 ----------
FROM node:22-alpine AS builder
RUN corepack enable && apk add --no-cache openssl
WORKDIR /app

# 先拷 workspace 元数据，最大化利用层缓存（依赖不变则不重装）
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY shared/lib/package.json ./shared/lib/
COPY backend/package.json ./backend/
COPY frontend-user/package.json ./frontend-user/
COPY frontend-admin/package.json ./frontend-admin/
RUN pnpm install --frozen-lockfile

# 拷源码并构建（API 只需 shared + backend）
COPY shared ./shared
COPY backend ./backend
RUN pnpm --filter @oisee/shared build \
 && pnpm --filter @oisee/api exec prisma generate \
 && pnpm --filter @oisee/api build

# ---------- Stage 2: 运行时 ----------
FROM node:22-alpine AS runtime
RUN corepack enable && apk add --no-cache openssl tini
# 携带完整 workspace（含 prisma CLI 与生成的 client，供 migrate deploy 使用）
COPY --from=builder /app /app
WORKDIR /app/backend

ENV OISEE_NODE_ENV=production
EXPOSE 3000
# 容器启动：先应用未执行的迁移，再起服务
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["sh", "-c", "pnpm exec prisma migrate deploy && node dist/main.js"]
