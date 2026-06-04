import client from './client';

export interface PublicScene {
  id: string;
  slug: string;
  name: string;
  groupName: string;
  description?: string | null;
  coverUrl?: string | null;
  sceneImageUrl?: string | null;
  iconKind?: string | null;
  themeColor?: string | null;
  status?: string | null;
  isDefault: boolean;
  unlockHint?: string | null;
  mapPosition?: { x: number; y: number } | null;
  _count?: { items: number };
  /** 轻量物品数据，供前端计算探索度 */
  items?: Array<{
    slug: string;
    videoDurationSec?: number | null;
    knowledgePoints: Array<{ knowledgePoint: { slug: string } }>;
  }>;
}

export interface PublicSceneDetail extends PublicScene {
  items: Array<{
    id: string;
    slug: string;
    name: string;
    shortDesc: string;
    itemImageUrl?: string | null;
    svgSymbolId?: string | null;
    videoDurationSec?: number | null;
    scenePosition?: { x: number; y: number; width?: number; height?: number } | null;
    knowledgePoints: Array<{
      knowledgePoint: {
        id: string;
        slug: string;
        name: string;
        subject: string;
        difficulty: string;
      };
    }>;
  }>;
}

export interface PublicKnowledge {
  id: string;
  slug: string;
  name: string;
  subject: string;
  difficulty: string;
  summary?: string | null;
  illustrationUrl?: string | null;
}

export interface PublicKnowledgeDetail extends PublicKnowledge {
  content: string;
  illustrationUrl?: string | null;
  items: Array<{
    item: {
      id: string;
      slug: string;
      name: string;
      shortDesc: string;
      svgSymbolId?: string | null;
      itemImageUrl?: string | null;
      scene: { slug: string; name: string };
    };
  }>;
  related: PublicKnowledge[];
}

export interface PublicExperiment {
  id: string;
  slug: string;
  name: string;
  difficulty: string;
  durationMin: number;
  needParent: boolean;
  materialType?: string | null;
  description: string;
  materialsHome?: string[] | null;
  materialsKit?: string[] | null;
  safety?: string | null;
  coverUrl?: string | null;
  videoUrl?: string | null;
  knowledgePoints: Array<{
    knowledgePoint: {
      id: string;
      slug: string;
      name: string;
      subject: string;
      difficulty: string;
    };
  }>;
  items: Array<{
    item: { id: string; slug: string; name: string };
  }>;
}

/** 物品仓库列表项 */
export interface PublicItem {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  itemImageUrl?: string | null;
  svgSymbolId?: string | null;
  videoDurationSec?: number | null;
  scene: {
    id: string;
    slug: string;
    name: string;
    groupName: string;
    iconKind?: string | null;
    themeColor?: string | null;
  };
  knowledgePoints: Array<{
    sortOrder: number;
    knowledgePoint: {
      id: string;
      slug: string;
      name: string;
      subject: string;
      difficulty: string;
    };
  }>;
}

export interface PublicItemDetail {
  id: string;
  slug: string;
  name: string;
  shortDesc: string;
  principleByLevel: Record<'L1' | 'L2' | 'L3', string>;
  videoTitle?: string | null;
  videoDurationSec?: number | null;
  principleVideoUrl?: string | null;
  explodedImageUrl?: string | null;
  itemImageUrl?: string | null;
  parts?: Array<{ no: number; name: string; desc: string; x: number; y: number }> | null;
  svgSymbolId?: string | null;
  scene: { id: string; slug: string; name: string; groupName: string };
  knowledgePoints: Array<{
    sortOrder: number;
    knowledgePoint: {
      id: string;
      slug: string;
      name: string;
      subject: string;
      difficulty: string;
      summary?: string | null;
      illustrationUrl?: string | null;
    };
  }>;
}

export interface PublicStats {
  scenes: number;
  items: number;
  knowledgePoints: number;
  experiments: number;
}

export const contentApi = {
  stats: (): Promise<PublicStats> => client.get('/stats'),
  scenes: (): Promise<PublicScene[]> => client.get('/scenes'),
  sceneBySlug: (slug: string): Promise<PublicSceneDetail> => client.get(`/scenes/${slug}`),
  items: (): Promise<PublicItem[]> => client.get('/items'),
  itemBySlug: (slug: string): Promise<PublicItemDetail> => client.get(`/items/${slug}`),
  knowledgeList: (params?: {
    subject?: string;
    difficulty?: string;
    keyword?: string;
  }): Promise<PublicKnowledge[]> => client.get('/knowledge', { params }),
  knowledgeBySlug: (slug: string): Promise<PublicKnowledgeDetail> =>
    client.get(`/knowledge/${slug}`),
  knowledgeNetwork: () => client.get('/knowledge/network'),
  experimentList: (): Promise<PublicExperiment[]> => client.get('/public/experiments'),
  experimentBySlug: (slug: string): Promise<PublicExperiment> => client.get(`/public/experiments/${slug}`),
};
