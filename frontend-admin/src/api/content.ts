import client from './client';

// ===== 场景 =====
export interface SceneListItem {
  id: string;
  slug: string;
  name: string;
  groupName: string;
  sceneGroupId?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  sceneImageUrl?: string | null;
  sceneImagePrompt?: string | null;
  iconKind?: string | null;
  themeColor?: string | null;
  isDefault: boolean;
  unlockHint?: string | null;
  isLocked?: boolean;
  unlockConditions?: { type: 'after_groups'; groupIds: string[] } | null;
  mapPosition?: { x: number; y: number } | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export const scenesApi = {
  list: (params?: { keyword?: string; status?: string }): Promise<SceneListItem[]> =>
    client.get('/admin/scenes', { params }),
  detail: (id: string): Promise<SceneListItem & { items: any[] }> =>
    client.get(`/admin/scenes/${id}`),
  create: (data: any): Promise<SceneListItem> => client.post('/admin/scenes', data),
  update: (id: string, data: any): Promise<SceneListItem> =>
    client.patch(`/admin/scenes/${id}`, data),
  remove: (id: string): Promise<SceneListItem> => client.delete(`/admin/scenes/${id}`),
  publish: (id: string): Promise<SceneListItem> => client.post(`/admin/scenes/${id}/publish`, {}),
  archive: (id: string): Promise<SceneListItem> => client.post(`/admin/scenes/${id}/archive`, {}),
  batchSort: (items: Array<{ id: string; sortOrder: number }>) =>
    client.patch('/admin/scenes/batch/sort-order', { items }),
  updateLayouts: (
    id: string,
    layouts: Array<{ itemId: string; x: number; y: number; width: number; height: number }>
  ) => client.patch(`/admin/scenes/${id}/item-layouts`, layouts),
};

// ===== 物品 =====
export interface ItemListItem {
  id: string;
  slug: string;
  name: string;
  sceneId: string;
  scene?: { id: string; name: string; slug: string };
  coverUrl?: string | null;
  itemImageUrl?: string | null;
  iconUrl?: string | null;
  svgSymbolId?: string | null;
  shortDesc: string;
  principleByLevel?: Record<'L1' | 'L2' | 'L3', string>;
  videoTitle?: string | null;
  videoDurationSec?: number | null;
  principleVideoUrl?: string | null;
  explodedImageUrl?: string | null;
  parts?: any[] | null;
  scenePosition?: { x: number; y: number; width: number; height: number } | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { knowledgePoints: number };
}

export const itemsApi = {
  list: (params?: {
    keyword?: string;
    status?: string;
    sceneId?: string;
  }): Promise<ItemListItem[]> => client.get('/admin/items', { params }),
  detail: (id: string): Promise<ItemListItem & { knowledgePoints: any[] }> =>
    client.get(`/admin/items/${id}`),
  create: (data: any) => client.post('/admin/items', data),
  update: (id: string, data: any) => client.patch(`/admin/items/${id}`, data),
  remove: (id: string) => client.delete(`/admin/items/${id}`),
  publish: (id: string) => client.post(`/admin/items/${id}/publish`, {}),
  archive: (id: string) => client.post(`/admin/items/${id}/archive`, {}),
  batchSort: (items: Array<{ id: string; sortOrder: number }>) =>
    client.patch('/admin/items/batch/sort-order', { items }),
  setKnowledgePoints: (id: string, knowledgePointIds: string[]) =>
    client.post(`/admin/items/${id}/knowledge-points`, { knowledgePointIds }),
};

// ===== 知识点 =====
export interface KnowledgeListItem {
  id: string;
  slug: string;
  name: string;
  subject: 'PHYSICS' | 'CHEMISTRY' | 'BIOLOGY' | 'GEOGRAPHY' | 'OTHER';
  difficulty: 'L1' | 'L2' | 'L3';
  summary?: string | null;
  content: string;
  illustrationUrl?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  createdAt: string;
  updatedAt: string;
  _count?: { items: number };
}

export const knowledgeApi = {
  list: (params?: {
    keyword?: string;
    status?: string;
    subject?: string;
    difficulty?: string;
  }): Promise<KnowledgeListItem[]> => client.get('/admin/knowledge-points', { params }),
  detail: (id: string): Promise<KnowledgeListItem & { items: any[] }> =>
    client.get(`/admin/knowledge-points/${id}`),
  create: (data: any) => client.post('/admin/knowledge-points', data),
  update: (id: string, data: any) => client.patch(`/admin/knowledge-points/${id}`, data),
  remove: (id: string) => client.delete(`/admin/knowledge-points/${id}`),
  publish: (id: string) => client.post(`/admin/knowledge-points/${id}/publish`, {}),
  archive: (id: string) => client.post(`/admin/knowledge-points/${id}/archive`, {}),
};

// ===== 实验 =====
export interface ExperimentListItem {
  id: string;
  slug: string;
  name: string;
  difficulty: 'L1' | 'L2' | 'L3';
  durationMin: number;
  needParent: boolean;
  materialType?: string | null;
  description: string;
  materialsHome?: string[] | null;
  materialsKit?: string[] | null;
  safety?: string | null;
  coverUrl?: string | null;
  videoUrl?: string | null;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  _count?: { items: number; knowledgePoints: number };
}

export interface ExperimentDetail extends ExperimentListItem {
  items: Array<{ itemId: string; item: { id: string; slug: string; name: string } }>;
  knowledgePoints: Array<{
    knowledgePointId: string;
    knowledgePoint: { id: string; slug: string; name: string; subject: string; difficulty: string };
  }>;
}

export const experimentsApi = {
  list: (params?: { keyword?: string; status?: string; difficulty?: string }): Promise<ExperimentListItem[]> =>
    client.get('/admin/experiments', { params }),
  detail: (id: string): Promise<ExperimentDetail> => client.get(`/admin/experiments/${id}`),
  create: (data: any): Promise<ExperimentDetail> => client.post('/admin/experiments', data),
  update: (id: string, data: any): Promise<ExperimentDetail> => client.patch(`/admin/experiments/${id}`, data),
  remove: (id: string) => client.delete(`/admin/experiments/${id}`),
  publish: (id: string) => client.post(`/admin/experiments/${id}/publish`, {}),
  archive: (id: string) => client.post(`/admin/experiments/${id}/archive`, {}),
};

// ===== 小测题 =====
export interface QuizQuestion {
  id: string;
  knowledgePointId: string;
  question: string;
  choices: string[];
  correctIndex: number;
  explanation?: string | null;
  difficulty: 'L1' | 'L2' | 'L3';
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  sortOrder: number;
}

export const quizApi = {
  list: (kpId: string): Promise<QuizQuestion[]> =>
    client.get(`/admin/knowledge-points/${kpId}/quiz-questions`),
  create: (kpId: string, data: any): Promise<QuizQuestion> =>
    client.post(`/admin/knowledge-points/${kpId}/quiz-questions`, data),
  update: (id: string, data: any): Promise<QuizQuestion> =>
    client.patch(`/admin/quiz-questions/${id}`, data),
  remove: (id: string) => client.delete(`/admin/quiz-questions/${id}`),
};

// ===== 知识点关系（知识网络） =====
export const kpRelationsApi = {
  get: (kpId: string): Promise<{ relatedIds: string[] }> =>
    client.get(`/admin/knowledge-points/${kpId}/relations`),
  set: (kpId: string, relatedIds: string[]): Promise<{ ok: boolean; count: number }> =>
    client.put(`/admin/knowledge-points/${kpId}/relations`, { relatedIds }),
};

// ===== 上传 =====
export const mediaApi = {
  upload: async (
    file: File,
    purpose: string
  ): Promise<{ url: string; objectKey: string; size: number; mime: string }> => {
    const form = new FormData();
    form.append('file', file);
    return client.post(`/admin/media/upload?purpose=${purpose}`, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};
