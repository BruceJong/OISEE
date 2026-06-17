/**
 * AI 调用模板执行器
 *
 * 用户在管理后台填入"调用示例"，例如：
 *
 *   POST {{endpoint}}
 *   Authorization: Bearer {{apiKey}}
 *   Content-Type: application/json
 *
 *   {
 *     "model": "{{model}}",
 *     "prompt": "{{prompt}}",
 *     "n": 1,
 *     "size": "{{size}}",
 *     "response_format": "b64_json"
 *   }
 *
 * 本执行器：
 *  1. 解析模板：METHOD URL / headers / body
 *  2. 用提供的变量替换 {{xxx}}
 *  3. 发送 HTTP 请求
 *  4. 按用户配置的 path 从响应里提取图片（base64 / url）
 *  5. 返回 Buffer 给上层保存到本地存储
 */

import { Buffer } from 'node:buffer';

export interface TemplateRunInput {
  template: string;
  variables: Record<string, string>;
  /** 形如 "data[0].b64_json"；当 type='binary' 时此字段无意义 */
  responseImagePath: string;
  /**
   * - base64: 从 JSON 路径取 base64 字符串 → 解码
   * - url:    从 JSON 路径取 URL → 二次下载
   * - binary: 响应体本身就是图片二进制（如 picsum / 直接返回图片的 API）
   * - text:   从 JSON 路径取纯文本（chat 模型用）
   */
  responseImageType: 'base64' | 'url' | 'binary' | 'text';
  onProgress?: (p: number) => void;
}

export interface TemplateRunOutput {
  /** 二进制结果（图片/视频）— text 模式下为空 */
  buffer?: Buffer;
  /** 文本结果（chat 模式下使用） */
  text?: string;
  mime: string;
}

/** 提取所有 {{xxx}} 变量名（去重） */
export function extractVariables(template: string): string[] {
  if (!template) return [];
  const matches = Array.from(template.matchAll(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g));
  return Array.from(new Set(matches.map((m) => m[1] as string)));
}

/** 用变量替换模板中的 {{xxx}}（不存在的变量保持原样） */
export function renderTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{\s*([a-zA-Z_][\w]*)\s*\}\}/g, (match, name, offset: number) => {
    const v = vars[name];
    if (v === undefined || v === null) return '';
    const s = String(v);
    // 占位符两侧是双引号 → JSON 字符串上下文：转义特殊字符，
    // 避免 prompt 中的引号/换行/反斜杠打碎请求体 JSON
    const before = template[offset - 1];
    const after = template[offset + match.length];
    if (before === '"' && after === '"') {
      return s
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '\\r')
        .replace(/\t/g, '\\t');
    }
    return s;
  });
}

/** 解析 HTTP 报文 */
interface ParsedRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

function parseHttpRequest(raw: string): ParsedRequest {
  const text = raw.replace(/\r\n/g, '\n').trim();
  const lines = text.split('\n');
  if (lines.length === 0) throw new Error('模板为空');

  // 第一行：METHOD URL
  const startLine = (lines[0] ?? '').trim();
  const [method, ...urlParts] = startLine.split(/\s+/);
  if (!method || urlParts.length === 0) {
    throw new Error(`无法解析请求行："${startLine}"。请使用形如 "POST {{endpoint}}" 的格式`);
  }
  const url = urlParts.join(' ');

  // 后续行：headers，直到空行或 body 开始（JSON {）
  const headers: Record<string, string> = {};
  let i = 1;
  for (; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.trim() === '') {
      i++;
      break;
    }
    // 如果遇到 JSON body 开始（没有冒号或以 { 开头），停下
    const trimmed = line.trim();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) break;
    const colon = line.indexOf(':');
    if (colon < 0) break;
    const key = line.slice(0, colon).trim();
    const value = line.slice(colon + 1).trim();
    if (key) headers[key] = value;
  }

  // 剩余行是 body
  const body = lines.slice(i).join('\n').trim();

  return { method: method.toUpperCase(), url, headers, body: body || undefined };
}

/** 简易 JSONPath：支持 "a.b[0].c" 这种点+下标访问 */
function getByPath(obj: any, path: string): any {
  if (!path) return obj;
  const tokens = path
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
  let cur: any = obj;
  for (const t of tokens) {
    if (cur === null || cur === undefined) return undefined;
    cur = cur[t];
  }
  return cur;
}

/** 执行模板 */
export async function runTemplate(input: TemplateRunInput): Promise<TemplateRunOutput> {
  const { template, variables, responseImagePath, responseImageType, onProgress } = input;

  if (!template?.trim()) throw new Error('未填写调用模板');

  // 1. 渲染模板
  const rendered = renderTemplate(template, variables);

  // 2. 解析
  const req = parseHttpRequest(rendered);

  // 3. 检查残留的 {{xxx}}（未替换的变量）
  const leftovers = extractVariables(rendered);
  if (leftovers.length > 0) {
    throw new Error(`模板中以下变量未提供值：${leftovers.join(', ')}`);
  }

  onProgress?.(25);

  // 4. 发送请求
  const resp = await fetch(req.url, {
    method: req.method,
    headers: req.headers,
    body: req.body,
  });

  onProgress?.(70);

  if (!resp.ok) {
    const txt = await resp.text().catch(() => '');
    throw new Error(`模型 API 返回 ${resp.status}: ${txt.slice(0, 300)}`);
  }

  // ─── binary 模式：响应体本身就是图片 ───
  if (responseImageType === 'binary') {
    const ct = resp.headers.get('content-type') ?? 'image/png';
    const buf = Buffer.from(await resp.arrayBuffer());
    onProgress?.(100);
    return { buffer: buf, mime: ct };
  }

  // ─── base64 / url 模式：先解析 JSON ───
  const contentType = resp.headers.get('content-type') ?? '';
  let payload: any;
  if (contentType.includes('json')) {
    payload = await resp.json();
  } else {
    payload = await resp.text();
  }

  onProgress?.(85);

  if (!responseImagePath) {
    throw new Error('未配置响应数据路径');
  }
  const raw = getByPath(payload, responseImagePath);
  if (raw === undefined || raw === null) {
    throw new Error(
      `按路径 "${responseImagePath}" 未找到字段。响应体顶层 keys：${
        typeof payload === 'object' ? Object.keys(payload).join(', ') : '(非对象)'
      }`
    );
  }

  // ─── text 模式：直接返回字符串 ───
  if (responseImageType === 'text') {
    const text = typeof raw === 'string' ? raw : JSON.stringify(raw);
    onProgress?.(100);
    return { text, mime: 'text/plain' };
  }

  // ─── base64 / url 模式 ───
  let buffer: Buffer;
  if (responseImageType === 'base64') {
    if (typeof raw !== 'string') {
      throw new Error('响应图片字段不是 base64 字符串');
    }
    const clean = raw.replace(/^data:image\/\w+;base64,/, '');
    buffer = Buffer.from(clean, 'base64');
  } else {
    // url 模式
    if (typeof raw !== 'string') {
      throw new Error('响应图片字段不是 URL 字符串');
    }
    const r = await fetch(raw);
    if (!r.ok) throw new Error(`下载图片失败：${r.status}`);
    buffer = Buffer.from(await r.arrayBuffer());
  }

  onProgress?.(100);
  return { buffer, mime: 'image/png' };
}
