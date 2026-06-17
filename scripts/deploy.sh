#!/usr/bin/env bash
# ============================================================
# OISee 一键发布脚本（在 ECS 的 /opt/oisee/repo 下执行）
#   bash scripts/deploy.sh
# ============================================================
set -euo pipefail

REPO_DIR="${OISEE_REPO_DIR:-/opt/oisee/repo}"
ENV_FILE="${OISEE_ENV_FILE:-/opt/oisee/.env.production}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "✗ 找不到环境变量文件：$ENV_FILE" >&2
  echo "  先：cp .env.production.example $ENV_FILE && chmod 600 $ENV_FILE && 编辑它" >&2
  exit 1
fi

cd "$REPO_DIR"

echo "▶ 拉取最新代码…"
git pull --ff-only

echo "▶ 构建并启动容器（migrate deploy 会在 api 容器启动时自动执行）…"
docker compose --env-file "$ENV_FILE" up -d --build

echo "▶ 清理悬空镜像…"
docker image prune -f

echo "▶ 等待 API 健康检查…"
for _ in $(seq 1 30); do
  if curl -fsS http://localhost/health >/dev/null 2>&1; then
    echo "✅ 部署完成，API 健康"
    docker compose ps
    exit 0
  fi
  sleep 2
done

echo "⚠️ 健康检查 60s 超时，请排查日志：" >&2
echo "    docker compose logs --tail=100 api" >&2
exit 1
