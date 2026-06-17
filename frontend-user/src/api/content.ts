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
  isLocked?: boolean;
  unlockConditions?: { type: 'after_groups'; groupIds: string[] } | null;
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

/** 知识网络节点 + 边 */
export interface PublicKnowledgeNetwork {
  nodes: Array<{
    id: string;
    slug: string;
    name: string;
    subject: string;
    difficulty: string;
    summary?: string | null;
    illustrationUrl?: string | null;
    itemCount: number;
  }>;
  edges: Array<{ fromId: string; toId: string }>;
}

export interface PublicKnowledgeDetail extends PublicKnowledge {
  content: string;
  illustrationUrl?: string | null;
  videoTitle?: string | null;
  videoDurationSec?: number | null;
  videoUrl?: string | null;
  items: Array<{
    item: {
      id: string;
      slug: string;
      name: string;
      shortDesc: string;
      svgSymbolId?: string | null;
      itemImageUrl?: string | null;
      iconUrl?: string | null;
      scene: { slug: string; name: string };
    };
  }>;
  related: PublicKnowledge[];
  quizQuestions: Array<{
    id: string;
    question: string;
    choices: string[];
    difficulty: 'L1' | 'L2' | 'L3';
  }>;
  experiments: Array<{ experiment: PublicExperimentBrief }>;
}

/** 小测判分结果（提交答案后服务端返回） */
export interface QuizAnswerResult {
  correct: boolean;
  correctIndex: number;
  explanation?: string | null;
}

/** 详情页用的简洁实验类型 */
export interface PublicExperimentBrief {
  id: string;
  slug: string;
  name: string;
  difficulty: string;
  durationMin: number;
  needParent: boolean;
  materialType?: string | null;
  description: string;
  coverUrl?: string | null;
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
  experiments?: Array<{ experiment: PublicExperimentBrief }>;
}

export interface PublicStats {
  scenes: number;
  items: number;
  knowledgePoints: number;
  experiments: number;
}

/** 一级场景（用于地图渲染） */
export interface PublicSceneGroup {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  mapPosition?: { x: number; y: number; radius?: number } | null;
  iconKind?: string | null;
  themeColor?: string | null;
  sortOrder: number;
  isLocked?: boolean;
  unlockHint?: string | null;
  unlockConditions?: { type: 'after_groups'; groupIds: string[] } | null;
}

/** 世界地图设置 */
export interface PublicWorldMap {
  imageUrl?: string | null;
  imagePrompt?: string | null;
}

export const contentApi = {
  stats: (): Promise<PublicStats> => client.get('/stats'),
  scenes: (): Promise<PublicScene[]> => client.get('/scenes'),
  sceneGroups: (): Promise<PublicSceneGroup[]> => client.get('/scene-groups'),
  worldMap: (): Promise<PublicWorldMap | null> => client.get('/world-map'),
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
  knowledgeNetwork: (): Promise<PublicKnowledgeNetwork> => client.get('/knowledge/network'),
  answerQuiz: (questionId: string, choice: number): Promise<QuizAnswerResult> =>
    client.post(`/knowledge/quiz/${questionId}/answer`, { choice }),
  experimentList: (): Promise<PublicExperiment[]> => client.get('/public/experiments'),
  experimentBySlug: (slug: string): Promise<PublicExperiment> => client.get(`/public/experiments/${slug}`),
};
