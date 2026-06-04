# OISee 本地启动与闭环测试

第一波闭环范围已全部就绪：**CMS 创建内容 → 用户网站立即可见**。

---

## 仓库结构

```
ohsee/
├── code/                      # 所有代码
│   ├── apps/
│   │   ├── api/               # 后端 NestJS
│   │   ├── cms/               # CMS 管理后台
│   │   └── web/               # 用户端网站
│   └── packages/
│       ├── shared/            # 前后端共享类型与 schema
│       └── config/            # 共享 tsconfig
├── docs/                      # 文档
│   ├── prd/                   # 产品需求 PRD
│   ├── tech/                  # 技术设计文档
│   └── prototype/             # 设计原型（HTML）
├── infra/                     # 基础设施
│   ├── docker-compose.dev.yml
│   ├── docker/
│   └── scripts/
├── data/                      # 运行时数据
│   └── uploads/               # 本地文件上传（替代 OSS）
├── package.json               # workspace 根
├── pnpm-workspace.yaml
├── .env.example
├── LOCAL_SETUP.md             # 本文档
└── README.md                  # 项目总览
```

---

## 前置环境

| 工具 | 版本 |
| --- | --- |
| Node.js | ≥ 22 |
| pnpm | ≥ 9 |
| Docker Desktop | 最新 |

```bash
node -v && pnpm -v && docker --version
```

---

## 一次性初始化

```bash
cd /Users/bruce/Desktop/BRUCE/coding/ohsee

# 1. 装依赖（首次较慢，Prisma 会下载二进制；argon2 需编译）
pnpm install

# 2. 准备环境变量
cp .env.example .env

# 3. 启动 PostgreSQL + Redis
pnpm docker:dev

# 4. 生成 Prisma Client
pnpm db:generate

# 5. 创建数据库表
pnpm db:migrate -- --name init

# 6. 灌入超管 + 示例数据
pnpm db:seed
```

种子完成会看到：
```
✔ 超管账号：admin
✔ 场景：厨房 / 客厅
✔ 物品：微波炉 / 冰箱 / 电水壶
✔ 4 个知识点 + 物品-知识点关联 + 知识网络关系
```

---

## 启动三端

**推荐**：开三个终端窗口，分别启动：

```bash
# 终端 1：后端 API
pnpm dev:api
# → http://localhost:3000

# 终端 2：用户网站
pnpm dev:web
# → http://localhost:5173

# 终端 3：CMS 管理后台
pnpm dev:cms
# → http://localhost:5174/cms
```

也可以一行起所有：
```bash
pnpm dev
```

---

## 闭环测试 · 端到端走一遍

### Step 1：用户网站看现状

打开 `http://localhost:5173`

- ✅ 首页：黑底英雄区 + 四级拆解链路
- ✅ 点"开始探索" → 进入 `/scenes`
- ✅ 场景地图：看到「厨房」「客厅」两张卡片（来自 seed）
- ✅ 点厨房 → 看到「微波炉」「冰箱」「电水壶」三个物品
- ✅ 点微波炉 → 看到一物三看 + 关联的两个知识点
- ✅ 点知识点 → 看到详细内容 + 关联物品

### Step 2：CMS 创建新场景

打开 `http://localhost:5174/cms`

1. 用 `admin / admin123456` 登录
2. 左侧菜单 → 场景管理 → 点「新建场景」
3. 填写：
   - 名称：浴室
   - Slug：home-bath
   - 分组：家
   - 描述：水的世界
   - 主色调：ocean
4. 点击右上角「保存」
5. 返回场景管理列表 → 找到「浴室」，点「发布」

### Step 3：用户网站立即可见

切换到用户网站 `http://localhost:5173/scenes`，**刷新页面**

- ✅ 应该看到第三张卡片「浴室」出现
- ✅ 点进去：场景详情页打开，但"物品列表"为空

### Step 4：给浴室添加物品

回到 CMS

1. 左侧菜单 → 物品管理 → 新建物品
2. 填写：
   - 名称：花洒
   - Slug：shower-head
   - 所属场景：浴室
   - 一句话简介：把水流变成柔和的雨
   - 一物三看 L1：花洒里有很多小孔，水从小孔里出来就变细了
   - 一物三看 L2：水通过小孔后流速增加，压强降低（伯努利原理）
   - 一物三看 L3：流体力学中流量守恒决定每个孔的出水速度
3. 保存 → 列表点「发布」

### Step 5：再次验证

回到用户网站 `/scenes/home-bath`，**刷新**

- ✅ 应该看到「花洒」卡片
- ✅ 点击 → 看到一物三看的三段文字

### Step 6：知识点关联

CMS 中：

1. 知识点管理 → 新建知识点
2. 填写：
   - 名称：伯努利原理
   - Slug：bernoulli-test
   - 学科：物理
   - 难度：L2
   - 摘要：流速越快，压强越小
   - 内容：粘贴一段说明文字
   - 关联物品：勾选「花洒」
3. 保存 → 发布

回到用户网站 `/items/shower-head`，**刷新**

- ✅ 应该看到「伯努利原理」出现在"涉及的知识点"
- ✅ 点击 → 知识点详情页，"关联物品"显示「花洒」

🎉 **闭环验证完成**：CMS 写 → DB → API → 用户网站读。

---

## 已实现的功能矩阵

| 模块 | CMS | 用户端 |
| --- | --- | --- |
| 账号 | ✅ 超管登录 | — |
| 场景 | ✅ CRUD + 发布/归档 + 图片上传 | ✅ 列表 + 详情 |
| 物品 | ✅ CRUD + 一物三看 + 关联知识点 | ✅ 详情 + 一物三看 + 知识点卡片 |
| 知识点 | ✅ CRUD + 关联物品 + 学科/难度 | ✅ 卡片库 + 筛选 + 详情 |
| 媒体上传 | ✅ 本地文件存储 | ✅ 自动渲染图片 |
| 难度锁定 | — | ✅ 高于 L2 的知识点灰显（写死 L2，待用户体系） |

## 暂未实现（后续阶段）

- ❌ AIGC（需 API Key 配置）
- ❌ 实验模块
- ❌ 激励规则引擎（积分/勋章）
- ❌ C 端用户体系
- ❌ 2.5D 高级渲染（用拖拽布局编辑器）
- ❌ 知识网络 3D 图谱
- ❌ 完整 RBAC

---

## 项目脚本速查

| 命令 | 作用 |
| --- | --- |
| `pnpm docker:dev` | 启动 PG + Redis |
| `pnpm docker:dev:stop` | 停止依赖服务 |
| `pnpm docker:dev:logs` | 查看依赖服务日志 |
| `pnpm dev` | 并行启动三端 |
| `pnpm dev:api` | 仅后端 |
| `pnpm dev:cms` | 仅 CMS |
| `pnpm dev:web` | 仅用户端 |
| `pnpm db:generate` | 生成 Prisma Client |
| `pnpm db:migrate -- --name xxx` | 生成 + 应用迁移 |
| `pnpm db:seed` | 灌入种子数据 |
| `pnpm db:studio` | 数据库可视化 |
| `pnpm db:reset` | ⚠️ 重置数据库 |

---

## 端口与地址

| 服务 | 地址 |
| --- | --- |
| 后端 API | http://localhost:3000/api/v1 |
| 后端文件 | http://localhost:3000/uploads/... |
| 用户网站 | http://localhost:5173 |
| CMS | http://localhost:5174/cms |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Prisma Studio | http://localhost:5555（按需启动） |

## 默认账号

| 角色 | 用户名 | 密码 |
| --- | --- | --- |
| 超级管理员 | admin | admin123456 |

> 生产环境必须改 `.env.example` 里的所有密钥与 seed 密码。

---

## 常见问题

### Q: `pnpm install` 时 argon2 编译失败

argon2 依赖原生 node-gyp。在 Mac 上若失败：

```bash
xcode-select --install
# 重新 pnpm install
```

或直接换 bcryptjs（告诉我，我帮你切）。

### Q: `pnpm db:migrate` 报 `database does not exist`

确认 `pnpm docker:dev` 已成功启动 postgres 容器：
```bash
docker ps | grep oisee_pg_dev
docker logs oisee_pg_dev --tail 20
```

### Q: CMS 创建后用户网站没刷新

刷新一下浏览器（用户端用了 TanStack Query 缓存，没接 SSE，需要手动刷新）。生产环境会加自动失效。

### Q: 上传的图片在用户网站显示不出来

确认两件事：
1. 文件确实在 `data/uploads/` 目录里（可以打开看）
2. 后端启动了 `ServeStaticModule`（已在 app.module.ts 配好）

直接访问 `http://localhost:3000/uploads/xxx/xxx.png` 应该能下载。

### Q: 后端启动后找不到 .env

后端默认从 cwd（`code/apps/api`）找 `.env`。本仓库使用根目录的 `.env`，已在 `code/apps/api/src/main.ts` 中显式指定路径（通过 `envFilePath: '../../../.env'`）。如未生效，可在 `code/apps/api/` 下软链：
```bash
ln -sf ../../../.env code/apps/api/.env
```

---

## 下一步可做

1. **2.5D 物品布局编辑器**：让 CMS 在场景大图上拖拽放物品
2. **实验模块**：补完 schema + UI
3. **激励引擎 + C 端登录**
4. **AIGC 集成**：先建 AIProvider 配置页 + 文生图
5. **完善 RBAC + 角色管理**
