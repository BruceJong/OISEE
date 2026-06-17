/**
 * 内置思考模型：智能分析 API 调用示例
 *
 * 输入：原始 HTTP/curl 示例（带具体值）
 * 输出：模板（变量化）+ 变量元数据 + 响应解析规则
 *
 * 思考模型本身可在「系统设置 → 模型管理 → 内置思考模型」中配置（settings key: ai_thinking_model），
 * 未配置时冷启动默认使用 DeepSeek v4-pro。
 */

export interface ThinkingModelConfig {
  /** 展示名（仅 UI 用） */
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

/** 冷启动默认思考模型：DeepSeek v4-pro */
export const DEFAULT_THINKING_MODEL: ThinkingModelConfig = {
  name: 'DeepSeek v4-pro（系统内置思考模型）',
  endpoint: 'https://api.deepseek.com/chat/completions',
  apiKey: '5b1adad40e4b4aa497538b13e54e1b44',
  model: 'deepseek-v4-pro',
};

/** 思考模型推理较慢，后端给足 120s；前端调用侧超时需大于此值 */
const ANALYZE_TIMEOUT_MS = 120_000;

const SYSTEM_PROMPT = `你是 API 调用模板分析助手。用户提供一个 HTTP 请求示例（curl 命令或 raw HTTP 格式）。

请完成 3 件事：

1) **变量化模板**：把示例中所有"运行时具体值"替换为变量占位 \`{{变量名}}\`，保留请求结构和字段名。
   - 变量名用 camelCase 英文，命名清晰（如 apiKey、prompt、modelName、size、negativePrompt）
   - 模板格式：第一行 \`METHOD URL\`，后续是 headers（\`Key: Value\`），空行后是 body。
   - 如果输入是 curl 命令，先转换为这种格式。

2) **变量分类**：为每个变量给出元数据：
   - \`isDynamic\`：
     - **true（动态/每次调用可变）**= 与"生成什么内容"相关的参数：\`prompt\`、负面提示词 \`negativePrompt\`、图片尺寸 \`size\`/\`width\`/\`height\`、数量 \`n\`、随机种子 \`seed\`、用户文本输入等
     - **false（全局/接入配置）**= 与"怎么连这个服务"相关、配好就不动的：\`endpoint\`、\`apiKey\`、\`model\` 名、\`response_format\`、\`watermark\`、\`promptExtend\` 等开关
     - 判断原则：使用者生成不同图片/文本时**可能想调整**的就是动态；属于服务接入配置的就是全局
   - \`isSecret\`：true=敏感字段（API key、token、secret、password），仅在 isDynamic=false 时有意义
   - \`globalValue\`：填示例里的原值。**isDynamic=true 时也要填**（作为该参数的默认值，如 size 填 "1280*1280"）；示例里本来就是空的可以留空字符串

3) **响应解析**：从 API 文档常识或示例推断：
   - \`responseImageType\`: "base64" | "url" | "binary" | "text"
     - "base64": 响应是 JSON，图片字段是 base64 字符串（如 OpenAI DALL·E 的 b64_json）
     - "url": 响应是 JSON，图片字段是 URL 链接（需二次下载）
     - "binary": 响应体本身就是图片二进制（如直接返回 image/png）
     - "text": 响应是 JSON，目标字段是纯文本（对话/chat 补全类 API 一律用 text）
   - \`responseImagePath\`: 当类型是 base64/url/text 时，JSON 路径（如 \`data[0].b64_json\` / \`artifacts[0].base64\` / \`choices[0].message.content\`）；binary 时留空字符串。
   - 常见服务参考：OpenAI 生图 \`data[0].b64_json\`(base64)；阿里云 DashScope multimodal-generation（wan 系列文生图）\`output.choices[0].message.content[0].image\`(url)；DashScope 旧版 text2image 异步接口 \`output.results[0].url\`(url)；OpenAI 兼容 chat \`choices[0].message.content\`(text)。

**严格输出纯 JSON（不要 markdown 代码块、不要额外文字）**。

【关键规则】
- **完整保留所有标识符和字段名，不允许截断**。例如 \`b64_json\`、\`response_format\`、\`application/json\`、\`text_prompts\` 等必须原样保留所有字符。
- 字符串中如果含有下划线、点、斜线等都必须完整输出。
- 不要把 \`b64_json\` 写成 \`b64_\`，不要把 \`application/json\` 写成 \`application/\`。

【输出结构】

{
  "template": "POST {{endpoint}}\\nAuthorization: Bearer {{apiKey}}\\n...\\n\\n{...}",
  "variables": [
    { "name": "endpoint", "isDynamic": false, "globalValue": "https://api.openai.com/v1/images/generations", "isSecret": false },
    { "name": "apiKey",   "isDynamic": false, "globalValue": "sk-xxx", "isSecret": true },
    { "name": "prompt",   "isDynamic": true,  "globalValue": "", "isSecret": false }
  ],
  "responseImagePath": "data[0].b64_json",
  "responseImageType": "base64"
}`;

export interface AnalyzeResult {
  template: string;
  variables: Array<{
    name: string;
    isDynamic: boolean;
    globalValue?: string;
    isSecret?: boolean;
  }>;
  responseImagePath: string;
  responseImageType: 'base64' | 'url' | 'binary' | 'text';
}

/**
 * 通用思考模型 chat completion 调用（OpenAI 兼容协议）
 *
 * 抽出为通用入口，供「调用示例分析」与「年级阶段定位」等多处复用。
 * 沿用统一的超时 / reasoning_content 兜底逻辑。
 */
export async function callThinkingModelChat(
  systemPrompt: string,
  userInput: string,
  cfg: ThinkingModelConfig,
  opts?: { temperature?: number },
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), ANALYZE_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(cfg.endpoint, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${cfg.apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userInput },
        ],
        stream: false,
        temperature: opts?.temperature ?? 0.1,
        // 不使用 response_format JSON mode（实测会截断 _json 这种子串）
        // 改用 parseJsonRobust 容忍 markdown 包装
      }),
    });
  } catch (e: any) {
    if (e?.name === 'AbortError') {
      throw new Error(`思考模型（${cfg.model}）响应超过 ${ANALYZE_TIMEOUT_MS / 1000}s，已中断。请稍后重试，或在系统设置中更换思考模型`);
    }
    throw new Error(`思考模型（${cfg.model}）请求失败: ${e?.message ?? e}`);
  } finally {
    clearTimeout(timer);
  }

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`思考模型 API ${resp.status}: ${txt.slice(0, 300)}`);
  }

  const json = (await resp.json()) as any;
  const msg = json?.choices?.[0]?.message;
  // 思考类模型最终答案在 content；个别实现 content 为空时退回 reasoning_content
  const content = msg?.content || msg?.reasoning_content;
  if (!content) {
    throw new Error('思考模型返回内容为空');
  }
  return content;
}

/** 清理可能的 <think> 思考块 / markdown 代码块包裹，解析 JSON */
function parseJsonRobust(raw: string): any {
  let text = raw.trim();
  // 去除思考模型可能内联输出的 <think>…</think> 块
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  // 去除 markdown 代码块包裹
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  // 找第一个 { 和最后一个 }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start >= 0 && end > start) {
    text = text.slice(start, end + 1);
  }
  return JSON.parse(text);
}

/** 主入口：分析调用示例（cfg 不传/缺字段时回退到内置 DeepSeek 默认） */
export async function analyzeCallExample(
  rawExample: string,
  cfg?: Partial<ThinkingModelConfig> | null,
): Promise<AnalyzeResult> {
  if (!rawExample?.trim()) {
    throw new Error('调用示例不能为空');
  }

  const merged: ThinkingModelConfig = {
    ...DEFAULT_THINKING_MODEL,
    ...(cfg ?? {}),
  };
  if (!merged.endpoint || !merged.apiKey || !merged.model) {
    throw new Error('思考模型配置不完整（需要 endpoint / apiKey / model），请在系统设置中检查');
  }

  const content = await callThinkingModelChat(SYSTEM_PROMPT, rawExample, merged);

  let parsed: any;
  try {
    parsed = parseJsonRobust(content);
  } catch (e: any) {
    throw new Error(`思考模型返回不是有效 JSON: ${(content as string).slice(0, 300)}`);
  }

  if (!parsed.template || !Array.isArray(parsed.variables)) {
    throw new Error('思考模型返回结构无效，缺少 template 或 variables');
  }

  // 规范化变量字段
  const variables = parsed.variables.map((v: any) => ({
    name: String(v.name ?? '').trim(),
    isDynamic: !!v.isDynamic,
    globalValue: v.globalValue ? String(v.globalValue) : '',
    isSecret: !!v.isSecret,
  })).filter((v: any) => v.name);

  // 默认响应类型 base64
  const responseImageType = (parsed.responseImageType ?? 'base64') as 'base64' | 'url' | 'binary' | 'text';
  const responseImagePath = String(parsed.responseImagePath ?? '');

  return {
    template: String(parsed.template),
    variables,
    responseImagePath,
    responseImageType,
  };
}
