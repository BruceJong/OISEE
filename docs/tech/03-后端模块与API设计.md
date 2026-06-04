# OISee 技术设计文档 · 03 后端模块与 API 设计

> 所属模块：后端
> 最后更新：2026-05-27
> 关联文档：[00-总览](./00-技术设计-总览.md)、[02-数据模型](./02-数据模型设计.md)

---

## 1. 概述

后端基于 NestJS 11，采用模块化结构。所有 HTTP 接口前缀 `/api/v1`。本文档定义：
- 模块划分与职责
- API 列表与契约
- 认证与权限模型
- 错误规范与异常处理
- 中间件与拦截器
- 异步任务架构

---

## 2. 目录结构

`code/apps/api/src/`:

```
src/
├── main.ts                    # 启动入口
├── app.module.ts              # 根模块
│
├── common/                    # 跨模块基础设施
│   ├── filters/
│   │   └── http-exception.filter.ts
│   ├── interceptors/
│   │   ├── logging.interceptor.ts
│   │   └── transform.interceptor.ts   # 响应包装
│   ├── guards/
│   │   ├── jwt-user.guard.ts
│   │   ├── jwt-admin.guard.ts
│   │   └── roles.guard.ts
│   ├── decorators/
│   │   ├── current-user.decorator.ts
│   │   ├── public.decorator.ts
│   │   └── roles.decorator.ts
│   ├── pipes/
│   │   └── zod-validation.pipe.ts
│   └── utils/
│
├── config/                    # 配置加载与校验
│   ├── config.module.ts
│   └── config.schema.ts
│
├── prisma/                    # Prisma 服务封装
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── modules/
│   ├── auth/                  # 注册 / 登录 / JWT
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts        # 用户注册登录
│   │   ├── admin-auth.controller.ts  # 管理员登录
│   │   ├── auth.service.ts
│   │   ├── sms.service.ts
│   │   ├── oauth/
│   │   │   ├── wechat.service.ts
│   │   │   └── qq.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt-user.strategy.ts
│   │   │   └── jwt-admin.strategy.ts
│   │   └── dto/
│   ├── users/                 # 用户个人中心
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   └── users.service.ts
│   ├── content/               # 前台内容只读
│   │   ├── content.module.ts
│   │   ├── scenes.controller.ts
│   │   ├── items.controller.ts
│   │   ├── knowledge.controller.ts
│   │   ├── experiments.controller.ts
│   │   └── content.service.ts
│   ├── progress/              # 进度上报
│   │   ├── progress.module.ts
│   │   ├── progress.controller.ts
│   │   └── progress.service.ts
│   ├── reward/                # 规则引擎（内部服务，无 controller）
│   │   ├── reward.module.ts
│   │   ├── reward.service.ts
│   │   ├── rules/
│   │   │   ├── points.rules.ts
│   │   │   ├── badges.rules.ts
│   │   │   ├── unlock.rules.ts
│   │   │   └── level.rules.ts
│   │   └── events/
│   ├── media/                 # OSS 上传签名
│   │   ├── media.module.ts
│   │   ├── media.controller.ts
│   │   └── oss.service.ts
│   ├── aigc/                  # AIGC 任务
│   │   ├── aigc.module.ts
│   │   ├── aigc.controller.ts        # CMS 触发与查询
│   │   ├── aigc.service.ts
│   │   ├── workers/
│   │   │   ├── aigc-image.worker.ts
│   │   │   └── aigc-video.worker.ts
│   │   └── providers/
│   │       └── dashscope.service.ts
│   ├── admin/                 # CMS 写接口
│   │   ├── admin.module.ts
│   │   ├── controllers/
│   │   │   ├── admin-scenes.controller.ts
│   │   │   ├── admin-items.controller.ts
│   │   │   ├── admin-knowledge.controller.ts
│   │   │   ├── admin-experiments.controller.ts
│   │   │   ├── admin-badges.controller.ts
│   │   │   ├── admin-users.controller.ts
│   │   │   ├── admin-admins.controller.ts
│   │   │   └── admin-prompts.controller.ts
│   │   └── services/
│   │       └── ...
│   └── health/                # 健康检查
│       └── health.controller.ts
│
└── queues/                    # BullMQ 队列定义
    ├── queues.module.ts
    └── queue-names.ts
```

---

## 3. 模块清单与职责

| 模块 | 路径前缀 | 职责 | 鉴权 |
| --- | --- | --- | --- |
| `auth` | `/api/v1/auth/*` | 用户注册、登录、刷新、登出、短信、第三方 | 部分公开 |
| `auth (admin)` | `/api/v1/admin-auth/*` | 管理员登录 | 公开 |
| `users` | `/api/v1/users/*` | 个人信息、我的书包聚合 | UserJwt |
| `content` | `/api/v1/scenes/*` `/items/*` `/knowledge/*` `/experiments/*` | 前台只读内容 | 可选 UserJwt（影响锁定状态） |
| `progress` | `/api/v1/progress/*` | 学习/探索/实验完成上报 | UserJwt |
| `media` | `/api/v1/media/*` | OSS 直传签名 | 视场景：CMS 用 AdminJwt；用户上传（如二期实验照片）用 UserJwt |
| `aigc` | `/api/v1/admin/aigc/*` | AIGC 任务创建/查询/回调 | AdminJwt + Webhook 签名 |
| `admin` | `/api/v1/admin/*` | 所有内容管理写接口 | AdminJwt |
| `health` | `/api/v1/health` | 健康检查 | 公开 |

---

## 4. 认证与权限模型

### 4.1 三套鉴权域

1. **公开**：首页、注册前的页面
2. **UserJwt**：终端用户（孩子），通过 `Authorization: Bearer <token>` 携带
3. **AdminJwt**：管理员，独立签名密钥与有效期

> **重要**：用户与管理员的 JWT 完全隔离——不同的 secret、不同的 issuer、不同的 guard。即使代码出错，用户也无法越权到管理端。

### 4.2 JWT 设计

| 字段 | 用户 token | 管理员 token |
| --- | --- | --- |
| iss | `oisee-user` | `oisee-admin` |
| sub | userId | adminId |
| typ | `access` / `refresh` | `access` / `refresh` |
| jti | 随机 UUID（refresh 才入库） | 同上 |
| exp | access 15min / refresh 30d | access 8h / refresh 7d |
| 自定义 | `ageBand`, `difficulty` | `role` |

- Access Token：仅在内存中流转，不入库
- Refresh Token：`jti` 存 `RefreshToken` 表 + Redis 黑名单（吊销时写入）

### 4.3 守卫装饰器

```ts
// 默认全局加 JwtUserGuard，公开接口用 @Public()
@Public()
@Get('/api/v1/scenes')
listScenes() { ... }

// 管理员接口用独立 Guard
@UseGuards(JwtAdminGuard, RolesGuard)
@Roles('superadmin', 'editor')
@Post('/api/v1/admin/scenes')
createScene() { ... }

// 取当前用户
@Get('/api/v1/users/me')
getMe(@CurrentUser() user: AuthUser) { ... }
```

### 4.4 公开但识别身份（弱鉴权）

前台内容接口需要识别用户（计算锁定态），但匿名用户也能访问。采用 **OptionalJwtUserGuard**：
- 有 token 且合法：注入 `user`
- 无 token 或非法：`user = null`，继续放行

---

## 5. API 设计规范

### 5.1 统一响应格式

成功响应：
```json
{
  "code": 0,
  "data": { ... },
  "message": "ok"
}
```

错误响应：
```json
{
  "code": 40001,
  "data": null,
  "message": "短信验证码错误",
  "details": { "field": "smsCode" }
}
```

> 实现：`TransformInterceptor` 包装 success，`HttpExceptionFilter` 包装 error。

### 5.2 错误码体系

| 区段 | 含义 |
| --- | --- |
| `0` | 成功 |
| `10000-19999` | 通用错误（参数、限流、未授权） |
| `20000-29999` | 业务错误（积分/勋章/解锁） |
| `30000-39999` | 内容业务错误（场景未开放、知识点锁定） |
| `40000-49999` | 认证业务错误（验证码、第三方） |
| `50000-59999` | AIGC 业务错误 |
| `90000-99999` | 服务端错误（数据库、外部依赖） |

错误码全部定义在 `@oisee/shared/constants/error-codes.ts`，前后端共用。

### 5.3 分页规范

列表接口统一使用 cursor 分页（性能好、稳定）：

```
GET /api/v1/knowledge?subject=PHYSICS&difficulty=L1&cursor=xxx&limit=20

Response:
{
  "data": {
    "items": [ ... ],
    "nextCursor": "abc",
    "hasMore": true
  }
}
```

仅 CMS 后台列表用 offset 分页（要显示页码）：`?page=1&pageSize=20`。

### 5.4 命名约定

- 资源名复数：`/scenes`、`/items`、`/knowledge`、`/experiments`
- 动作型用 verb：`/auth/login`、`/auth/refresh`、`/progress/learn-knowledge`
- 查询参数 camelCase
- 路径参数用业务标识：`/scenes/:slug` 而非 ID（前台）；CMS 内部用 ID

---

## 6. 核心 API 清单

### 6.1 Auth 模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/auth/sms/send` | 发送短信验证码（参数：phone, purpose） |
| POST | `/api/v1/auth/register/phone` | 手机号注册 |
| POST | `/api/v1/auth/login/phone` | 手机号 + 验证码登录 |
| GET | `/api/v1/auth/oauth/wechat/url` | 获取微信扫码 URL |
| POST | `/api/v1/auth/oauth/wechat/callback` | 微信回调 |
| POST | `/api/v1/auth/oauth/complete-profile` | 第三方首次登录补全用户名+年龄段 |
| POST | `/api/v1/auth/refresh` | 刷新 token |
| POST | `/api/v1/auth/logout` | 注销当前会话 |
| POST | `/api/v1/admin-auth/login` | 管理员登录（用户名+密码） |
| POST | `/api/v1/admin-auth/refresh` | 管理员刷新 |

### 6.2 Users 模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/users/me` | 当前用户基础信息 |
| PATCH | `/api/v1/users/me` | 修改用户名/头像 |
| GET | `/api/v1/users/me/backpack` | 我的书包聚合数据 |
| GET | `/api/v1/users/me/points-history` | 积分流水（分页） |
| GET | `/api/v1/users/me/badges` | 已获得勋章列表 |
| GET | `/api/v1/users/me/all-badges` | 全部勋章（含未获得） |

### 6.3 Content 模块（前台只读）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/v1/scenes` | 场景地图列表（含 L2 子场景的轻量 items，供前端计算探索度） |
| GET | `/api/v1/scenes/:slug` | 场景详情（含物品布局） |
| GET | `/api/v1/items` | **物品仓库列表**（含所属 scene + KP 轻量数据，用于卡片库） |
| GET | `/api/v1/items/:slug` | 物品详情（含 3 个 Tab 数据） |
| GET | `/api/v1/knowledge` | 知识点卡片库（筛选+分页） |
| GET | `/api/v1/knowledge/network` | 知识网络图数据 |
| GET | `/api/v1/knowledge/:slug` | 知识点详情 |
| GET | `/api/v1/experiments` | 实验卡片库 |
| GET | `/api/v1/experiments/:slug` | 实验详情 |
| GET | `/api/v1/search?q=xxx` | 全局搜索（知识点 + 物品 + 实验） |

### 6.4 Progress 模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/progress/explore-item` | 探索物品（body: itemId） |
| POST | `/api/v1/progress/learn-knowledge` | 学习知识点 |
| POST | `/api/v1/progress/complete-experiment` | 完成实验 |
| POST | `/api/v1/progress/daily-checkin` | 每日签到 |

> 所有上报接口幂等：服务端用 `idempotencyKey` 防止重复计分。

### 6.5 Media 模块

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/media/oss/sign-upload` | 生成 OSS 直传签名（参数：fileName, fileType, purpose） |
| POST | `/api/v1/media/oss/notify` | OSS 上传完成回调（写入 DB） |

### 6.6 AIGC 模块（CMS）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/v1/admin/aigc/tasks` | 创建 AIGC 任务 |
| GET | `/api/v1/admin/aigc/tasks` | 任务列表（含状态筛选） |
| GET | `/api/v1/admin/aigc/tasks/:id` | 任务详情 |
| POST | `/api/v1/admin/aigc/tasks/:id/cancel` | 取消 |
| POST | `/api/v1/admin/aigc/tasks/:id/retry` | 重试 |
| POST | `/api/v1/admin/aigc/dashscope/webhook` | DashScope 回调（签名校验） |
| GET | `/api/v1/admin/aigc/prompts` | 预置 Prompt 模板列表 |
| PUT | `/api/v1/admin/aigc/prompts/:type` | 更新某类型 prompt |

### 6.7 Admin 模块（CMS 写接口）

CMS 全部采用 RESTful 风格，所有资源支持 `list / get / create / update / delete / publish / archive`。

| 资源 | 路径 |
| --- | --- |
| 场景 | `/api/v1/admin/scenes/*` |
| 物品 | `/api/v1/admin/items/*` |
| 知识点 | `/api/v1/admin/knowledge-points/*` |
| 知识网络关系 | `/api/v1/admin/knowledge-relations/*` |
| 实验 | `/api/v1/admin/experiments/*` |
| 关联关系 | `/api/v1/admin/relations/*`（物品-知识点、实验-知识点等） |
| 勋章 | `/api/v1/admin/badges/*` |
| 用户 | `/api/v1/admin/users/*`（只读 + 禁用） |
| 管理员账号 | `/api/v1/admin/admins/*` |

每个资源典型路径：

```
GET    /admin/scenes              列表（支持 status/keyword 筛选）
POST   /admin/scenes              新建
GET    /admin/scenes/:id          详情
PATCH  /admin/scenes/:id          编辑
DELETE /admin/scenes/:id          软删
POST   /admin/scenes/:id/publish  发布
POST   /admin/scenes/:id/archive  归档
```

---

## 7. 关键接口契约示例

### 7.1 `POST /api/v1/auth/register/phone`

请求：
```json
{
  "username": "小明",
  "ageBand": "10-13",
  "phone": "13800138000",
  "smsCode": "123456"
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "accessToken": "xxx",
    "refreshToken": "yyy",
    "user": {
      "id": "user_abc",
      "username": "小明",
      "ageBand": "10-13",
      "difficulty": "L2",
      "totalPoints": 0,
      "level": 1
    }
  }
}
```

### 7.2 `GET /api/v1/items/:slug`（关键复合接口）

响应：
```json
{
  "code": 0,
  "data": {
    "id": "item_xxx",
    "slug": "microwave-oven",
    "name": "微波炉",
    "scene": { "slug": "home-kitchen", "name": "家-厨房" },
    "principleVideoUrl": "https://cdn.../...mp4",
    "explodedImageUrl": "https://cdn.../exploded.png",
    "explodedAnnotations": [
      { "x": 120, "y": 80, "label": "磁控管" }
    ],
    "knowledgePoints": [
      {
        "id": "kp_001", "slug": "em-wave-heating",
        "name": "电磁波加热水分子",
        "subject": "PHYSICS",
        "difficulty": "L1",
        "summary": "微波炉用看不见的波让食物里的水动起来",
        "locked": false
      },
      {
        "id": "kp_002", "slug": "molecular-friction",
        "name": "分子摩擦生热",
        "subject": "PHYSICS",
        "difficulty": "L2",
        "summary": "...",
        "locked": true,
        "unlockHint": "再获得 2 枚勋章即可解锁"
      }
    ],
    "experiments": [
      { "id": "exp_001", "slug": "boil-water", "name": "微波加热水实验", "difficulty": "L1", "coverUrl": "..." }
    ]
  }
}
```

### 7.3 `POST /api/v1/progress/learn-knowledge`

请求：
```json
{ "knowledgePointId": "kp_001" }
```

响应：
```json
{
  "code": 0,
  "data": {
    "pointsEarned": 10,
    "totalPoints": 280,
    "levelUp": false,
    "newBadges": [
      { "id": "badge_physics_starter", "name": "物理启蒙者", "iconUrl": "..." }
    ],
    "newUnlocks": []
  }
}
```

### 7.4 `POST /api/v1/media/oss/sign-upload`

请求：
```json
{
  "fileName": "kitchen-scene.png",
  "fileType": "image/png",
  "purpose": "scene-image"
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "uploadUrl": "https://oisee-prod.oss-cn-hangzhou.aliyuncs.com/...",
    "objectKey": "scene-image/2026/05/xxx.png",
    "publicUrl": "https://cdn.oisee.com/scene-image/2026/05/xxx.png",
    "headers": { "x-oss-...": "..." },
    "expiresIn": 600
  }
}
```

前端 PUT 文件到 `uploadUrl`，完成后调 `/media/oss/notify` 记录到数据库。

### 7.5 `POST /api/v1/admin/aigc/tasks`

请求：
```json
{
  "type": "ITEM_PRINCIPLE_VIDEO",
  "itemId": "item_xxx",
  "userInput": "微波炉，重点讲电磁波加热水分子的原理"
}
```

响应：
```json
{
  "code": 0,
  "data": {
    "taskId": "task_abc",
    "status": "PENDING",
    "estimatedSeconds": 300
  }
}
```

---

## 8. 校验与 DTO

### 8.1 Zod + nestjs-zod

```ts
import { createZodDto } from 'nestjs-zod';
import { PhoneRegisterSchema } from '@oisee/shared';

export class PhoneRegisterDto extends createZodDto(PhoneRegisterSchema) {}

@Post('register/phone')
register(@Body() dto: PhoneRegisterDto) { ... }
```

- DTO 自动校验
- Swagger 文档自动生成
- 与前端共用 `@oisee/shared` 的 schema

### 8.2 类型安全的 Controller 返回

借助 `nestjs-zod` 的 `ZodSerializerDto`：返回值在序列化时也按 schema 过滤多余字段。

---

## 9. 异常处理

### 9.1 业务异常类

```ts
export class BusinessException extends HttpException {
  constructor(code: number, message: string, details?: unknown) {
    super({ code, message, details }, HttpStatus.OK);
    // 注意：业务异常 HTTP 状态码统一返回 200，依赖 code 判断
  }
}
```

> **设计取舍**：业务错误用 HTTP 200 + 错误码（兼容性最好），系统错误（5xx）才走非 2xx。

### 9.2 全局过滤器

`HttpExceptionFilter`：
- 拦截所有异常
- 业务异常 → 200 + `{ code, message, details }`
- Prisma 已知错误（如唯一键冲突）→ 转换为业务错误码
- 未知异常 → 500 + 错误码 99999 + 隐藏内部信息 + 记日志

---

## 10. 限流与防刷

### 10.1 全局限流（`@nestjs/throttler`）

- 默认每 IP 每分钟 60 请求
- 短信发送：每手机号每分钟 1 次 + 每天 10 次
- 注册：每 IP 每小时 5 次

### 10.2 防积分作弊

- 每个积分行为都有 `idempotencyKey`
- 重复上报同一个知识点学习不会重复计分
- "我做完了"实验：MVP 限制同一用户同一实验只能加分 1 次（PRD F-3）

---

## 11. 日志与监控

### 11.1 日志策略

- 使用 Pino（结构化 JSON 输出到 stdout）
- 由 Docker 收集到宿主机文件
- 字段约定：`level, time, msg, traceId, userId, adminId, durationMs`
- 不打印密码、token、验证码

### 11.2 链路 ID

每个请求生成 `traceId`（中间件注入），写入响应头 `X-Trace-Id`，便于排查。

### 11.3 关键监控指标（MVP 基础版）

- 接口 QPS / 错误率（pino 日志聚合）
- AIGC 任务积压数（BullMQ 自带）
- 数据库慢查询（Prisma `log: ['query', 'warn', 'error']`）

---

## 12. 异步任务架构

### 12.1 BullMQ 队列

| 队列名 | 类型 | 触发 |
| --- | --- | --- |
| `aigc-image` | AIGC 图片生成 | CMS 创建任务 |
| `aigc-video` | AIGC 视频生成 | CMS 创建任务 |
| `notification` | 升级/勋章通知 | 规则引擎触发（MVP 仅站内提示，可缓存到 user 字段） |
| `cleanup` | 清理过期 SMS / 黑名单 | Cron 触发 |

### 12.2 Worker 部署

MVP 阶段 worker 与 API 进程同进程（NestJS 启动时注册 Processor）。规模上来后拆独立 worker container。

### 12.3 任务可观测性

CMS 的 AIGC 工作台展示队列状态（PENDING/RUNNING/SUCCEEDED/FAILED 计数 + 任务列表）。

---

## 13. CORS 与安全

| 项 | 配置 |
| --- | --- |
| CORS | 允许 `OISEE_WEB_ORIGIN`、`OISEE_ADMIN_ORIGIN`；带 credentials |
| Helmet | 启用默认安全头 |
| 请求体限制 | JSON 1MB；文件上传不走后端 |
| HTTPS | 强制（Nginx 层） |
| Cookie | 仅在 OAuth 流程短暂使用，标记 `HttpOnly + Secure + SameSite=Lax` |
| 密码哈希 | 管理员密码用 argon2id |

---

## 14. Swagger 文档

启动后 `/api/v1/docs` 可访问（仅 `OISEE_NODE_ENV !== 'production'`）。
- 用户端 API、管理端 API 分两个 Swagger 文档
- 鉴权按钮可注入 JWT 调试

---

## 15. 测试策略（MVP 实用版）

| 类型 | 范围 | 工具 |
| --- | --- | --- |
| 单元测试 | 规则引擎（积分/勋章/解锁的核心逻辑） | Jest |
| 集成测试 | Auth 流程、Progress 上报 → 积分到账 | Jest + supertest + 测试数据库 |
| E2E | 暂不强求 | - |

单人项目建议：**规则引擎必须有单测**（业务变更易出 bug），其他 API 靠 Swagger 手测 + 关键路径回归脚本。

---

## 16. 待确认事项

| 编号 | 事项 | 说明 |
| --- | --- | --- |
| API-1 | OAuth 回调域是否需要单独子域 | 微信开放平台对回调域校验严格 |
| API-2 | 是否引入 OpenAPI 客户端生成 | 自动生成前端 axios client，可省手工封装 |
| API-3 | 限流是否上 Redis | 单机内存计数 MVP 够用，多实例需走 Redis |
| API-4 | 审计日志的范围 | 哪些写操作需审计（合规要求） |
