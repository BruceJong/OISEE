import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async listScenes() {
    // 返回 _count + 轻量 items（slug / videoDurationSec / KP slugs）供前端计算探索度
    return this.prisma.scene.findMany({
      where: { status: 'PUBLISHED', deletedAt: null },
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
      where: { slug, status: 'PUBLISHED', deletedAt: null },
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
      where: { status: 'PUBLISHED', deletedAt: null },
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
      where: { slug, status: 'PUBLISHED', deletedAt: null },
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
          include: {
            item: {
              select: {
                id: true,
                slug: true,
                name: true,
                shortDesc: true,
                svgSymbolId: true,
                itemImageUrl: true,
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
      throw new Error('实验不存在');
    }
    return exp;
  }

  async getStats() {
    const where = { status: 'PUBLISHED' as const, deletedAt: null };
    const [scenes, items, knowledgePoints, experiments] = await Promise.all([
      this.prisma.scene.count({ where }),
      this.prisma.item.count({ where }),
      this.prisma.knowledgePoint.count({ where }),
      this.prisma.experiment.count({ where: { status: 'PUBLISHED', deletedAt: null } }),
    ]);
    return { scenes, items, knowledgePoints, experiments };
  }

  async getKnowledgeNetwork() {
    const [nodes, edges] = await Promise.all([
      this.prisma.knowledgePoint.findMany({
        where: { status: 'PUBLISHED', deletedAt: null },
        select: {
          id: true,
          slug: true,
          name: true,
          subject: true,
          difficulty: true,
          summary: true,
        },
      }),
      this.prisma.knowledgeRelation.findMany({
        select: { fromId: true, toId: true },
      }),
    ]);
    return { nodes, edges };
  }
}
