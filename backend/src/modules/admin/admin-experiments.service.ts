import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';
import type { ExperimentCreateInput, ExperimentUpdateInput } from '@oisee/shared';

@Injectable()
export class AdminExperimentsService {
  constructor(private prisma: PrismaService) {}

  async list(params: { keyword?: string; status?: string; difficulty?: string }) {
    const { keyword, status, difficulty } = params;
    return this.prisma.experiment.findMany({
      where: {
        deletedAt: null,
        ...(status ? { status: status as any } : {}),
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
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
      include: {
        _count: { select: { items: true, knowledgePoints: true } },
      },
    });
  }

  async getOne(id: string) {
    const exp = await this.prisma.experiment.findFirst({
      where: { id, deletedAt: null },
      include: {
        items: {
          include: { item: { select: { id: true, slug: true, name: true } } },
        },
        knowledgePoints: {
          include: {
            knowledgePoint: {
              select: { id: true, slug: true, name: true, subject: true, difficulty: true },
            },
          },
        },
      },
    });
    if (!exp) throw new BusinessException(ERROR_CODES.NOT_FOUND, '实验不存在');
    return exp;
  }

  async create(data: ExperimentCreateInput) {
    const { itemIds, knowledgePointIds, ...rest } = data;
    try {
      const exp = await this.prisma.experiment.create({ data: rest as any });
      await this.setLinks(exp.id, itemIds, knowledgePointIds);
      return this.getOne(exp.id);
    } catch (e) {
      this.handlePrismaError(e);
      throw e;
    }
  }

  async update(id: string, data: ExperimentUpdateInput) {
    await this.ensureExists(id);
    const { itemIds, knowledgePointIds, ...rest } = data;
    try {
      await this.prisma.experiment.update({ where: { id }, data: rest as any });
      await this.setLinks(id, itemIds, knowledgePointIds);
      return this.getOne(id);
    } catch (e) {
      this.handlePrismaError(e);
      throw e;
    }
  }

  /** itemIds / knowledgePointIds 传 undefined 表示不改动，传数组则整体重写 */
  private async setLinks(id: string, itemIds?: string[], knowledgePointIds?: string[]) {
    await this.prisma.$transaction(async (tx) => {
      if (itemIds) {
        await tx.experimentItem.deleteMany({ where: { experimentId: id } });
        if (itemIds.length > 0) {
          await tx.experimentItem.createMany({
            data: itemIds.map((itemId) => ({ experimentId: id, itemId })),
            skipDuplicates: true,
          });
        }
      }
      if (knowledgePointIds) {
        await tx.experimentKnowledgePoint.deleteMany({ where: { experimentId: id } });
        if (knowledgePointIds.length > 0) {
          await tx.experimentKnowledgePoint.createMany({
            data: knowledgePointIds.map((kpId) => ({ experimentId: id, knowledgePointId: kpId })),
            skipDuplicates: true,
          });
        }
      }
    });
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.experiment.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async publish(id: string) {
    await this.ensureExists(id);
    return this.prisma.experiment.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async archive(id: string) {
    await this.ensureExists(id);
    return this.prisma.experiment.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  private async ensureExists(id: string) {
    const exp = await this.prisma.experiment.findFirst({ where: { id, deletedAt: null } });
    if (!exp) throw new BusinessException(ERROR_CODES.NOT_FOUND, '实验不存在');
  }

  private handlePrismaError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
      throw new BusinessException(ERROR_CODES.CONTENT_DUPLICATE_SLUG, 'slug 已存在，请换一个');
    }
  }
}
