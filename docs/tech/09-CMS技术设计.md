# OISee 技术设计文档 · 09 CMS 技术设计

> 所属模块：CMS（内容管理后台）- 技术实现
> 最后更新：2026-05-27
> 关联文档：
> - 需求基线：[PRD 08-CMS](../files/08-内容管理后台CMS.md)
> - 数据模型：[02-数据模型](./02-数据模型设计.md)
> - 后端 API：[03-后端模块与API设计](./03-后端模块与API设计.md)
> - AIGC：[06-AIGC](./06-AIGC集成方案.md)
> - 前端：[04-前端架构](./04-前端架构设计.md)
>
> 本文档仅涵盖 CMS 子系统的技术实现细节，**业务需求请参见 PRD 08**。

---

## 1. 文档范围

本文档聚焦 CMS 的技术实现，回答"怎么做"，不重复"做什么"。包含：

- 部署形态与前后端边界
- RBAC 数据模型与权限校验链路
- AI 多 Provider 抽象架构
- AI 联想（混合模式）实现细节
- 测试题数据模型
- 关键技术选型（富文本、物品布局编辑器、监控面板）
- API 清单
- 数据模型增补汇总
- 安全要点

业务需求、UI 示意、验收清单见 [PRD 08-CMS](../files/08-内容管理后台CMS.md)。

---

## 2. 系统架构

### 2.1 部署形态

```
                    [运营 / 管理员]
                          │
                          ▼ HTTPS
                  ┌──────────────────┐
                  │  Nginx (443)     │
                  └────┬─────────────┘
                       │
        ┌──────────────┴───────────────┐
        ▼                              ▼
   /admin/* (静态)                /api/v1/admin/*
   code/apps/cms 打包产物              NestJS API
                                     │
                                     │ AdminJwtGuard + PermissionGuard
                                     ▼
                          ┌─────────────────────┐
                          │  CMS 业务模块        │
                          │  · ContentModule    │
                          │  · AigcModule       │
                          │  · AdminModule      │
                          │  · RoleModule       │
                          │  · AiProviderModule │
                          │  · DashboardModule  │
                          │  · AuditModule      │
                          └────────┬────────────┘
                                   │
                          PostgreSQL + Redis + OSS
```

### 2.2 前后端边界

| 维度 | 用户端 | CMS |
| --- | --- | --- |
| 路径 | `/` | `/admin` |
| 入口 HTML | `code/apps/web/dist/index.html` | `code/apps/cms/dist/index.html` |
| JWT secret | `OISEE_JWT_USER_SECRET` | `OISEE_JWT_ADMIN_SECRET` |
| JWT issuer | `oisee-user` | `oisee-admin` |
| API 前缀 | `/api/v1/*` 公共部分 | `/api/v1/admin/*` 仅管理端 |
| Guard | `JwtUserGuard` | `JwtAdminGuard` + `PermissionGuard` |

> 两套 JWT 完全隔离。即使代码出错，用户 token 也无法访问管理端 API。

---

## 3. RBAC 实现

### 3.1 数据模型

```prisma
model Role {
  id          String   @id @default(cuid())
  code        String   @unique           // 'superadmin' / 'editor' / 'reviewer'
  name        String                     // 显示名
  description String?
  isBuiltin   Boolean  @default(false)   // 内置角色不可删除

  permissions RolePermission[]
  admins      AdminRole[]

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model Permission {
  id        String   @id @default(cuid())
  code      String   @unique             // 'menu:scene' / 'action:scene.create'
  name      String                       // 显示名
  module    String                       // 'scene' / 'item' / 'kp' / ...
  type      String                       // 'menu' / 'action'
  sortOrder Int      @default(0)

  roles     RolePermission[]
}

model RolePermission {
  roleId       String
  permissionId String

  role         Role       @relation(fields: [roleId], references: [id])
  permission   Permission @relation(fields: [permissionId], references: [id])

  @@id([roleId, permissionId])
}

model AdminRole {
  adminId   String
  roleId    String
  grantedAt DateTime @default(now())

  admin     Admin    @relation(fields: [adminId], references: [id])
  role      Role     @relation(fields: [roleId], references: [id])

  @@id([adminId, roleId])
}
```

修改原 `Admin` 表：删除单字段 `role`，改为通过 `AdminRole` 多对多关联。

### 3.2 权限节点 seed

部署时通过 Prisma seed 注入完整权限节点表（约 50 条）。完整清单对应 [PRD 08 §3.4](../files/08-内容管理后台CMS.md#34-权限节点清单功能视角)。

```ts
const PERMISSIONS = [
  // 仪表盘
  { code: 'menu:dashboard', name: '仪表盘', module: 'dashboard', type: 'menu' },

  // 场景
  { code: 'menu:scene', name: '场景管理', module: 'scene', type: 'menu' },
  { code: 'action:scene.create', name: '新建场景', module: 'scene', type: 'action' },
  { code: 'action:scene.update', name: '编辑场景', module: 'scene', type: 'action' },
  { code: 'action:scene.delete', name: '删除场景', module: 'scene', type: 'action' },
  { code: 'action:scene.publish', name: '发布场景', module: 'scene', type: 'action' },
  { code: 'action:scene.aigc', name: '场景 AIGC 生成', module: 'scene', type: 'action' },

  // 其他模块（物品、知识点、实验、勋章、AIGC、用户、系统）按相同模式...

  // AI 提供商
  { code: 'menu:settings.aiProvider', name: 'AI 提供商', module: 'settings', type: 'menu' },
  { code: 'action:aiProvider.create', name: '新建 AI 提供商', module: 'settings', type: 'action' },
  { code: 'action:aiProvider.update', name: '编辑 AI 提供商', module: 'settings', type: 'action' },
  { code: 'action:aiProvider.delete', name: '删除 AI 提供商', module: 'settings', type: 'action' },
  { code: 'action:aiProvider.activate', name: '激活 AI 提供商', module: 'settings', type: 'action' },
  { code: 'action:aiProvider.test', name: '测试 AI 提供商', module: 'settings', type: 'action' },
];

await prisma.permission.createMany({ data: PERMISSIONS, skipDuplicates: true });

// 创建超管角色，关联全部权限
const all = await prisma.permission.findMany();
const superRole = await prisma.role.create({
  data: {
    code: 'superadmin',
    name: '超级管理员',
    isBuiltin: true,
    permissions: { create: all.map(p => ({ permissionId: p.id })) },
  },
});

// 创建超管账号
await prisma.admin.create({
  data: {
    username: env.OISEE_SEED_SUPERADMIN_USERNAME,
    passwordHash: await argon2.hash(env.OISEE_SEED_SUPERADMIN_PASSWORD),
    roles: { create: { roleId: superRole.id } },
  },
});
```

### 3.3 权限校验链路（三层）

#### 后端 - NestJS Guard 装饰器

```ts
export const RequiresPermission = (code: string) => SetMetadata('permission', code);

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(private reflector: Reflector, private prisma: PrismaService, private redis: Redis) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.get<string>('permission', ctx.getHandler());
    if (!required) return true;

    const { admin } = ctx.switchToHttp().getRequest();
    if (!admin) throw new UnauthorizedException();

    const perms = await this.loadPermissions(admin.id);
    if (!perms.includes(required)) throw new ForbiddenException(`Missing permission: ${required}`);
    return true;
  }

  private async loadPermissions(adminId: string): Promise<string[]> {
    const cacheKey = `admin:${adminId}:permissions`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const rows = await this.prisma.permission.findMany({
      where: { roles: { some: { role: { admins: { some: { adminId } } } } } },
      select: { code: true },
    });
    const codes = rows.map(r => r.code);
    await this.redis.set(cacheKey, JSON.stringify(codes), 'EX', 300);
    return codes;
  }
}

// 使用
@Post('/scenes')
@UseGuards(JwtAdminGuard, PermissionGuard)
@RequiresPermission('action:scene.create')
createScene() { ... }
```

#### 前端 - 路由级菜单过滤

登录响应：

```json
{
  "accessToken": "...",
  "refreshToken": "...",
  "admin": {
    "id": "admin_xxx",
    "username": "admin",
    "roles": [{ "code": "superadmin", "name": "超级管理员" }],
    "permissions": ["menu:dashboard", "menu:scene", "action:scene.create", ...]
  }
}
```

前端把 permissions 存到 Zustand store：

```tsx
const routes = [
  { path: '/scenes', component: ScenesPage, requirePerm: 'menu:scene' },
  { path: '/items', component: ItemsPage, requirePerm: 'menu:item' },
].filter(r => !r.requirePerm || hasPermission(r.requirePerm));
```

#### UI - 按钮级 RequirePerm 组件

```tsx
function RequirePerm({ code, children, fallback = null }) {
  const has = useAuthStore(s => s.permissions.includes(code));
  return has ? children : fallback;
}

<RequirePerm code="action:scene.publish">
  <Button>发布</Button>
</RequirePerm>
```

### 3.4 缓存策略

- 登录时一次性查 permissions
- Redis 缓存 `admin:{id}:permissions`，TTL 5 分钟
- 权限变更（角色权限调整、管理员角色变更）时主动 evict 缓存

---

## 4. AI 多 Provider 抽象

### 4.1 设计目标

- 用户在 CMS 配置 provider，零代码扩展新服务商
- LLM 与文生图统一走 OpenAI 兼容接口
- 文生视频用策略模式适配各家不同 API
- API Key 加密存储

### 4.2 数据模型

```prisma
enum AIModality {
  LLM
  IMAGE
  VIDEO
}

model AIProvider {
  id            String     @id @default(cuid())
  name          String                                    // 展示名
  modality      AIModality
  baseUrl       String                                    // OpenAI 兼容服务的根路径
  apiKeyCipher  String                                    // AES-256-GCM 密文
  defaultModel  String
  videoAdapter  String?                                   // 仅 VIDEO：dashscope-wanx / openai-compatible / volcengine / kling
  params        Json?                                     // 默认参数
  timeoutMs     Int        @default(60000)
  isActive      Boolean    @default(false)
  isBuiltinSeed Boolean    @default(false)
  lastTestedAt  DateTime?
  lastTestPass  Boolean?
  lastTestError String?
  createdBy     String?
  createdAt     DateTime   @default(now())
  updatedAt     DateTime   @updatedAt

  tasks         AiTask[]

  @@index([modality, isActive])
}
```

**唯一约束**：同 modality 下只能有一个 `isActive=true`。通过应用层事务保证（激活时把同模态其他全部置 false）。

### 4.3 加密实现

```ts
// code/apps/api/src/common/crypto/aes-gcm.ts
const MASTER_KEY = Buffer.from(env.OISEE_SECRET_MASTER_KEY, 'hex');   // 32 字节

export function encrypt(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', MASTER_KEY, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('base64')}.${tag.toString('base64')}.${enc.toString('base64')}`;
}

export function decrypt(payload: string): string {
  const [ivB64, tagB64, encB64] = payload.split('.');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const enc = Buffer.from(encB64, 'base64');
  const decipher = crypto.createDecipheriv('aes-256-gcm', MASTER_KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}
```

主密钥 `OISEE_SECRET_MASTER_KEY` 通过 `openssl rand -hex 32` 生成，放 `.env`，与数据库分离备份。

### 4.4 调用层（三层 Driver）

详见 [06-AIGC §2.2](./06-AIGC集成方案.md#22-调用层架构三层-driver)：

- `LlmDriver.chat(provider, req)` → 统一 OpenAI 兼容 `/v1/chat/completions`
- `ImageDriver.generate(provider, req)` → 统一 OpenAI 兼容 `/v1/images/generations`
- `VideoAdapter.submit/pollStatus()` → 策略模式，MVP 实现 `dashscope-wanx`

### 4.5 激活流程

```ts
async activateProvider(id: string, adminId: string) {
  const provider = await prisma.aIProvider.findUniqueOrThrow({ where: { id } });

  // 1. 强制连通性测试通过
  if (!provider.lastTestPass) {
    throw new BadRequestException('Provider must pass connectivity test before activation');
  }

  // 2. 事务：把同模态其他置为 false，目标置为 true
  await prisma.$transaction([
    prisma.aIProvider.updateMany({
      where: { modality: provider.modality, isActive: true },
      data: { isActive: false },
    }),
    prisma.aIProvider.update({ where: { id }, data: { isActive: true } }),
    prisma.auditLog.create({
      data: {
        adminId,
        action: 'activate_ai_provider',
        entity: 'AIProvider',
        entityId: id,
        payload: { modality: provider.modality, name: provider.name },
      },
    }),
  ]);
}
```

### 4.6 任务绑定 providerId

任务创建时立即绑定当时激活的 provider：

```ts
async createAigcTask(input: CreateAigcTaskInput, adminId: string) {
  const modality = TYPE_TO_MODALITY[input.type];        // ITEM_PRINCIPLE_VIDEO → VIDEO
  const provider = await prisma.aIProvider.findFirst({
    where: { modality, isActive: true },
  });
  if (!provider) {
    throw new BadRequestException(`No active provider for modality ${modality}`);
  }

  const task = await prisma.aiTask.create({
    data: {
      type: input.type,
      providerId: provider.id,                          // ← 关键绑定
      // ...
    },
  });

  await this.aigcQueue.add('process', { taskId: task.id });
  return task;
}
```

---

## 5. AI 联想（混合模式）实现

### 5.1 流程

```
POST /api/v1/admin/ai/suggest-items { sceneId }
              │
              ▼
        取场景 name/description
              │
   ┌──────────┴──────────┐
   ▼                     ▼
检索路（已有内容）       生成路（LLM）
embedding 比对 Items     调激活的 LLM 列出物品
取 Top 20                输出 8-12 个新候选
   │                     │
   └──────────┬──────────┘
              ▼
        合并 + 去重（名称相似度 > 0.85）
              ▼
        返回 candidates[]:
        [{ source: 'reuse', itemId, name, ... },
         { source: 'new',   name, shortDesc, suggestedSubject, ... }]
```

### 5.2 Embedding 存储（pgvector）

PostgreSQL 装 `pgvector` 扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

Prisma schema 增加字段：

```prisma
model Item {
  embedding Unsupported("vector(1024)")?
}

model KnowledgePoint {
  embedding Unsupported("vector(1024)")?
}
```

> 通义千问 `text-embedding-v2` 输出 1024 维。

索引：

```sql
CREATE INDEX item_embedding_idx
  ON "Item" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX kp_embedding_idx
  ON "KnowledgePoint" USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);
```

### 5.3 Embedding 异步重算

内容创建/更新后，触发 BullMQ 任务异步重算：

```ts
@OnEvent('item.upserted')
async onItemUpserted({ itemId }) {
  await this.embeddingQueue.add('item', { itemId });
}

@Processor('embedding')
class EmbeddingWorker {
  @Process('item')
  async process(job) {
    const item = await this.prisma.item.findUniqueOrThrow({ where: { id: job.data.itemId } });
    const text = `${item.name}\n${item.shortDesc}`;
    const vec = await this.llmDriver.embed(text);
    await this.prisma.$executeRaw`
      UPDATE "Item" SET embedding = ${vec}::vector WHERE id = ${item.id}
    `;
  }
}
```

### 5.4 相似度检索

```ts
async findSimilarItems(sceneText: string, topK = 20) {
  const queryVec = await this.llmDriver.embed(sceneText);
  return this.prisma.$queryRaw`
    SELECT id, name, "shortDesc", embedding <=> ${queryVec}::vector AS distance
    FROM "Item"
    WHERE status = 'PUBLISHED' AND embedding IS NOT NULL
    ORDER BY distance ASC
    LIMIT ${topK}
  `;
}
```

### 5.5 LLM 生成候选

```ts
async generateItemCandidates(scene) {
  const provider = await this.providerService.getActive('LLM');
  const resp = await this.llmDriver.chat(provider, {
    messages: [
      { role: 'system', content: SUGGEST_ITEMS_PROMPT },
      { role: 'user', content: `场景：${scene.name}\n分组：${scene.groupName}\n描述：${scene.description ?? ''}` },
    ],
    responseFormat: 'json_object',
    temperature: 0.7,
  });
  return JSON.parse(resp.content).items;
}
```

### 5.6 去重合并

```ts
function dedupeCandidates(reuse, generated) {
  const result = reuse.map(r => ({ source: 'reuse', ...r }));
  for (const g of generated) {
    const similar = reuse.find(r => stringSimilarity(r.name, g.name) > 0.85);
    if (!similar) {
      result.push({ source: 'new', ...g });
    }
  }
  return result;
}
```

### 5.7 限流

- 每场景每分钟最多 3 次推荐请求
- 用 Redis 计数器：`ai-suggest:{sceneId}` INCR + EXPIRE 60

---

## 6. 知识点测试题数据模型

```prisma
model KnowledgeQuiz {
  id               String   @id @default(cuid())
  knowledgePointId String
  question         String
  type             String                          // 'single' | 'multiple' | 'true_false'
  options          Json                            // [{label, text, isCorrect, explanation?}]
  difficulty       String                          // 'easy' | 'medium' | 'hard'
  explanation      String?
  sortOrder        Int      @default(0)
  status           ContentStatus @default(DRAFT)

  knowledgePoint   KnowledgePoint @relation(fields: [knowledgePointId], references: [id])

  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
}
```

`KnowledgePoint` 模型加 `quizzes KnowledgeQuiz[]` 反向关联。

LLM 调用模板：

```
知识点：{name}
学科：{subject}  难度：{difficulty}
内容：{content 纯文本提取}

生成 {N} 道 {题型} 题。每题 JSON 格式：
{
  "question": "...",
  "options": [{"label":"A", "text":"...", "isCorrect":false}, ...],
  "explanation": "..."
}
```

---

## 7. 富文本编辑（TipTap）

### 7.1 选型

- **TipTap 2.x**：基于 ProseMirror，TypeScript 友好，扩展生态完善
- 替代候选：Lexical（Meta 出品）、Slate.js
- 选 TipTap 理由：文档详尽、与 React 集成简单、JSON 存储格式稳定

### 7.2 自定义扩展

| 扩展 | 用途 |
| --- | --- |
| Image | OSS 直传后插入 URL |
| Video | 嵌入 OSS/VOD 视频 |
| KaTeX | 数学公式 |
| Callout | 提示框（tip / warning / safety 三种样式） |
| CodeBlock | 代码块 |

### 7.3 存储格式

`KnowledgePoint.content` 存 TipTap JSON：

```json
{
  "type": "doc",
  "content": [
    { "type": "heading", "attrs": { "level": 2 }, "content": [{ "type": "text", "text": "工作原理" }] },
    { "type": "paragraph", "content": [...] },
    { "type": "image", "attrs": { "src": "https://cdn.oisee.com/...", "alt": "..." } }
  ]
}
```

前台用 `@tiptap/react` 只读模式渲染 + 自定义样式。

---

## 8. 物品布局编辑器

### 8.1 实现

- 选用 [react-rnd](https://github.com/bokuweb/react-rnd) 处理拖拽 + 缩放
- 画布按 1920x1080 基准坐标系，按容器宽度缩放展示
- 物品贴图以绝对定位放在画布上
- 拖拽 / 缩放完成时把坐标转换为 0-100 百分比，写入 `Item.scenePosition`

### 8.2 关键代码骨架

```tsx
function ItemLayoutEditor({ scene, items, onSave }) {
  const [layouts, setLayouts] = useState(items.map(i => i.scenePosition));

  return (
    <div className={styles.canvas} style={{ backgroundImage: `url(${scene.sceneImageUrl})` }}>
      {items.map((item, i) => (
        <Rnd
          key={item.id}
          size={{ width: layouts[i].width + '%', height: layouts[i].height + '%' }}
          position={{ x: layouts[i].x + '%', y: layouts[i].y + '%' }}
          onDragStop={(_, d) => updateLayout(i, { x: pxToPercent(d.x, 'w'), y: pxToPercent(d.y, 'h') })}
          onResizeStop={(_, __, ref) => updateLayout(i, { width: ..., height: ... })}
          bounds="parent"
        >
          <img src={item.itemImageUrl} alt={item.name} />
        </Rnd>
      ))}
      <button onClick={() => onSave(layouts)}>保存布局</button>
    </div>
  );
}
```

### 8.3 数据同步

保存时调用：

```
PATCH /api/v1/admin/scenes/:id/item-layouts
body: [{ itemId, x, y, width, height }]
```

后端事务更新所有相关 `Item.scenePosition`。

---

## 9. 监控面板技术实现

### 9.1 数据聚合服务

```ts
@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService, private redis: Redis) {}

  async getStats() {
    const cached = await this.redis.get('dashboard:stats');
    if (cached) return JSON.parse(cached);

    const todayStart = startOfDay(new Date());
    const [totalUsers, todayActive, todayRegister, todayPoints] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { lastLoginAt: { gte: todayStart } } }),
      this.prisma.user.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.pointsLedger.aggregate({
        where: { createdAt: { gte: todayStart }, delta: { gt: 0 } },
        _sum: { delta: true },
      }),
    ]);

    const stats = {
      totalUsers,
      todayActive,
      todayRegister,
      todayPoints: todayPoints._sum.delta ?? 0,
    };

    await this.redis.set('dashboard:stats', JSON.stringify(stats), 'EX', 30);
    return stats;
  }
}
```

### 9.2 缓存层级

| 数据 | 缓存键 | TTL |
| --- | --- | --- |
| 数据卡片 | `dashboard:stats` | 30s |
| 用户增长趋势 | `dashboard:charts:user-growth:30d` | 1h |
| 活跃热度 | `dashboard:charts:scene-activity` | 1h |
| 最热知识点 | `dashboard:charts:top-kps` | 1h |
| 内容统计 | `dashboard:content-stats` | 1h |
| AIGC 任务状态 | `dashboard:aigc-status` | 5s |

### 9.3 前端轮询

```tsx
function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => api.dashboard.getStats(),
    refetchInterval: 30_000,
  });

  const { data: aigc } = useQuery({
    queryKey: ['dashboard', 'aigc'],
    queryFn: () => api.dashboard.getAigcStatus(),
    refetchInterval: 5_000,
  });
  // ...
}
```

---

## 10. API 清单（CMS 专属）

CMS 接口统一前缀 `/api/v1/admin/`，全部走 `JwtAdminGuard + PermissionGuard`。

### 10.1 认证

| 方法 | 路径 | 权限 |
| --- | --- | --- |
| POST | `/admin-auth/login` | 公开 |
| POST | `/admin-auth/refresh` | 公开 |
| POST | `/admin-auth/logout` | 已登录 |

### 10.2 内容管理

每个资源（场景/物品/知识点/实验/勋章）均有标准 RESTful 接口：

```
GET    /admin/{resource}            列表（status/keyword 筛选）
GET    /admin/{resource}/:id        详情
POST   /admin/{resource}            新建
PATCH  /admin/{resource}/:id        编辑
DELETE /admin/{resource}/:id        软删
POST   /admin/{resource}/:id/publish    发布
POST   /admin/{resource}/:id/archive    归档
```

### 10.3 关联关系

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/admin/relations/item-knowledge` | 物品 ↔ 知识点 |
| POST | `/admin/relations/experiment-knowledge` | 实验 ↔ 知识点 |
| POST | `/admin/relations/knowledge` | 知识点 ↔ 知识点（知识网络） |
| PATCH | `/admin/scenes/:id/item-layouts` | 批量更新场景内物品布局 |

### 10.4 AI 联想 & 生成

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/admin/ai/suggest-items` | 场景→物品联想 |
| POST | `/admin/ai/suggest-knowledge-points` | 物品→知识点联想 |
| POST | `/admin/ai/generate-kp-content` | 生成知识点图文初稿 |
| POST | `/admin/ai/generate-quiz` | 生成测试题 |
| POST | `/admin/ai/generate-experiment` | 生成实验方案 |

### 10.5 AIGC 任务

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/admin/aigc/tasks` | 创建任务 |
| GET | `/admin/aigc/tasks` | 任务列表 |
| GET | `/admin/aigc/tasks/:id` | 任务详情 |
| POST | `/admin/aigc/tasks/:id/cancel` | 取消 |
| POST | `/admin/aigc/tasks/:id/retry` | 重试 |
| GET | `/admin/aigc/prompts` | Prompt 模板列表 |
| PUT | `/admin/aigc/prompts/:type` | 更新某类型模板 |

### 10.6 AI 提供商

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/ai-providers?modality=LLM` | 列表（按模态） |
| GET | `/admin/ai-providers/:id` | 详情（apiKey 末 4 位脱敏） |
| POST | `/admin/ai-providers` | 创建 |
| PATCH | `/admin/ai-providers/:id` | 更新（apiKey 留空则不变） |
| DELETE | `/admin/ai-providers/:id` | 删除（激活中禁删） |
| POST | `/admin/ai-providers/:id/test` | 测试连通性 |
| POST | `/admin/ai-providers/:id/activate` | 激活（事务切换） |

### 10.7 测试题

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/knowledge-points/:id/quizzes` | 知识点测试题列表 |
| POST | `/admin/knowledge-quizzes` | 新建 |
| PATCH | `/admin/knowledge-quizzes/:id` | 编辑 |
| DELETE | `/admin/knowledge-quizzes/:id` | 删除 |
| POST | `/admin/knowledge-quizzes/:id/publish` | 发布 |

### 10.8 系统管理

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET / POST / PATCH / DELETE | `/admin/admins/*` | 管理员账号 CRUD |
| POST | `/admin/admins/:id/reset-password` | 重置密码（仅超管） |
| POST | `/admin/admins/:id/disable` | 禁用 |
| GET / POST / PATCH / DELETE | `/admin/roles/*` | 角色 CRUD |
| GET | `/admin/permissions` | 全部权限节点（只读） |
| POST | `/admin/roles/:id/permissions` | 配置角色权限 |
| GET | `/admin/users` | C 端用户列表 |
| GET | `/admin/users/:id` | 详情 |
| PATCH | `/admin/users/:id/status` | 禁用/启用 |
| GET | `/admin/audit-logs` | 审计日志列表 |
| GET | `/admin/audit-logs/export` | 导出 CSV |

### 10.9 仪表盘

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/admin/dashboard/stats` | 数据卡片 |
| GET | `/admin/dashboard/charts?range=7d` | 图表 |
| GET | `/admin/dashboard/content-stats` | 内容统计 |
| GET | `/admin/dashboard/aigc-status` | AIGC 任务状态 |

---

## 11. 数据模型增补汇总

本文档涉及的 schema 变更（已合并到 [02-数据模型](./02-数据模型设计.md)）：

| 表 | 变更 |
| --- | --- |
| `Admin` | 删除 `role` 字段；改为通过 `AdminRole` 多对多 |
| `Role` | 新增 |
| `Permission` | 新增 |
| `RolePermission` | 新增 |
| `AdminRole` | 新增 |
| `KnowledgeQuiz` | 新增 |
| `AIProvider` | 新增 |
| `AiTask` | 增加 `providerId` 字段 |
| `Item` | 增加 `embedding vector(1024)` 字段 |
| `KnowledgePoint` | 增加 `embedding vector(1024)` + `quizzes` 反向关联 |
| `PromptTemplate` | 扩展 `taskType` 包含 LLM 类型；`styleReferenceUrl` 字段 |

PostgreSQL 扩展：

```sql
CREATE EXTENSION IF NOT EXISTS vector;
CREATE INDEX item_embedding_idx ON "Item" USING ivfflat (embedding vector_cosine_ops);
CREATE INDEX kp_embedding_idx ON "KnowledgePoint" USING ivfflat (embedding vector_cosine_ops);
```

---

## 12. 安全要点

| 项 | 措施 |
| --- | --- |
| 管理员密码 | argon2id 哈希存储 |
| 登录限流 | 每 IP 每分钟 5 次；连续 10 次失败锁定 30 分钟 |
| API Key | AES-256-GCM 加密；主密钥仅在 .env，与 DB 备份分离 |
| 敏感操作 | 删除内容、删除账号、查看完整手机号需密码二次确认 |
| 操作审计 | 所有写操作进 `AuditLog`，含 IP、操作人、目标实体 |
| CORS | CMS API 仅接受 `OISEE_ADMIN_ORIGIN` 来源 |
| HTTPS | 强制（Nginx 层） |
| Cookie | 仅 OAuth 短暂使用，标记 `HttpOnly + Secure + SameSite=Lax` |
| JWT 隔离 | 与用户端独立 secret + issuer，校验失败立即拒绝 |
| 密码重置 | 重置后生成临时密码，首次登录强制改密 |

---

## 13. 性能与可观测

| 指标 | 目标 / 措施 |
| --- | --- |
| 列表接口响应 | < 500ms（含分页与关联） |
| 权限校验 | Redis 缓存命中 < 5ms；未命中 < 50ms |
| AI 联想响应 | < 5s（embedding 检索 + LLM 并行） |
| AIGC 任务可视性 | 5 秒前端轮询 |
| 日志 | Pino 结构化 JSON，按 traceId 串联 |
| 审计日志 | 同步写入，关键路径增加 < 10ms |

---

## 14. 开放问题（技术侧）

| 编号 | 事项 | 说明 |
| --- | --- | --- |
| T-1 | Embedding 模型一致性 | 所有 embedding 必须用同一模型生成；切换 LLM provider 时若 embedding 模型变更需全表重算 |
| T-2 | pgvector 版本要求 | 需 PostgreSQL 14+，确认阿里云 RDS / 自部署 PG 16 支持 |
| T-3 | 文生视频适配器扩展时机 | MVP 仅 dashscope-wanx，二期添加哪些 |
| T-4 | 操作审计的归档方案 | 长期增长后是否拆冷热表 |
| T-5 | TipTap 富文本的迁移 | 未来如需切换编辑器（如 Lexical），JSON 结构如何迁移 |
| T-6 | 主密钥轮换 | `OISEE_SECRET_MASTER_KEY` 如何安全轮换（重新加密所有 apiKey） |
