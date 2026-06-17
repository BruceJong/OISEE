import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

/**
 * 级联可见性：场景可见要求其所属一级场景已发布（或无所属，兼容历史数据）；
 * 物品可见要求其所属场景满足同样条件。
 */
const VISIBLE_SCENE_WHERE = {
  status: 'PUBLISHED' as const,
  deletedAt: null,
  OR: [
    { sceneGroupId: null },
    { sceneGroup: { status: 'PUBLISHED' as const, deletedAt: null } },
  ],
};

const VISIBLE_ITEM_WHERE = {
  status: 'PUBLISHED' as const,
  deletedAt: null,
  scene: VISIBLE_SCENE_WHERE,
};

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async listScenes() {
    // 返回 _count + 轻量 items（slug / videoDurationSec / KP slugs）供前端计算探索度
    return this.prisma.scene.findMany({
      where: VISIBLE_SCENE_WHERE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        _count: { select: { items: true } },
        items: {
          where: { status: 'PUBLISHED', deletedAt: null },
          select: {
            slug: true,
            videoDurationSec: true,
            knowledgePoints: {
              select: { knowledgePoint: { select: { slug: true } } },
            },
          },
        },
      },
    });
  }

  async getSceneBySlug(slug: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { slug, ...VISIBLE_SCENE_WHERE },
      include: {
        items: {
          where: { status: 'PUBLISHED', deletedAt: null },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          include: {
            knowledgePoints: {
              include: {
                knowledgePoint: {
                  select: { id: true, slug: true, name: true, subject: true, difficulty: true },
                },
              },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });
    if (!scene) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '场景不存在或未发布');
    }
    return scene;
  }

  async listItems() {
    // 物品仓库列表：每项带 scene 信息（含所属 L2 + 通过 groupName 推断 L1）+ KP 轻量数据
    return this.prisma.item.findMany({
      where: VISIBLE_ITEM_WHERE,
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        scene: {
          select: {
            id: true, slug: true, name: true, groupName: true,
            iconKind: true, themeColor: true,
          },
        },
        knowledgePoints: {
          orderBy: { sortOrder: 'asc' },
          include: {
            knowledgePoint: {
              select: { id: true, slug: true, name: true, subject: true, difficulty: true },
            },
          },
        },
      },
    });
  }

  async getItemBySlug(slug: string) {
    const item = await this.prisma.item.findFirst({
      where: { slug, ...VISIBLE_ITEM_WHERE },
      include: {
        scene: { select: { id: true, slug: true, name: true, groupName: true } },
        knowledgePoints: {
          orderBy: { sortOrder: 'asc' },
          include: {
            knowledgePoint: {
              select: {
                id: true,
                slug: true,
                name: true,
                subject: true,
                difficulty: true,
                summary: true,
                illustrationUrl: true,
              },
            },
          },
        },
        experiments: {
          where: { experiment: { status: 'PUBLISHED', deletedAt: null } },
          select: {
            experiment: {
              select: {
                id: true, slug: true, name: true,
                difficulty: true, durationMin: true, needParent: true,
                materialType: true, description: true, coverUrl: true,
              },
            },
          },
        },
      },
    });
    if (!item) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '物品不存在或未发布');
    }
    return item;
  }

  async listKnowledge(params: { subject?: string; difficulty?: string; keyword?: string }) {
    const { subject, difficulty, keyword } = params;
    return this.prisma.knowledgePoint.findMany({
      where: {
        status: 'PUBLISHED',
        deletedAt: null,
        ...(subject ? { subject: subject as any } : {}),
        ...(difficulty ? { difficulty: difficulty as any } : {}),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { summary: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ difficulty: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async getKnowledgeBySlug(slug: string) {
    const kp = await this.prisma.knowledgePoint.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        items: {
          where: { item: VISIBLE_ITEM_WHERE },
          include: {
            item: {
              select: {
                id: true,
                slug: true,
                name: true,
                shortDesc: true,
                svgSymbolId: true,
                itemImageUrl: true,
                iconUrl: true,
                scene: { select: { slug: true, name: true } },
              },
            },
          },
        },
        relatedFrom: {
          include: {
            to: { select: { id: true, slug: true, name: true, subject: true, difficulty: true, summary: true, illustrationUrl: true } },
          },
        },
        relatedTo: {
          include: {
            from: { select: { id: true, slug: true, name: true, subject: true, difficulty: true, summary: true, illustrationUrl: true } },
          },
        },
        quizQuestions: {
          where: { status: 'PUBLISHED' },
          orderBy: { sortOrder: 'asc' },
          // 注意：correctIndex / explanation 不下发，判分走 POST /knowledge/quiz/:id/answer
          select: {
            id: true,
            question: true,
            choices: true,
            difficulty: true,
          },
        },
        experiments: {
          where: { experiment: { status: 'PUBLISHED', deletedAt: null } },
          select: {
            experiment: {
              select: {
                id: true, slug: true, name: true,
                difficulty: true, durationMin: true, needParent: true,
                materialType: true, description: true, coverUrl: true,
              },
            },
          },
        },
      },
    });
    if (!kp) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '知识点不存在或未发布');
    }

    // 合并双向关联为一个列表
    const related = [
      ...kp.relatedFrom.map((r) => r.to),
      ...kp.relatedTo.map((r) => r.from),
    ];

    return {
      ...kp,
      related,
      relatedFrom: undefined,
      relatedTo: undefined,
    };
  }

  /**
   * 小测判分：提交某题答案，返回对错 + 正确选项 + 解析。
   * 答案只在用户提交后下发，避免在题目接口里明文暴露。
   */
  async answerQuizQuestion(questionId: string, choice: number) {
    const q = await this.prisma.quizQuestion.findFirst({
      where: {
        id: questionId,
        status: 'PUBLISHED',
        knowledgePoint: { status: 'PUBLISHED', deletedAt: null },
      },
      select: { correctIndex: true, explanation: true, choices: true },
    });
    if (!q) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '题目不存在或未发布');
    }
    const choiceCount = Array.isArray(q.choices) ? (q.choices as unknown[]).length : 4;
    if (!Number.isInteger(choice) || choice < 0 || choice >= choiceCount) {
      throw new BusinessException(ERROR_CODES.INVALID_PARAMS, '无效的选项');
    }
    return {
      correct: choice === q.correctIndex,
      correctIndex: q.correctIndex,
      explanation: q.explanation,
    };
  }

  async listExperiments() {
    return this.prisma.experiment.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
      orderBy: [{ difficulty: 'asc' }, { sortOrder: 'asc' }],
      include: {
        knowledgePoints: {
          include: {
            knowledgePoint: { select: { id: true, slug: true, name: true, subject: true, difficulty: true } },
          },
        },
        items: {
          include: {
            item: { select: { id: true, slug: true, name: true } },
          },
        },
      },
    });
  }

  async getExperimentBySlug(slug: string) {
    const exp = await this.prisma.experiment.findFirst({
      where: { slug, status: 'PUBLISHED', deletedAt: null },
      include: {
        knowledgePoints: {
          include: { knowledgePoint: true },
        },
        items: {
          include: { item: { select: { id: true, slug: true, name: true, itemImageUrl: true } } },
        },
      },
    });
    if (!exp) {
      throw new BusinessException(ERROR_CODES.NOT_FOUND, '实验不存在或未发布');
    }
    return exp;
  }

  async getStats() {
    const [scenes, items, knowledgePoints, experiments] = await Promise.all([
      this.prisma.scene.count({ where: VISIBLE_SCENE_WHERE }),
      this.prisma.item.count({ where: VISIBLE_ITEM_WHERE }),
      this.prisma.knowledgePoint.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
      this.prisma.experiment.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    ]);
    return { scenes, items, knowledgePoints, experiments };
  }

  async getKnowledgeNetwork() {
    const [rawNodes, edges] = await Promise.all([
      this.prisma.knowledgePoint.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true,
          slug: true,
          name: true,
          subject: true,
          difficulty: true,
          summary: true,
          illustrationUrl: true,
          // 关联物品数 → 节点大小（仅计可见物品）
          _count: { select: { items: { where: { item: VISIBLE_ITEM_WHERE } } } },
        },
      }),
      this.prisma.knowledgeRelation.findMany({
        select: { fromId: true, toId: true },
      }),
    ]);
    const nodes = rawNodes.map((n) => ({
      id: n.id,
      slug: n.slug,
      name: n.name,
      subject: n.subject,
      difficulty: n.difficulty,
      summary: n.summary,
      illustrationUrl: n.illustrationUrl,
      itemCount: n._count.items,
    }));
    return { nodes, edges };
  }
}
