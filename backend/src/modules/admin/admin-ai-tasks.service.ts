import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';
import { LocalStorageService } from '../media/local-storage.service';
import { runTemplate, extractVariables } from './ai-template-runner';
import { AdminSettingsService } from './admin-settings.service';
import { Buffer } from 'node:buffer';

interface ModelVariable {
  name: string;
  isDynamic: boolean;
  globalValue?: string;
  isSecret?: boolean;
}

interface ModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  modalType?: 'chat' | 'image' | 'video' | 'audio';
  requestTemplate?: string;
  responseImagePath?: string;
  responseImageType?: 'base64' | 'url' | 'binary' | 'text';
  variables?: ModelVariable[];
  // 兼容老格式
  provider?: string;
  endpoint?: string;
  model?: string;
}

@Injectable()
export class AdminAiTasksService {
  private readonly logger = new Logger(AdminAiTasksService.name);

  constructor(
    private prisma: PrismaService,
    private storage: LocalStorageService,
    private settings: AdminSettingsService,
  ) {}

  async list(params: { status?: string; entityType?: string; entityId?: string; adminId?: string }) {
    const { status, entityType, entityId, adminId } = params;
    return this.prisma.aiTask.findMany({
      where: {
        ...(status ? { status } : {}),
        ...(entityType ? { entityType } : {}),
        ...(entityId ? { entityId } : {}),
        ...(adminId ? { adminId } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async getOne(id: string) {
    const task = await this.prisma.aiTask.findUnique({ where: { id } });
    if (!task) throw new BusinessException(ERROR_CODES.NOT_FOUND, '任务不存在');
    return task;
  }

  async create(data: {
    entityType: string; entityId: string; purpose: string;
    prompt: string; modelId: string; adminId: string;
    /** 可选：调用时填充的额外动态变量（除 prompt 外） */
    dynamicValues?: Record<string, string>;
  }) {
    const task = await this.prisma.aiTask.create({
      data: {
        entityType: data.entityType, entityId: data.entityId,
        purpose: data.purpose, prompt: data.prompt,
        modelId: data.modelId, adminId: data.adminId,
        status: 'PENDING', progress: 0,
      },
    });
    this.runTaskAsync(task.id, data.dynamicValues).catch((e) =>
      this.logger.error(`Task ${task.id} failed: ${e.message}`)
    );
    return task;
  }

  async cancel(id: string) {
    const task = await this.getOne(id);
    if (task.status === 'DONE' || task.status === 'FAILED') return task;
    return this.prisma.aiTask.update({
      where: { id },
      data: { status: 'FAILED', errorMessage: '已取消' },
    });
  }

  /**
   * 测试调用
   * - modelId：要测试的模型
   * - dynamicValues：用户填的所有动态变量（包括 prompt）
   */
  async test(modelId: string, dynamicValues: Record<string, string>): Promise<{
    url?: string;
    text?: string;
    modalType?: string;
  }> {
    const model = await this.loadModel(modelId);
    if (!model) throw new BusinessException(ERROR_CODES.NOT_FOUND, `模型 ${modelId} 不存在`);
    if (!model.requestTemplate) throw new Error('该模型未配置调用模板');
    if (model.responseImageType !== 'binary' && !model.responseImagePath) {
      throw new Error('该模型未配置响应数据路径');
    }

    const variables = this.buildVariables(model, dynamicValues);
    this.assertAllVariablesPresent(model.requestTemplate, variables);

    const result = await runTemplate({
      template: model.requestTemplate,
      variables,
      responseImagePath: model.responseImagePath ?? '',
      responseImageType: model.responseImageType ?? 'base64',
    });

    // text 模式：直接返回文本
    if (result.text !== undefined) {
      return { text: result.text, modalType: model.modalType ?? 'chat' };
    }

    // image/video/binary 模式：存盘后返回 URL
    if (!result.buffer) {
      throw new Error('未返回任何数据');
    }
    const saved = await this.storage.save('ai-test', {
      buffer: result.buffer,
      mimetype: result.mime,
      originalname: `test_${Date.now()}.png`,
      size: result.buffer.length,
    } as any);
    return { url: saved.url, modalType: model.modalType ?? 'image' };
  }

  // ─────────── 任务执行 ───────────
  private async runTaskAsync(taskId: string, extraDynamic?: Record<string, string>) {
    const task = await this.prisma.aiTask.findUnique({ where: { id: taskId } });
    if (!task) return;
    try {
      await this.updateTask(taskId, { status: 'RUNNING', progress: 5 });
      const model = await this.loadModel(task.modelId);
      if (!model) throw new Error(`模型 ${task.modelId} 不存在`);
      if (!model.enabled) throw new Error(`模型 ${model.name} 未启用`);

      if (!model.requestTemplate) {
        throw new Error(`模型 ${model.name} 未配置「调用模板」，请到「系统设置 → 模型管理」补全`);
      }
      // binary 类型不需要 responseImagePath；其他类型需要
      if (model.responseImageType !== 'binary' && !model.responseImagePath) {
        throw new Error(`模型 ${model.name} 未配置「响应图片路径」`);
      }

      const dynamic = { prompt: task.prompt, ...(extraDynamic ?? {}) };
      const variables = this.buildVariables(model, dynamic);
      this.assertAllVariablesPresent(model.requestTemplate, variables);

      const result = await runTemplate({
        template: model.requestTemplate,
        variables,
        responseImagePath: model.responseImagePath ?? '',
        responseImageType: model.responseImageType ?? 'base64',
        onProgress: (p) => { this.updateTask(taskId, { progress: p }).catch(() => {}); },
      });

      let resultUrl: string;
      if (result.text !== undefined) {
        // 文本模式：把文本作为 dataURL 写入（生图任务通常不会走这里，但保持容错）
        resultUrl = `data:text/plain;base64,${Buffer.from(result.text, 'utf8').toString('base64')}`;
      } else if (result.buffer) {
        const saved = await this.storage.save(task.purpose, {
          buffer: result.buffer, mimetype: result.mime,
          originalname: `${taskId}.png`, size: result.buffer.length,
        } as any);
        resultUrl = saved.url;
      } else {
        throw new Error('模型未返回任何数据');
      }

      await this.updateTask(taskId, { status: 'DONE', progress: 100, resultUrl });
    } catch (e: any) {
      this.logger.error(`Task ${taskId} failed: ${e?.message ?? e}`);
      await this.updateTask(taskId, {
        status: 'FAILED',
        errorMessage: e?.message ?? String(e),
      }).catch(() => {});
    }
  }

  /** 合并：全局变量值 + 动态变量默认值（globalValue）+ 运行时动态变量 */
  private buildVariables(model: ModelConfig, dynamic: Record<string, string>): Record<string, string> {
    const vars: Record<string, string> = {};
    // 1. 所有声明过的变量先用 globalValue 兜底
    //    （全局变量 = 固定值；动态变量 = 默认值，如 size 默认 "1280*1280"）
    for (const v of model.variables ?? []) {
      if (v.globalValue !== undefined && v.globalValue !== null) {
        vars[v.name] = String(v.globalValue);
      }
    }
    // 2. 运行时动态变量覆盖（空字符串视为"未填"，保留默认值）
    for (const [k, val] of Object.entries(dynamic)) {
      if (val !== undefined && val !== null && val !== '') vars[k] = String(val);
    }
    return vars;
  }

  /** 检查模板中所有变量是否都有值（允许显式空字符串，如 negativePrompt 默认为空） */
  private assertAllVariablesPresent(template: string, vars: Record<string, string>) {
    const need = extractVariables(template);
    const missing = need.filter((n) => vars[n] === undefined);
    if (missing.length > 0) {
      throw new Error(`以下变量未提供值：${missing.join(', ')}`);
    }
  }

  // ─── helpers ───
  private async loadModel(modelId: string): Promise<ModelConfig | null> {
    // 通过 SettingsService 取 → 自动 fallback 到 DEFAULT_SETTINGS（含内置 picsum）
    const models = (await this.settings.get('ai_models')) as ModelConfig[] | null;
    const arr = Array.isArray(models) ? models : [];
    const m = arr.find((m) => m.id === modelId);
    if (!m) return null;
    // 兼容老格式：variables 是 Record 时转为数组
    if (m.variables && !Array.isArray(m.variables)) {
      const rec = m.variables as unknown as Record<string, string>;
      m.variables = Object.entries(rec).map(([name, globalValue]) => ({
        name, isDynamic: false, globalValue, isSecret: name.toLowerCase().includes('key'),
      }));
    }
    return m;
  }

  private updateTask(id: string, data: any) {
    return this.prisma.aiTask.update({ where: { id }, data });
  }
}
