import client from './client';

export interface AiTask {
  id: string;
  entityType: string;
  entityId: string;
  purpose: string;
  prompt: string;
  modelId: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED';
  progress: number;
  resultUrl?: string | null;
  errorMessage?: string | null;
  adminId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAiTaskParams {
  entityType: string;
  entityId: string;
  purpose: string;
  prompt: string;
  modelId: string;
  /** 除 prompt 外的动态变量值（如 size、negativePrompt）；缺省时后端用模型配置的默认值 */
  dynamicValues?: Record<string, string>;
}

export const aiTasksApi = {
  list: (params?: {
    status?: string;
    entityType?: string;
    entityId?: string;
  }): Promise<AiTask[]> => client.get('/admin/ai-tasks', { params }),

  getOne: (id: string): Promise<AiTask> =>
    client.get(`/admin/ai-tasks/${id}`),

  create: (data: CreateAiTaskParams): Promise<AiTask> =>
    client.post('/admin/ai-tasks', data),

  cancel: (id: string): Promise<AiTask> =>
    client.post(`/admin/ai-tasks/${id}/cancel`, {}),

  /** 解析调用模板，返回变量名列表 */
  parseTemplate: (template: string): Promise<{ variables: string[] }> =>
    client.post('/admin/ai-tasks/parse-template', { template }),

  /**
   * 测试调用：用动态变量值跑指定模型
   * - chat 模型返回 { text, modalType: 'chat' }
   * - image/video 模型返回 { url, modalType: 'image' | 'video' }
   */
  test: (modelId: string, dynamicValues: Record<string, string>): Promise<{
    url?: string;
    text?: string;
    modalType?: string;
  }> =>
    client.post('/admin/ai-tasks/test', { modelId, dynamicValues }),

  /**
   * 用内置思考模型（默认 DeepSeek v4-pro）智能分析原始 curl/HTTP 调用示例
   * 自动产出模板 + 变量 + 响应解析规则
   * 思考模型推理较慢，单独放宽超时（后端 120s 中断，前端给 180s 余量）
   */
  analyzeExample: (example: string): Promise<{
    template: string;
    variables: Array<{
      name: string;
      isDynamic: boolean;
      globalValue?: string;
      isSecret?: boolean;
    }>;
    responseImagePath: string;
    responseImageType: 'base64' | 'url' | 'binary' | 'text';
  }> => client.post('/admin/ai-tasks/analyze-example', { example }, { timeout: 180000 }),
};
