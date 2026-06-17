import client from './client';

export interface SceneGroup {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  mapImageUrl?: string | null;
  mapImagePrompt?: string | null;
  mapPosition?: { x: number; y: number; radius?: number } | null;
  iconKind?: string | null;
  themeColor?: string | null;
  sortOrder: number;
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
  isLocked?: boolean;
  unlockHint?: string | null;
  unlockConditions?: { type: 'after_groups'; groupIds: string[] } | null;
  createdAt: string;
  updatedAt: string;
  _count?: { scenes: number };
  scenes?: Array<{
    id: string;
    slug: string;
    name: string;
    mapPosition: { x: number; y: number } | null;
    sceneImageUrl: string | null;
    status: string;
    sortOrder: number;
  }>;
}

export const sceneGroupsApi = {
  list: (params?: { keyword?: string; status?: string }): Promise<SceneGroup[]> =>
    client.get('/admin/scene-groups', { params }),

  detail: (id: string): Promise<SceneGroup> =>
    client.get(`/admin/scene-groups/${id}`),

  create: (data: Partial<SceneGroup>): Promise<SceneGroup> =>
    client.post('/admin/scene-groups', data),

  update: (id: string, data: Partial<SceneGroup>): Promise<SceneGroup> =>
    client.patch(`/admin/scene-groups/${id}`, data),

  remove: (id: string): Promise<SceneGroup> =>
    client.delete(`/admin/scene-groups/${id}`),

  publish: (id: string): Promise<SceneGroup> =>
    client.post(`/admin/scene-groups/${id}/publish`, {}),

  archive: (id: string): Promise<SceneGroup> =>
    client.post(`/admin/scene-groups/${id}/archive`, {}),

  batchSort: (items: Array<{ id: string; sortOrder: number }>) =>
    client.patch('/admin/scene-groups/batch/sort-order', { items }),
};
