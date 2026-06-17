import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { DEFAULT_THINKING_MODEL } from './llm-analyzer';

/**
 * 默认设置
 * - 内置 picsum 占位模型：开发期 / 未配真实模型时使用
 *   响应是 image/jpeg 二进制（binary 模式）
 *   后续用户可以删除或禁用，也可以编辑参数
 */
const DEFAULT_SETTINGS: Record<string, any> = {
  ai_models: [
    // ─── 内置占位图模型（开发调试 / 无 API key 也能跑通流程） ───
    {
      id: 'picsum_placeholder',
      name: 'Picsum 占位图（系统内置 · 开发调试）',
      modalType: 'image',
      enabled: true,
      requestTemplate: 'GET https://picsum.photos/seed/{{prompt}}/{{width}}/{{height}}\n',
      responseImagePath: '',
      responseImageType: 'binary',
      variables: [
        { name: 'width',  isDynamic: false, globalValue: '1024', isSecret: false },
        { name: 'height', isDynamic: false, globalValue: '1024', isSecret: false },
        // prompt 临时变量，运行时由 task.prompt 注入，作为 picsum 的 seed
        { name: 'prompt', isDynamic: true,  globalValue: '' },
      ],
    },

    // ─── GLM-5.1（智谱 AI · 对话模型 / 完整冷启动示例） ───
    // 根据用户提供的官方 curl 示例完全模板化，可一键启用调通
    {
      id: 'glm_5_1_chat',
      name: 'GLM-5.1（智谱 · 对话模型）',
      modalType: 'chat',
      enabled: true,
      requestTemplate:
        `POST {{endpoint}}\n` +
        `Content-Type: application/json\n` +
        `Authorization: Bearer {{apiKey}}\n` +
        `\n` +
        `{\n` +
        `    "model": "{{model}}",\n` +
        `    "messages": [\n` +
        `        {\n` +
        `            "role": "user",\n` +
        `            "content": "{{prompt}}"\n` +
        `        }\n` +
        `    ],\n` +
        `    "thinking": {\n` +
        `        "type": "{{thinkingType}}"\n` +
        `    },\n` +
        `    "max_tokens": {{maxTokens}},\n` +
        `    "temperature": {{temperature}}\n` +
        `}`,
      responseImagePath: 'choices[0].message.content',
      responseImageType: 'text',
      variables: [
        {
          name: 'endpoint',
          isDynamic: false,
          globalValue: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
          isSecret: false,
        },
        {
          name: 'apiKey',
          isDynamic: false,
          globalValue: '27f5d675e6e940dda9e9d18485cdf2ad.2U9t0Lx1QuJKTaIE',
          isSecret: true,
        },
        { name: 'model',        isDynamic: false, globalValue: 'glm-5.1',   isSecret: false },
        { name: 'thinkingType', isDynamic: false, globalValue: 'enabled',   isSecret: false },
        { name: 'maxTokens',    isDynamic: false, globalValue: '65536',     isSecret: false },
        { name: 'temperature',  isDynamic: false, globalValue: '1.0',       isSecret: false },
        { name: 'prompt',       isDynamic: true,  globalValue: '',          isSecret: false },
      ],
    },
  ],
  ai_default_model: 'picsum_placeholder',

  // ─── 内置思考模型（「添加模型 → 粘贴示例 → 分析变量」用的 LLM） ───
  // 冷启动默认 DeepSeek v4-pro；可在系统设置页修改，置 null 恢复默认
  ai_thinking_model: DEFAULT_THINKING_MODEL,
};

@Injectable()
export class AdminSettingsService {
  constructor(private prisma: PrismaService) {}

  async listAll() {
    const records = await this.prisma.adminSetting.findMany();
    const result: Record<string, any> = { ...DEFAULT_SETTINGS };
    for (const r of records) {
      // 只在记录有非 null 值时覆盖默认（null 视为"未设置"）
      if (r.value !== null && r.value !== undefined) {
        result[r.key] = r.value;
      }
    }
    return result;
  }

  async get(key: string) {
    const record = await this.prisma.adminSetting.findUnique({ where: { key } });
    if (record && record.value !== null && record.value !== undefined) {
      return record.value;
    }
    return DEFAULT_SETTINGS[key] ?? null;
  }

  async set(key: string, value: any) {
    // value=null → 删除记录，恢复默认
    if (value === null || value === undefined) {
      await this.prisma.adminSetting.deleteMany({ where: { key } });
      return { key, value: null, deleted: true };
    }
    return this.prisma.adminSetting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }
}
