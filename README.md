# OISee

> 面向 6–16 岁青少年的科普平台：从生活中可触摸的物品出发，拆解科学原理、串联知识网络、引导动手实验。

---

## 仓库结构

```
oisee/
├── frontend-user/       # 用户前端（React + Vite，:5173）
├── frontend-admin/      # 管理前端 CMS（React + Vite + Antd，:5174）
├── backend/             # 后端服务（NestJS + Prisma + PostgreSQL，:3000）
├── mobile/              # 移动端（占位，未来 RN/Flutter）
├── mini-program/        # 小程序端（占位，未来微信/抖音）
├── shared/              # 共享库（pnpm workspace）
│   ├── lib/             #   @oisee/shared —— 跨端共用类型 / 错误码 / 工具
│   └── config/          #   @oisee/config —— 共享 tsconfig 预设
├── infra/               # 本地基础设施（docker-compose、Postgres、Redis）
├── scripts/             # 一次性脚本（图像生成、数据补齐等）
├── data/                # 本地数据
│   └── uploads/         #   生成的图片/视频（gitignored，走 CDN 上传）
├── docs/                # 文档
│   ├── prd/             #   产品需求
│   ├── tech/            #   技术设计
│   └── prototype/       #   参考稿 / 设计资源
├── pnpm-workspace.yaml
├── package.json
└── README.md
```

---

## 技术栈

| 模块 | 技术 |
| --- | --- |
| 前端（用户 + 管理） | React 18 · Vite · TypeScript · React Router · TanStack Query |
| 后端 | NestJS 10 · Prisma 5 · PostgreSQL 16 · Redis 7 · JWT |
| 共享 | TypeScript 5 · pnpm 9 workspaces |
| 基础设施 | Docker Compose（本地 PG/Redis） |
| AIGC | DashScope（Qwen Image / Wan2.7-image-pro）·  Volcengine Seedream |

---

## 快速开始

### 1. 准备

```bash
# 工具版本
node ≥ 22
pnpm ≥ 9
docker ≥ 24

# 克隆 + 安装
git clone <repo-url> oisee
cd oisee
pnpm install
```

### 2. 启基础服务

```bash
pnpm docker:dev          # 启动 Postgres + Redis
pnpm db:generate         # 生成 Prisma Client
pnpm db:migrate          # 应用本地迁移
pnpm db:seed             # 写入冷启动种子数据（可选）
```

### 3. 启应用

```bash
pnpm dev                 # 全开（user + admin + api）

# 或分开起
pnpm dev:web             # frontend-user :5173
pnpm dev:cms             # frontend-admin :5174
pnpm dev:api             # backend       :3000
```

### 4. 常用命令

```bash
pnpm typecheck           # 全仓 typecheck
pnpm build               # 全仓 build
pnpm db:studio           # Prisma Studio
pnpm db:reset            # 重置数据库（destructive）

pnpm docker:dev:logs     # Postgres/Redis 日志
pnpm docker:dev:stop     # 停服务
```

---

## 文档地图

| 路径 | 内容 |
| --- | --- |
| `docs/prd/00-PRD-总览.md` | 产品定位 / 用户群 / 模块导航 |
| `docs/prd/03–07` | 前台各模块详细需求（首页 / 场景探索 / 物品仓库 / 知识探索 / 实验 / 书包） |
| `docs/prd/08-内容管理后台CMS.md` | CMS 需求 |
| `docs/prd/10-数据字典.md` | 实体字段定义 |
| `docs/tech/00-技术设计-总览.md` | 技术选型与依赖矩阵 |
| `docs/tech/02-数据模型设计.md` | Prisma schema 总图 |
| `docs/tech/03-后端模块与API设计.md` | API 路由表 / 错误码 / 模块划分 |
| `docs/tech/06-AIGC集成方案.md` | 图像生成接入说明 |
| `docs/prototype/` | UI 参考稿 / 风格样图 |

更多历史 / 原始项目索引：见 `docs/README-原始项目索引.md`。

---

## 端口约定

| 服务 | 端口 |
| --- | --- |
| 用户前端 | `:5173` |
| 管理前端 | `:5174` |
| 后端 API | `:3000` |
| Postgres | `:5432` |
| Redis | `:6379` |
| Prisma Studio | `:5555` |

---

## 许可与隐私

- 本仓库私有，仅团队内部协作。
- `.env`、密钥、用户数据均不入 git。
- `data/uploads/` 的生成资源走 OSS/CDN，不入 git。

> 详见 `docs/prd/09-非功能性需求与合规.md`。
