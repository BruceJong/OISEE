import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';
import type {
  SceneCreateInput,
  SceneUpdateInput,
  ItemCreateInput,
  ItemUpdateInput,
  KnowledgePointCreateInput,
  KnowledgePointUpdateInput,
} from '@oisee/shared';

@Injectable()
export class AdminContentService {
  constructor(private prisma: PrismaService) {}

  // ====================== 场景 ======================
  async listScenes(params: { keyword?: string; status?: string }) {
    const { keyword, status } = params;
    return this.prisma.scene.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { slug: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: { _count: { select: { items: true } } },
    });
  }

  async getScene(id: string) {
    const scene = await this.prisma.scene.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            shortDesc: true,
            scenePosition: true,
            itemImageUrl: true,
            svgSymbolId: true,
            status: true,
          },
        },
      },
    });
    if (!scene) throw new BusinessException(ERROR_CODES.NOT_FOUND, '场景不存在');
    return scene;
  }

  async createScene(data: SceneCreateInput) {
    try {
      return await this.prisma.scene.create({ data: data as any });
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async updateScene(id: string, data: SceneUpdateInput) {
    await this.ensureSceneExists(id);
    try {
      return await this.prisma.scene.update({ where: { id }, data: data as any });
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async deleteScene(id: string) {
    await this.ensureSceneExists(id);
    return this.prisma.scene.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async publishScene(id: string) {
    await this.ensureSceneExists(id);
    return this.prisma.scene.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async archiveScene(id: string) {
    await this.ensureSceneExists(id);
    return this.prisma.scene.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  private async ensureSceneExists(id: string) {
    const scene = await this.prisma.scene.findFirst({ where: { id, deletedAt: null } });
    if (!scene) throw new BusinessException(ERROR_CODES.NOT_FOUND, '场景不存在');
  }

  // ====================== 物品 ======================
  async listItems(params: { keyword?: string; status?: string; sceneId?: string }) {
    const { keyword, status, sceneId } = params;
    return this.prisma.item.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(sceneId ? { sceneId } : {}),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { slug: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        scene: { select: { id: true, name: true, slug: true } },
        _count: { select: { knowledgePoints: true } },
      },
    });
  }

  async getItem(id: string) {
    const item = await this.prisma.item.findFirst({
      where: { id, deletedAt: null },
      include: {
        scene: { select: { id: true, name: true, slug: true } },
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
    if (!item) throw new BusinessException(ERROR_CODES.NOT_FOUND, '物品不存在');
    return item;
  }

  async createItem(data: ItemCreateInput) {
    try {
      return await this.prisma.item.create({ data: data as any });
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async updateItem(id: string, data: ItemUpdateInput) {
    await this.ensureItemExists(id);
    try {
      return await this.prisma.item.update({ where: { id }, data: data as any });
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async deleteItem(id: string) {
    await this.ensureItemExists(id);
    return this.prisma.item.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async publishItem(id: string) {
    await this.ensureItemExists(id);
    return this.prisma.item.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async archiveItem(id: string) {
    await this.ensureItemExists(id);
    return this.prisma.item.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async updateItemLayouts(
    sceneId: string,
    layouts: Array<{ itemId: string; x: number; y: number; width: number; height: number }>
  ) {
    return this.prisma.$transaction(
      layouts.map((l) =>
        this.prisma.item.update({
          where: { id: l.itemId },
          data: { scenePosition: { x: l.x, y: l.y, width: l.width, height: l.height } },
        })
      )
    );
  }

  async setItemKnowledgePoints(itemId: string, knowledgePointIds: string[]) {
    await this.ensureItemExists(itemId);
    return this.prisma.$transaction(async (tx) => {
      await tx.itemKnowledgePoint.deleteMany({ where: { itemId } });
      if (knowledgePointIds.length > 0) {
        await tx.itemKnowledgePoint.createMany({
          data: knowledgePointIds.map((kpId, idx) => ({
            itemId,
            knowledgePointId: kpId,
            sortOrder: idx,
          })),
          skipDuplicates: true,
        });
      }
      return { ok: true, count: knowledgePointIds.length };
    });
  }

  private async ensureItemExists(id: string) {
    const item = await this.prisma.item.findFirst({ where: { id, deletedAt: null } });
    if (!item) throw new BusinessException(ERROR_CODES.NOT_FOUND, '物品不存在');
  }

  // ====================== 知识点 ======================
  async listKnowledge(params: {
    keyword?: string;
    status?: string;
    subject?: string;
    difficulty?: string;
  }) {
    const { keyword, status, subject, difficulty } = params;
    return this.prisma.knowledgePoint.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
        ...(subject ? { subject: subject as any } : {}),
        ...(difficulty ? { difficulty: difficulty as any } : {}),
        ...(keyword
          ? {
              OR: [
                { name: { contains: keyword, mode: 'insensitive' } },
                { slug: { contains: keyword, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ subject: 'asc' }, { difficulty: 'asc' }],
      include: {
        _count: { select: { items: true } },
      },
    });
  }

  async getKnowledge(id: string) {
    const kp = await this.prisma.knowledgePoint.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: {
            item: { select: { id: true, name: true, slug: true } },
          },
        },
      },
    });
    if (!kp) throw new BusinessException(ERROR_CODES.NOT_FOUND, '知识点不存在');
    return kp;
  }

  async createKnowledge(data: KnowledgePointCreateInput) {
    const { itemIds, ...rest } = data;
    try {
      const kp = await this.prisma.knowledgePoint.create({ data: rest as any });
      if (itemIds && itemIds.length > 0) {
        await this.prisma.itemKnowledgePoint.createMany({
          data: itemIds.map((itemId, idx) => ({
            itemId,
            knowledgePointId: kp.id,
            sortOrder: idx,
          })),
          skipDuplicates: true,
        });
      }
      return kp;
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async updateKnowledge(id: string, data: KnowledgePointUpdateInput) {
    await this.ensureKnowledgeExists(id);
    const { itemIds, ...rest } = data;
    try {
      const kp = await this.prisma.knowledgePoint.update({ where: { id }, data: rest as any });
      if (itemIds) {
        await this.prisma.$transaction(async (tx) => {
          await tx.itemKnowledgePoint.deleteMany({ where: { knowledgePointId: id } });
          if (itemIds.length > 0) {
            await tx.itemKnowledgePoint.createMany({
              data: itemIds.map((itemId, idx) => ({
                itemId,
                knowledgePointId: id,
                sortOrder: idx,
              })),
              skipDuplicates: true,
            });
          }
        });
      }
      return kp;
    } catch (e) {
      this.handlePrismaError(e, 'slug');
      throw e;
    }
  }

  async deleteKnowledge(id: string) {
    await this.ensureKnowledgeExists(id);
    return this.prisma.knowledgePoint.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async publishKnowledge(id: string) {
    await this.ensureKnowledgeExists(id);
    return this.prisma.knowledgePoint.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async archiveKnowledge(id: string) {
    await this.ensureKnowledgeExists(id);
    return this.prisma.knowledgePoint.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  private async ensureKnowledgeExists(id: string) {
    const kp = await this.prisma.knowledgePoint.findFirst({ where: { id, deletedAt: null } });
    if (!kp) throw new BusinessException(ERROR_CODES.NOT_FOUND, '知识点不存在');
  }

  async batchSceneSortOrder(items: Array<{ id: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.scene.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
      )
    );
    return { ok: true };
  }

  async batchItemSortOrder(items: Array<{ id: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.item.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
      )
    );
    return { ok: true };
  }

  // ====================== 公共 ======================
  private handlePrismaError(e: unknown, uniqueField: string) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new BusinessException(
          ERROR_CODES.CONTENT_DUPLICATE_SLUG,
          `${uniqueField} 已存在，请换一个`
        );
      }
    }
  }
}
