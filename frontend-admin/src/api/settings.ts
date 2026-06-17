import client from './client';

/**
 * 模板变量元数据
 * - name: 变量名（与模板里 {{xxx}} 对应）
 * - isDynamic: true=每次调用时填写；false=全局变量（保存在 model 上）
 * - globalValue: 当 isDynamic=false 时的固定值
 * - isSecret: 是否敏感字段（如 API Key），UI 上脱敏 + 眼睛切换
 */
export interface ModelVariable {
  name: string;
  isDynamic: boolean;
  globalValue?: string;
  isSecret?: boolean;
}

/** 模型模态类型 */
export type ModalType = 'chat' | 'image' | 'video' | 'audio';

export interface AiModelConfig {
  id: string;
  name: string;
  enabled: boolean;
  /** 模态类型（决定测试结果展示方式：chat→文本；image→图片；video→视频） */
  modalType?: ModalType;
  // ─ 通用调用模板 ─
  requestTemplate?: string;
  /** 响应中数据字段的 JSON 路径 */
  responseImagePath?: string;
  /**
   * 响应数据类型
   * - base64: JSON 字段中的 base64 字符串（图片）
   * - url:    JSON 字段中的 URL → 二次下载（图片/视频）
   * - binary: 响应体本身就是二进制（图片）
   * - text:   JSON 字段中的纯文本（chat 模型）
   */
  responseImageType?: 'base64' | 'url' | 'binary' | 'text';
  variables?: ModelVariable[];
  // ─ 兼容字段（不再主推，但保留向后兼容） ─
  provider?: string;
  endpoint?: string;
  model?: string;
}

/**
 * 内置思考模型配置（「添加模型 → 粘贴示例 → 分析变量」用的 LLM）
 * 冷启动默认 DeepSeek v4-pro；保存 null 可恢复默认
 */
export interface ThinkingModelConfig {
  name?: string;
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface AllSettings {
  ai_models: AiModelConfig[];
  ai_default_model: string;
  /** 内置思考模型（智能分析变量用） */
  ai_thinking_model?: ThinkingModelConfig;
  /** 兼容字段：旧版按 provider 存 API key 时使用，新版变量直接存在 model 里 */
  ai_api_keys_set?: Record<string, boolean>;
}

export const settingsApi = {
  listAll: (): Promise<AllSettings> =>
    client.get('/admin/settings'),

  get: (key: string): Promise<any> =>
    client.get(`/admin/settings/${key}`),

  set: (key: string, value: any): Promise<any> =>
    client.put(`/admin/settings/${key}`, { value }),
};
