# OISee 技术设计文档 · 06 AIGC 集成方案

> 所属模块：后端 - aigc / CMS
> 最后更新：2026-05-27
> 关联文档：[02-数据模型](./02-数据模型设计.md)、[03-后端 API](./03-后端模块与API设计.md)、[PRD 08-CMS](../files/08-内容管理后台CMS.md)

---

## 1. 概述

AIGC 集成模块为 CMS 提供 AI 辅助内容生产能力，覆盖三个模态：

| 模态 | 用途 |
| --- | --- |
| **LLM**（文本） | AI 联想（场景→物品、物品→知识点）、测试题生成、实验方案生成、知识点图文初稿 |
| **IMAGE**（文生图） | 场景 2.5D 大图、物品透明贴图、物品爆炸图、知识点配图 |
| **VIDEO**（文生视频） | 物品原理视频、实验演示视频 |

设计目标：
- **异步可观测**：耗时任务（尤其视频）走队列，CMS 可实时看到进度
- **风格一致**：通过预置 Prompt + 风格参考保证视觉统一
- **可重试可降级**：失败自动重试、超阈值后人工介入；任何环节失败都不阻塞手动上传通道
- **成本可控**：任务粒度计费可查，避免误调
- **服务商解耦**：统一 OpenAI 兼容接口 + 视频适配器，运营在 CMS 切换 provider 不改代码（详见 §2、[09-CMS 技术设计 §4](./09-CMS技术设计.md#4-ai-多-provider-抽象)、[PRD 08 §7](../files/08-内容管理后台CMS.md#7-ai-提供商配置系统设置)）

---

## 2. 服务选型与抽象层

### 2.1 多 Provider 架构

> **核心变更**：从 V1 的"代码硬编码 DashScope"升级为"用户在 CMS 配置 + 统一 OpenAI 兼容接口"。需求描述见 [PRD 08 §7](../files/08-内容管理后台CMS.md#7-ai-提供商配置系统设置)；技术实现见 [09-CMS 技术设计 §4](./09-CMS技术设计.md#4-ai-多-provider-抽象)。

每个 AIGC 任务执行时的服务商由 **AIProvider 表的当前激活记录** 决定，不再硬编码：

```
管理员在 CMS「系统设置 - AI 提供商」配置激活的 provider
                  │
                  ▼
              AIProvider 表
       ┌──────────────────────────┐
       │ LLM 模态 → 通义千问 Max   │
       │ IMAGE 模态 → 通义万相     │
       │ VIDEO 模态 → 通义万相视频  │
       └──────────────────────────┘
                  │
任务创建时记录 providerId → 执行时按 providerId 解密 apiKey 调用
```

### 2.2 调用层架构（三层 Driver）

```
                  ┌─────────────────────────────┐
                  │     AiOrchestrator          │
                  │  按 AiTaskType 路由到模态    │
                  └──────────────┬──────────────┘
                                 │
        ┌────────────────────────┼────────────────────────┐
        ▼                        ▼                        ▼
  ┌──────────┐            ┌──────────┐             ┌──────────┐
  │   LLM    │            │  IMAGE   │             │  VIDEO   │
  │ Driver   │            │ Driver   │             │ Adapter  │
  └────┬─────┘            └────┬─────┘             └────┬─────┘
       │                       │                        │
       │ 统一 OpenAI 兼容       │ 统一 OpenAI 兼容        │ Strategy 模式：
       │ POST /v1/chat/        │ POST /v1/images/        │ - dashscope-wanx
       │   completions         │   generations           │ - volcengine-jimeng
       │                       │                         │ - kling
       │                       │                         │ - openai-compatible
       └───────────────┬───────┴─────────────────────────┘
                       ▼
              ┌─────────────────────┐
              │ HTTP Client         │
              │ (axios + Bearer)    │
              └─────────────────────┘
```

### 2.3 三种 Driver 的请求/响应规范

#### LLM Driver（统一 OpenAI 兼容）

```ts
interface LlmRequest {
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
  responseFormat?: 'text' | 'json_object';
  temperature?: number;
  maxTokens?: number;
}

interface LlmResponse {
  content: string;
  usage: { promptTokens: number; completionTokens: number };
}

class LlmDriver {
  async chat(provider: AIProvider, req: LlmRequest): Promise<LlmResponse> {
    const apiKey = decrypt(provider.apiKeyCipher);
    const resp = await axios.post(
      `${provider.baseUrl}/chat/completions`,
      {
        model: provider.defaultModel,
        messages: req.messages,
        temperature: req.temperature ?? 0.7,
        max_tokens: req.maxTokens,
        response_format: req.responseFormat === 'json_object'
          ? { type: 'json_object' }
          : undefined,
      },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: provider.timeoutMs }
    );
    return {
      content: resp.data.choices[0].message.content,
      usage: {
        promptTokens: resp.data.usage.prompt_tokens,
        completionTokens: resp.data.usage.completion_tokens,
      },
    };
  }
}
```

#### IMAGE Driver（统一 OpenAI 兼容）

```ts
interface ImageRequest {
  prompt: string;
  size?: '1024x1024' | '1024x1792' | '1792x1024';
  n?: number;
}

interface ImageResponse {
  urls: string[];                    // 服务商返回的临时 URL（需自行下载并搬到 OSS）
}

class ImageDriver {
  async generate(provider: AIProvider, req: ImageRequest): Promise<ImageResponse> {
    const apiKey = decrypt(provider.apiKeyCipher);
    const resp = await axios.post(
      `${provider.baseUrl}/images/generations`,
      {
        model: provider.defaultModel,
        prompt: req.prompt,
        size: req.size ?? '1024x1024',
        n: req.n ?? 1,
        response_format: 'url',
      },
      { headers: { Authorization: `Bearer ${apiKey}` }, timeout: provider.timeoutMs }
    );
    return { urls: resp.data.data.map((d: any) => d.url) };
  }
}
```

#### VIDEO Adapter（策略模式 + 各家不同 API）

```ts
interface VideoRequest {
  prompt: string;
  durationSec?: number;
  size?: string;
  startImageUrl?: string;            // 图生视频
}

interface VideoSubmitResult { thirdPartyTaskId: string; }
interface VideoStatusResult {
  status: 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED';
  videoUrl?: string;
  errorMessage?: string;
}

interface VideoAdapter {
  validateConfig(provider: AIProvider): Promise<void>;
  submit(provider: AIProvider, req: VideoRequest): Promise<VideoSubmitResult>;
  pollStatus(provider: AIProvider, taskId: string): Promise<VideoStatusResult>;
}

// 注册表
const VIDEO_ADAPTERS: Record<string, VideoAdapter> = {
  'dashscope-wanx':     new DashscopeWanxAdapter(),     // 通义万相视频（MVP 首选）
  'openai-compatible':  new OpenAICompatVideoAdapter(), // 预留：未来标准
  'volcengine-jimeng':  new VolcengineJimengAdapter(),  // 二期可加
  'kling':              new KlingAdapter(),             // 二期可加
};

// AiOrchestrator 用法
const adapter = VIDEO_ADAPTERS[provider.videoAdapter];
const { thirdPartyTaskId } = await adapter.submit(provider, req);
```

> **MVP 仅实现 `dashscope-wanx` 适配器**；其他适配器作为预留扩展点。

### 2.4 任务时长预期

| 任务类型 | 模态 | 预期耗时 | 调用模式 |
| --- | --- | --- | --- |
| LLM 推荐/生成 | LLM | 2-10s | 同步（直接返回） |
| 文生图 | IMAGE | 5s-2min | 同步（多数服务商）或短轮询 |
| 文生视频 | VIDEO | 3-10min | 异步任务（submit + poll） |

所有任务一律入 BullMQ 队列，便于统一管理；快速返回的（LLM、IMAGE）队列处理迅速，慢的（VIDEO）走长时间任务通道。

---

## 3. 系统架构

```
┌──────────────────┐
│  CMS Admin UI    │
│  (点击生成按钮)   │
└────────┬─────────┘
         │ POST /api/v1/admin/aigc/tasks
         ▼
┌──────────────────────────────────────┐
│   NestJS API                         │
│   AigcController                     │
│     → AigcService.createTask()       │
│         1. 拼接 prompt（预置+输入）   │
│         2. 写入 AiTask 表             │
│         3. 推入 BullMQ 队列           │
└────────┬─────────────────────────────┘
         │
         ▼
┌──────────────────────────────────────┐
│   BullMQ Worker（同进程或独立）       │
│   AigcWorker                         │
│     1. 取任务，调 DashScope API       │
│     2. 拿到 thirdPartyTaskId          │
│     3. 轮询直到完成（或等 webhook）   │
│     4. 下载结果 → 上传到 OSS          │
│     5. 更新 AiTask.resultUrl/status  │
│     6. （可选）回填到关联实体         │
└────────┬─────────────────────────────┘
         │
         ▼
   阿里云 DashScope     →    阿里云 OSS
   （生成媒体）              （持久化结果）

         ┌──────────────────────────────┐
         │   CMS 前端                    │
         │   轮询 GET /admin/aigc/tasks/:id │
         │   或 SSE 推送进度              │
         └──────────────────────────────┘
```

---

## 4. 数据流

### 4.1 任务创建

```
1. 管理员在 CMS 物品编辑页填写"补充描述"（如：微波炉，重点讲电磁波加热原理）
2. 点击"生成原理视频"按钮
3. 前端 POST /api/v1/admin/aigc/tasks
     { type: 'ITEM_PRINCIPLE_VIDEO', itemId: 'xxx', userInput: '...' }
4. 后端：
   a. 从 PromptTemplate 取该 type 的预置 prompt
   b. 拼接最终 prompt：preset + user input + style note
   c. 写 AiTask 记录（status=PENDING）
   d. 把 taskId 推入 aigc-video 队列
5. 返回 { taskId, status: 'PENDING', estimatedSeconds: 300 }
```

### 4.2 Worker 执行

> Worker 不再硬编码任何服务商，按任务记录的 `providerId` 加载 AIProvider 配置，再分派到对应 driver/adapter。

```ts
@Processor('aigc-video')
export class AigcVideoWorker {
  constructor(
    private prisma: PrismaService,
    private oss: OssService,
    private videoAdapters: VideoAdapterRegistry,
  ) {}

  @Process()
  async process(job: Job<{ taskId: string }>) {
    const task = await this.prisma.aiTask.update({
      where: { id: job.data.taskId },
      data: { status: 'RUNNING', startedAt: new Date() },
      include: { provider: true },
    });

    if (!task.provider) {
      throw new Error('Task has no bound AIProvider');
    }

    const adapter = this.videoAdapters.get(task.provider.videoAdapter!);
    if (!adapter) {
      throw new Error(`Unknown video adapter: ${task.provider.videoAdapter}`);
    }

    try {
      // 1. 通过适配器提交任务（adapter 内部完成 apiKey 解密 + 服务商特定调用）
      const { thirdPartyTaskId } = await adapter.submit(task.provider, {
        prompt: task.promptUsed,
        durationSec: 5,
        size: '1280x720',
      });
      await this.prisma.aiTask.update({
        where: { id: task.id },
        data: { thirdPartyTaskId },
      });

      // 2. 轮询直到完成（每 30s 一次，最多 20 分钟）
      const result = await this.pollUntilDone(
        () => adapter.pollStatus(task.provider!, thirdPartyTaskId),
        { intervalMs: 30000, timeoutMs: 1200000 },
      );

      if (result.status === 'FAILED' || !result.videoUrl) {
        throw new Error(result.errorMessage ?? 'Video generation failed');
      }

      // 3. 下载到本地临时文件
      const tmpPath = await this.download(result.videoUrl);

      // 4. 搬到 OSS（脱离服务商临时 URL）
      const ossUrl = await this.oss.upload({
        key: `aigc/${task.type}/${task.id}.mp4`,
        path: tmpPath,
        contentType: 'video/mp4',
      });

      // 5. 更新任务 + 回填到关联实体
      await this.prisma.$transaction([
        this.prisma.aiTask.update({
          where: { id: task.id },
          data: { status: 'SUCCEEDED', resultUrl: ossUrl, finishedAt: new Date() },
        }),
        this.prisma.item.update({
          where: { id: task.itemId! },
          data: { principleVideoUrl: ossUrl },
        }),
      ]);
    } catch (err) {
      await this.prisma.aiTask.update({
        where: { id: task.id },
        data: {
          status: 'FAILED',
          errorMessage: err instanceof Error ? err.message : String(err),
          finishedAt: new Date(),
        },
      });
      throw err;     // BullMQ 自动重试
    }
  }
}
```

> 图片 Worker（`aigc-image`）逻辑类似，但走同步 `ImageDriver.generate()` 即可，不需要 polling。LLM 任务（联想/测试题/实验方案）一般直接由 Controller 同步调用 `LlmDriver.chat()`，不入队，但仍写 `AiTask` 留痕方便审计。

### 4.3 失败重试策略

BullMQ job 配置：
```ts
{ attempts: 3, backoff: { type: 'exponential', delay: 60000 } }
```

3 次失败后任务标记为 `FAILED`，CMS 显示"失败"，管理员可手动点"重试"。

---

## 5. Prompt 模板

### 5.1 设计原则

- **类型化**：每种 `AiTaskType` 一个预置 prompt
- **结构化拼接**：`{preset_prompt}\n\n{user_input}\n\nStyle: {style_note}`
- **可演进**：CMS 提供编辑界面，无需改代码

### 5.2 示例预置 Prompt

**`SCENE_IMAGE`（场景 2.5D 大图）**

```
A clean 2.5D isometric illustration of a {{scene_name}}, suitable for an educational app for children aged 6-16.
Style: bright pastel colors, soft shadows, no text, no people, slightly stylized,
       child-friendly, warm lighting.
Composition: viewing angle approximately 30 degrees from above,
             leave space for interactive items to be overlaid.
Resolution: 16:9, 1920x1080.

Additional notes from editor:
{{user_input}}
```

**`ITEM_IMAGE`（物品独立透明贴图）**

```
A standalone 2.5D illustration of a {{item_name}} on a transparent background,
matching the style of OISee scene illustrations.
Style: same as scene background — bright pastel, soft shadows, isometric perspective,
       slightly stylized, child-friendly.
Output: PNG with alpha channel, centered, no text.

Additional notes from editor:
{{user_input}}
```

**`ITEM_EXPLODED`（爆炸图）**

```
An exploded-view diagram of a {{item_name}}, showing its internal components separated,
in a clean educational style.
Style: technical illustration with subtle 2.5D depth, light callouts ready for labels,
       neutral background, no text labels in image (labels added separately).

Additional notes from editor:
{{user_input}}
```

**`ITEM_PRINCIPLE_VIDEO`（原理视频）**

```
A 5-second educational animation explaining how a {{item_name}} works,
in a simple 2.5D style suitable for children.
The animation should visually demonstrate the working principle described:

{{user_input}}

Style: same illustration style as OISee — bright pastel, isometric, friendly.
No narration audio (silent or background music only).
```

### 5.3 PromptTemplate 表结构

参见 [02-数据模型](./02-数据模型设计.md) §3。每条记录：

```ts
{
  taskType: 'ITEM_PRINCIPLE_VIDEO',
  prompt: "..." /* 上面的预置 prompt */,
  styleNote: "...",
  params: {
    model: 'wanx2.1-t2v-plus',
    size: '1280*720',
    duration: 5,
  },
  updatedBy: 'admin_001',
}
```

### 5.4 模板变量替换

后端拼接时支持 Mustache 风格变量：

```ts
function buildFinalPrompt(template: string, ctx: { item_name?: string; scene_name?: string; user_input: string }): string {
  return template
    .replace('{{item_name}}', ctx.item_name ?? '')
    .replace('{{scene_name}}', ctx.scene_name ?? '')
    .replace('{{user_input}}', ctx.user_input ?? '');
}
```

变量从关联实体读取，避免管理员每次手填。

---

## 6. 队列设计

### 6.1 队列定义

```ts
// queues/queue-names.ts
export const QUEUES = {
  AIGC_IMAGE: 'aigc-image',
  AIGC_VIDEO: 'aigc-video',
} as const;
```

### 6.2 队列配置

```ts
// queues/queues.module.ts
BullModule.registerQueue(
  {
    name: QUEUES.AIGC_IMAGE,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 30000 },
      removeOnComplete: 100,        // 保留最近 100 条
      removeOnFail: 500,
    },
  },
  {
    name: QUEUES.AIGC_VIDEO,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: 100,
      removeOnFail: 500,
    },
  },
);
```

### 6.3 并发控制

```ts
@Processor(QUEUES.AIGC_VIDEO, { concurrency: 2 })   // 同时最多 2 个视频任务
@Processor(QUEUES.AIGC_IMAGE, { concurrency: 5 })   // 图片可以更多
```

并发数根据 DashScope 配额调整。

### 6.4 队列监控

引入 **bull-board** 或自研：
- CMS 的 AIGC 工作台展示队列状态
- 数据来源：BullMQ 队列 API + `AiTask` 表

```ts
// AigcController
@Get('queue-stats')
async stats() {
  const [imgWaiting, imgActive, vidWaiting, vidActive] = await Promise.all([
    this.imgQueue.getWaitingCount(),
    this.imgQueue.getActiveCount(),
    this.vidQueue.getWaitingCount(),
    this.vidQueue.getActiveCount(),
  ]);
  return { image: { waiting: imgWaiting, active: imgActive }, video: { waiting: vidWaiting, active: vidActive } };
}
```

---

## 7. DashScope SDK 封装

```ts
// modules/aigc/providers/dashscope.service.ts
@Injectable()
export class DashscopeService {
  private client: AxiosInstance;

  constructor(private config: ConfigService) {
    this.client = axios.create({
      baseURL: 'https://dashscope.aliyuncs.com/api/v1',
      headers: {
        Authorization: `Bearer ${this.config.get('OISEE_DASHSCOPE_API_KEY')}`,
        'X-DashScope-Async': 'enable',
      },
      timeout: 30000,
    });
  }

  async createImageTask(params: { prompt: string; size?: string; model?: string }): Promise<{ task_id: string }> {
    const { data } = await this.client.post('/services/aigc/text2image/image-synthesis', {
      model: params.model ?? 'wanx2.1-t2i-plus',
      input: { prompt: params.prompt },
      parameters: { size: params.size ?? '1920*1080' },
    });
    return { task_id: data.output.task_id };
  }

  async createVideoTask(params: { prompt: string; size?: string; duration?: number }): Promise<{ task_id: string }> {
    const { data } = await this.client.post('/services/aigc/video-generation/video-synthesis', {
      model: 'wanx2.1-t2v-plus',
      input: { prompt: params.prompt },
      parameters: {
        size: params.size ?? '1280*720',
        duration: params.duration ?? 5,
      },
    });
    return { task_id: data.output.task_id };
  }

  async getTaskStatus(taskId: string): Promise<DashscopeTaskResult> {
    const { data } = await this.client.get(`/tasks/${taskId}`);
    return {
      status: data.output.task_status,        // 'PENDING' | 'RUNNING' | 'SUCCEEDED' | 'FAILED'
      resultUrl: data.output.results?.[0]?.url,
      message: data.output.message,
    };
  }
}
```

### 7.1 重试与限流

- 调用 DashScope 时 HTTP 错误 5xx → SDK 内置 axios-retry 3 次
- 429（限流） → 退避 60s 重试
- 4xx 业务错误 → 不重试，直接标记任务失败

---

## 8. 任务状态机

```
        ┌─────────┐
        │ PENDING │ (入队，未开始)
        └────┬────┘
             │ Worker 拉取
             ▼
        ┌─────────┐
        │ RUNNING │ (调用 DashScope 中)
        └────┬────┘
        ┌────┴────────┐
        │             │
        ▼             ▼
   ┌──────────┐  ┌────────┐
   │SUCCEEDED │  │ FAILED │ ← (重试耗尽)
   └──────────┘  └───┬────┘
                     │ 管理员手动
                     ▼
                 重新入队 (回到 PENDING)

   PENDING/RUNNING 状态下可 ─→ CANCELLED (管理员主动取消)
```

### 8.1 取消任务

```ts
async cancelTask(taskId: string) {
  const task = await this.prisma.aiTask.findUnique({ where: { id: taskId } });
  if (task.status === 'PENDING') {
    // 从队列移除
    const job = await this.queue.getJob(task.id);
    await job?.remove();
  } else if (task.status === 'RUNNING' && task.thirdPartyTaskId) {
    // 调 DashScope 取消（如支持）
    await this.dashscope.cancelTask(task.thirdPartyTaskId);
  }
  await this.prisma.aiTask.update({
    where: { id: taskId },
    data: { status: 'CANCELLED', finishedAt: new Date() },
  });
}
```

---

## 9. 结果回填策略

### 9.1 自动回填

任务成功后，按 `type` 自动写入对应实体字段：

| AiTaskType | 回填字段 |
| --- | --- |
| `SCENE_IMAGE` | `Scene.sceneImageUrl` |
| `ITEM_IMAGE` | `Item.itemImageUrl` |
| `ITEM_EXPLODED` | `Item.explodedImageUrl` |
| `ITEM_PRINCIPLE_VIDEO` | `Item.principleVideoUrl` |
| `EXPERIMENT_VIDEO` | `Experiment.demoVideoUrl` |
| `KP_ILLUSTRATION` | `KnowledgePoint.illustrationUrl` |

### 9.2 多版本管理

管理员可能对一个物品多次生成不同视频，最终选用一个。**MVP 简化**：
- 每次成功后**自动覆盖**目标字段
- 历史 `AiTask` 仍可在工作台查到，URL 仍有效（不删 OSS）
- 管理员可在 AIGC 工作台手动"应用此结果"切回旧版本

后期可改为「候选-发布」两阶段。

### 9.3 视频转码（特别说明）

DashScope 返回的视频可能是 MP4，但前端播放 HLS 体验更好。MVP 简化：
- 直接用 MP4，前端 xgplayer 兼容播放
- 后期再接阿里云 VOD 做转码（参见 §11）

---

## 10. CMS 前端工作流

### 10.1 单次生成按钮

物品编辑页：
```
[原理介绍视频]
  视频预览：[ 当前视频或占位 ]
  补充描述：[ ____________________ ]
  [ 生成视频 ] [ 上传视频 ]
```

点击"生成视频"：
1. 弹窗确认（含成本提示："本次生成预计 5-10 分钟"）
2. 调 API 创建任务
3. 按钮变为"生成中... (剩余约 5min)"
4. 每 5s 轮询任务状态
5. 完成后视频自动加载到预览区
6. 失败提示 + "重新生成"按钮

### 10.2 批量队列视图

`/admin/aigc/tasks` 页面：

| 任务 ID | 类型 | 关联 | 状态 | 创建时间 | 完成时间 | 操作 |
| --- | --- | --- | --- | --- | --- | --- |
| task_xx | 物品视频 | 微波炉 | 🟢 SUCCEEDED | 10:00 | 10:08 | 查看 \| 重生成 |
| task_yy | 场景图 | 厨房 | 🟡 RUNNING | 10:30 | - | 取消 |
| task_zz | 爆炸图 | 冰箱 | 🔴 FAILED | 10:15 | 10:16 | 重试 \| 详情 |

### 10.3 Prompt 模板管理

`/admin/aigc/prompts` 页面：
- 每种 AiTaskType 一个卡片
- 显示当前 prompt + 编辑按钮
- 修改时可"预览拼接结果"
- 保存后立即生效（下一个任务用新 prompt）

---

## 11. 成本与配额监控

### 11.1 单任务成本估算（参考）

| 任务类型 | 单次成本（人民币，估算） |
| --- | --- |
| 文生图 turbo | ¥0.05 |
| 文生图 plus | ¥0.20 |
| 文生视频 5s | ¥1.50 |
| 图生视频 5s | ¥2.00 |

> 实际以阿里云计费为准，会随版本调整。

### 11.2 成本控制

- CMS 工作台展示「本月生成次数」与「估算费用」
- 设置月度配额上限（环境变量 `OISEE_AIGC_MONTHLY_BUDGET`），超限时拒绝创建任务
- 后台审计日志记录每次生成的成本

---

## 12. 视频长期演进（接入 VOD）

MVP 直接将 DashScope 返回的视频存 OSS + 用 `<video>` 标签播放，简单但有局限：
- 无自适应码率
- 移动端流量消耗大

**后期演进**：
1. Worker 完成后，把 OSS 视频文件**自动同步到阿里云 VOD**
2. VOD 转码出多码率 HLS
3. `Item.principleVideoUrl` 改存 VOD 播放凭证或主 m3u8 URL
4. 前端 xgplayer 走 VOD 加密播放

此优化对前端 API 几乎无影响，但需要管理员调整 OSS/VOD 权限。**MVP 不做**。

---

## 13. 安全考量

| 风险 | 对策 |
| --- | --- |
| API Key 泄露 | 仅在后端 Worker 使用，不暴露给前端；定期轮换 |
| 内容合规（生成不当内容） | DashScope 自带审核 + CMS 强制管理员审核才发布 |
| 任务被冒用刷量 | 创建任务接口强 AdminJwt + 操作审计 + 月度配额 |
| Webhook 伪造（若启用） | 验证签名 + IP 白名单 |
| 大文件下载攻击 | 限制单文件大小（如 100MB 视频） |

---

## 14. 错误码

```ts
// shared/constants/error-codes.ts
export const AIGC_ERRORS = {
  TASK_NOT_FOUND:        50001,
  TASK_INVALID_TYPE:     50002,
  PROMPT_TEMPLATE_MISSING: 50003,
  DASHSCOPE_API_ERROR:   50101,
  DASHSCOPE_TIMEOUT:     50102,
  DASHSCOPE_QUOTA_EXCEEDED: 50103,
  RESULT_UPLOAD_FAILED:  50201,
  MONTHLY_BUDGET_EXCEEDED: 50301,
} as const;
```

---

## 15. 待确认事项

| 编号 | 事项 | 说明 |
| --- | --- | --- |
| AI-1 | DashScope 模型版本锁定 | MVP 用 `wanx2.1-*`，需在开发期验证最新可用版本 |
| AI-2 | 视频是否必须接 VOD | 视用户量决定，MVP 直存 OSS |
| AI-3 | 失败后是否人工兜底 | 失败时是否自动切换备用通道（如换 SD 等）；MVP 仅手动上传兜底 |
| AI-4 | 内容审核流程 | PRD H-2 联动：生成后是否进入"待审核"态 |
| AI-5 | 多管理员并发生成的资源隔离 | 配额是按用户分配还是全局共享 |
| AI-6 | 爆炸图标注是否也用 AI | 当前是管理员手动点选，后期可考虑 |
