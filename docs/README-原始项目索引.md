# OISee 项目索引

> 这份文档是 **新对话的入口**。读完它，你就掌握了项目全貌、关键决策、文档边界和下一步要做什么。
>
> 当前状态：**设计阶段完成，尚未开始编码**。

---

## 1. 项目一句话

OISee 是一个面向 **6-16 岁青少年** 的科普网站，核心路径：

> **场景 → 物品 → 知识点 → 实验** —— 四级拆解，由具象到抽象。

不是"先抛知识再要求记忆"的传统科普，而是从孩子熟悉的物品出发（如厨房里的微波炉），拆解科学原理，最终引导孩子完成动手实验。

**核心产品调性**：游戏化是"钩子"，动手实验是"目的"。所有激励最终都把孩子导向真实世界的动手实践。

---

## 2. 项目背景与开发模式

| 项 | 设定 |
| --- | --- |
| 开发者 | **个人独自完成**：设计 + 前后端 + 部署全流程 |
| 协作方式 | 主要由 AI 辅助开发（Claude） |
| 部署目标 | 阿里云个人 ECS 服务器 |
| 目标终端 | PC + 平板（响应式），不强求手机端 |
| MVP 范围 | 仅"家-厨房"1 个场景，但功能骨架完整 |
| 当前阶段 | 已完成完整 PRD + 完整技术设计 + UI 原型；尚未开始编码 |

---

## 3. 文档目录（关键！新对话从这里入手）

仓库严格按"需求 / 设计"分两个目录：

### 3.1 PRD 需求文档 — 回答「做什么」

📁 `docs/prd/` （共 11 份）

| 编号 | 文档 | 内容 |
| --- | --- | --- |
| 00 | [PRD-总览](docs/prd/00-PRD-总览.md) | 产品定位、用户、版本规划、模块总览 |
| 01 | [账号与权限](docs/prd/01-账号与权限.md) | 注册、登录、第三方、匿名访问 |
| 02 | [激励体系](docs/prd/02-激励体系.md) | 难度 / 积分 / 勋章 / 等级 |
| 03 | [前台-首页](docs/prd/03-前台功能-首页.md) | 首页结构 |
| 04 | [前台-场景探索](docs/prd/04-前台功能-场景探索.md) | 游戏化地图、场景、物品 |
| 05 | [前台-知识探索](docs/prd/05-前台功能-知识探索.md) | 知识点卡片库、知识网络 |
| 06 | [前台-动手实验](docs/prd/06-前台功能-动手实验.md) | 实验库、详情、材料 |
| 07 | [前台-我的书包](docs/prd/07-前台功能-我的书包.md) | 个人中心、探索度、勋章 |
| 08 | [内容管理后台 CMS](docs/prd/08-内容管理后台CMS.md) | **完整 CMS 需求 V2.0** |
| 09 | [非功能性需求与合规](docs/prd/09-非功能性需求与合规.md) | 响应式、性能、未成年人保护 |
| 10 | [数据字典](docs/prd/10-数据字典.md) | 业务字段定义 |

### 3.2 技术设计文档 — 回答「怎么做」

📁 `docs/tech/` （共 10 份）

| 编号 | 文档 | 内容 |
| --- | --- | --- |
| 00 | [总览](docs/tech/00-技术设计-总览.md) | 架构图、技术栈、关键决策摘要 |
| 01 | [项目结构与工程化](docs/tech/01-项目结构与工程化.md) | Monorepo、Docker、开发环境 |
| 02 | [数据模型设计](docs/tech/02-数据模型设计.md) | 完整 Prisma Schema、ER 关系、索引 |
| 03 | [后端模块与 API](docs/tech/03-后端模块与API设计.md) | NestJS 模块、API 列表、认证 |
| 04 | [前端架构设计](docs/tech/04-前端架构设计.md) | 路由、状态、2.5D、知识网络 |
| 05 | [激励规则引擎](docs/tech/05-激励规则引擎.md) | 积分/勋章/解锁统一处理 |
| 06 | [AIGC 集成方案](docs/tech/06-AIGC集成方案.md) | 多 Provider 抽象、Driver、队列 |
| 07 | [部署与运维方案](docs/tech/07-部署与运维方案.md) | Docker Compose、Nginx、ECS |
| 08 | [原型分析与技术调整](docs/tech/08-原型分析与技术调整.md) | 对照 `docs/prototype/` 原型的差异修订 |
| 09 | [CMS 技术设计](docs/tech/09-CMS技术设计.md) | RBAC、AI Provider、AIGC、监控 |

### 3.3 UI 原型

📁 `docs/prototype/` — 一份**完整可运行的 React 原型**（Babel Standalone + 自绘 SVG），是设计的事实基线。覆盖 9 个页面：

- 首页、场景地图、厨房 2.5D 场景
- 物品详情（含真实爆炸图）
- 知识库（卡片 + **自研 3D 物理仿真知识网络**）、知识点详情
- 实验库、实验详情（含完成 Confetti）
- 我的书包（含知识星图）

打开 `docs/prototype/OISee 原型.html` 可直接预览。

### 3.4 PRD ↔ TD 对照

| PRD | 对应 TD |
| --- | --- |
| 01 账号与权限 | 03 后端 API（auth 模块） |
| 02 激励体系 | 05 激励规则引擎 |
| 03-07 前台功能 | 04 前端架构 + 08 原型分析 |
| 08 内容管理 CMS | 09 CMS 技术设计 + 06 AIGC |
| 09 非功能性需求 | 07 部署 + 各模块安全节 |
| 10 数据字典 | 02 数据模型设计 |

---

## 4. 关键决策基线（已确认，避免重复讨论）

下列决策已在过往讨论中明确，新对话**不需要重新征询**用户意见。如确实要变更，需明确告知用户。

### 4.1 技术栈

| 层 | 选型 | 理由 |
| --- | --- | --- |
| 仓库形态 | pnpm Monorepo，分层 `code/apps/{api,cms,web}` + `code/packages/{shared,config}` | 单人开发 + 类型共享 |
| 前端框架 | React 19 + Vite + TypeScript | |
| 状态 | Zustand + TanStack Query | |
| 路由 | React Router v7 | |
| 用户端样式 | **CSS Modules + CSS Variables，无 UI 库** | 沿用原型设计系统 |
| 用户端 2.5D | **SVG 模板 + CMS 位图双模式** SceneRenderer | 开发期与生产期统一 |
| 知识网络 | **自研 3D 物理仿真**（迁移自原型） | React Flow 表现力不够 |
| CMS UI | Ant Design + AntD Pro 组件 | 后台工具风 |
| 富文本（CMS） | TipTap | |
| 后端框架 | NestJS 11 | 结构化、AI 生成代码一致性好 |
| 数据库 | PostgreSQL 16 + **pgvector** 扩展 | 关系型 + embedding 检索 |
| ORM | Prisma 5 | |
| 缓存/队列 | Redis 7 + BullMQ | |
| 认证 | Passport + JWT（用户端 / CMS 双独立 secret） | |
| 文件存储 | 阿里云 OSS + 视频点播 VOD | 不经 ECS 中转 |
| 视频播放 | xgplayer | 阿里云 VOD 适配最佳 |
| 容器化 | Docker Compose 单机编排 | |

### 4.2 设计风格（用户端）

**编辑刊物 + 蓝图科技感**——不是儿童化彩色卡通，而是面向 6-16 岁的"克制专业风"。

- 颜色：纸感米白 `#F8F6F1` / 深靛蓝 `#0E1A33` / 琥珀 `#D89531`（唯一强调色）
- 字体：Noto Sans SC（正文）+ Noto Serif SC（标题衬线）+ Space Grotesk（mono 标签）
- 装饰：蓝图网格 + DWG 角标 + `font-mono` 标签
- 学科色：物理蓝 / 化学红 / 生物绿 / 地理紫
- 难度色：L1 绿 / L2 琥珀 / L3 紫（与学科色 token 分离）

### 4.3 AIGC 多 Provider 架构

**绝对不能硬编码任何单一服务商**。

- 三模态独立：LLM / IMAGE / VIDEO
- LLM 与文生图统一走 **OpenAI 兼容接口**（`/v1/chat/completions`、`/v1/images/generations`）
- 文生视频用**策略模式适配器**（业界 API 未统一）：MVP 实现 `dashscope-wanx`，预留 `openai-compatible`、`volcengine-jimeng`、`kling`
- 同一模态同时只一个 provider 激活；切换前**强制连通性测试通过**
- 任务创建时绑定 `providerId`，切换不影响在途任务
- API Key 走 **AES-256-GCM 加密**，主密钥放 `.env`
- 系统 seed 主流服务商空配置（通义、DeepSeek、Moonshot、智谱、OpenAI、Ollama 等），管理员只需填 key

### 4.4 CMS 关键决策

- 独立部署到 `/cms` 路径（或子域 `cms.oisee.com`）
- **无公开注册**：seed 一个超管，其他账号由超管添加
- **MVP 仅一个超管角色**，但 RBAC 表结构完整（Role / Permission / RolePermission / AdminRole）
- 权限到**按钮级**：菜单权限 + 操作权限两层
- 忘记密码：**超管直接重置**，不走邮箱验证
- AI 联想（场景→物品、物品→知识点）：**混合模式**——先 embedding 检索已有内容，不足时调 LLM 生成新候选
- 知识点测试题：**CMS 现在做，前台二期上线**（数据建库零浪费）
- C 端用户管理：仅"查看 + 禁用/启用"，**不**允许后台改积分/勋章
- 物品布局编辑器：**在场景编辑页内**，所见即所得拖拽 + 缩放，react-rnd 实现

### 4.5 匿名用户

- 匿名只能体验默认场景（家-厨房）
- 浏览状态仅存 `localStorage`，**不上报、不积分、不发勋章**
- 注册后 `localStorage` 直接丢弃，**不做数据迁移**
- 用文案承担转化引导，不做服务端复杂合并

### 4.6 激励规则引擎

- 所有积分/勋章/解锁变更必须经过 `RewardService.evaluate()`，**禁止散落在各模块直接 update**
- 每笔积分变动有 `idempotencyKey` 保证幂等
- 事务原子：积分流水 + User 累计 + 勋章 + 解锁记录必须同事务
- `User.totalPoints` 是缓存值，写积分时事务内同步更新
- 数值（积分值、解锁阈值等）**全部标记为"待数值平衡"**，等内容量确定后调整

### 4.7 数据模型关键约定

- 所有内容实体（Scene/Item/KP/Experiment）有 `slug`（URL 友好）+ `status`（DRAFT/PUBLISHED/ARCHIVED）+ `deletedAt`（软删）
- 多对多关系**全部用显式关联表**（不用 Prisma 隐式）
- `Item.principleByLevel` JSON 存"一物三看"三层原理摘要
- `Item.parts` JSON 存爆炸图零件清单 `[{no,name,desc,x,y}]`
- `Scene.scenePosition` / `Item.scenePosition` 用**百分比坐标**（0-100），与场景图分辨率解耦
- 用户端与管理端 JWT **完全隔离**（不同 secret、不同 issuer）

---

## 5. 部署架构速览

```
[用户/管理员] → HTTPS → Nginx
                          │
              ┌───────────┼──────────────┐
              ▼           ▼              ▼
              /          /cms          /api/v1
           code/apps/   code/apps/    NestJS :3000
            web (静态)   cms (静态)        │
                                          │
                          ┌───────────────┼───────────────┐
                          ▼               ▼               ▼
                     PostgreSQL          Redis        阿里云 OSS
                  (含 pgvector)        (队列+缓存)    (媒体文件)
                                          │
                                          ▼
                            通义万相 / DeepSeek / ... (用户配置)
```

阿里云 ECS 2核4G + 50G SSD 起步。所有组件用 Docker Compose 单机编排。

---

## 6. 项目结构

详见 [01-项目结构与工程化](docs/tech/01-项目结构与工程化.md) 与根目录 [LOCAL_SETUP.md](LOCAL_SETUP.md)。

```
ohsee/
├── code/                      # ★ 所有代码
│   ├── apps/
│   │   ├── api/               # 后端 (NestJS)
│   │   │   ├── src/
│   │   │   └── prisma/
│   │   ├── cms/               # CMS 管理后台 (React + Vite + AntD)
│   │   └── web/               # 用户端 (React + Vite + CSS Modules)
│   └── packages/
│       ├── shared/            # 共享类型 / Zod schema / 常量
│       └── config/            # 共享 tsconfig
├── docs/                      # ★ 所有文档
│   ├── prd/                   # 产品需求 PRD
│   ├── tech/                  # 技术设计 TD
│   └── prototype/             # 设计原型（HTML 单页）
├── infra/                     # ★ 基础设施
│   ├── docker-compose.dev.yml
│   ├── docker/
│   └── scripts/
├── data/                      # ★ 运行时数据（不入 git）
│   └── uploads/               # 本地文件上传（替代 OSS）
├── package.json               # workspace 根（脚本集中）
├── pnpm-workspace.yaml        # 指向 code/apps/* + code/packages/*
├── .env.example
├── README.md                  # 项目索引（本文档）
└── LOCAL_SETUP.md             # 本地启动与闭环测试
```

> 单包命名：`@oisee/api`、`@oisee/cms`、`@oisee/web`、`@oisee/shared`、`@oisee/config`。
> 注意 CMS 管理后台前端的目录与包名都用 **`cms`**；只有后端 API 的"管理员模块"命名空间仍叫 `admin`（对应"管理员角色"的接口）。

---

## 7. 工作约定（重要）

### 7.1 文档拆分原则

- **PRD（`docs/prd/`）**：业务需求、功能清单、UI 示意、字段定义（业务视角）、验收标准 → "做什么"
- **TD（`docs/tech/`）**：数据模型、API、加密、Driver、技术选型、安全要点 → "怎么做"
- 任何内容增改先确定归属于哪边，避免混在一份文档里

### 7.2 优先级与节奏

- MVP 严格按 PRD §6 范围切片，**禁止二期功能渗透**
- 所有"数值"（积分、勋章阈值、等级门槛等）目前都是初始建议值，标记为"待数值平衡"，等内容量确定后调整
- 所有"待确认事项"在各文档末尾以 `H-1` / `T-1` / `CMS-1` 等编号列出，决策时统一回填

### 7.3 不要做的事

- ❌ 不要给用户端引入 Ant Design / Material UI（破坏设计系统）
- ❌ 不要给 AIGC 硬编码任何单一服务商（必须走 AIProvider 抽象）
- ❌ 不要在用户端写 RBAC 守护（用户端无权限概念，权限只在 CMS）
- ❌ 不要在前台 MVP 添加测试题入口（PRD 明确测验是二期）
- ❌ 不要在 CMS 允许修改 C 端用户积分/勋章（避免后台越权发奖）
- ❌ 不要把 API Key 明文存数据库
- ❌ 不要使用 Google Fonts CDN（国内访问慢），自托管字体

---

## 8. 当前进度与下一步

### 8.1 已完成

- ✅ PRD V1.0（11 份文档）
- ✅ UI 原型（React 单页可运行版）
- ✅ 技术设计文档（10 份）
- ✅ CMS 详细需求 V2.0（含 AI 联想、多 Provider、RBAC）
- ✅ 原型与技术路线对齐分析（08）

### 8.2 未开始

- ⏳ 代码实现（Monorepo 脚手架、Prisma 落库、API、前端、CMS）
- ⏳ 部署上线
- ⏳ 内容生产（"家-厨房" 场景的完整内容）

### 8.3 推荐的下一步选项

| 方向 | 内容 | 推荐度 |
| --- | --- | --- |
| **A. 起项目脚手架** | Monorepo 初始化 + Docker 环境 + Prisma 落库 | ⭐⭐⭐⭐⭐ 最稳妥起步 |
| B. 合并数据库 Schema | 把分散在 02 + 09 的 schema 变更整合为可执行的 `schema.prisma` | ⭐⭐⭐⭐ 编码前的必经一步 |
| C. 补全后端 API 文档 | 把 CMS 新增 API 补到 03 文档 | ⭐⭐⭐ |
| D. 设计 CMS 核心交互界面 | 物品布局编辑器、AI 联想弹窗、AI Provider 页 | ⭐⭐ 可以等编码时再做 |

**推荐顺序：B → A → 边写边补 C**

---

## 9. 给新对话 / 新人的入门路径

读完本 README 后，按以下顺序快速建立完整上下文（约 30-40 分钟）：

1. [docs/prd/00-PRD-总览.md](docs/prd/00-PRD-总览.md) — 产品定位（5 分钟）
2. [docs/prd/02-激励体系.md](docs/prd/02-激励体系.md) — 核心机制（5 分钟）
3. [docs/tech/00-技术设计-总览.md](docs/tech/00-技术设计-总览.md) — 架构全貌（10 分钟）
4. [docs/tech/08-原型分析与技术调整.md](docs/tech/08-原型分析与技术调整.md) — 设计风格与关键调整（10 分钟）
5. 打开 `docs/prototype/OISee 原型.html` 在浏览器里点一遍（10 分钟）
6. 按需细读对应模块的 PRD + TD

读完上述就足够开始任何讨论或编码。

---

## 10. 元信息

| 项 | 内容 |
| --- | --- |
| 文档版本 | V1.0 |
| 最后更新 | 2026-05-27 |
| 仓库语言 | 文档全部中文；代码注释/标识符全部英文 |
| 字符编码 | UTF-8 |
| 行结束符 | LF |
