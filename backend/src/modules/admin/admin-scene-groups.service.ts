import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { BusinessException } from '../../common/exceptions/business.exception';
import { ERROR_CODES } from '@oisee/shared';

@Injectable()
export class AdminSceneGroupsService {
  constructor(private prisma: PrismaService) {}

  async list(params: { keyword?: string; status?: string }) {
    const { keyword, status } = params;
    return this.prisma.sceneGroup.findMany({
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
      include: { _count: { select: { scenes: true } } },
    });
  }

  async getOne(id: string) {
    const sg = await this.prisma.sceneGroup.findFirst({
      where: { id, deletedAt: null },
      include: {
        scenes: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            slug: true,
            name: true,
            mapPosition: true,
            sceneImageUrl: true,
            status: true,
            sortOrder: true,
          },
        },
        _count: { select: { scenes: true } },
      },
    });
    if (!sg) throw new BusinessException(ERROR_CODES.NOT_FOUND, '场景组不存在');
    return sg;
  }

  async create(data: any) {
    try {
      return await this.prisma.sceneGroup.create({ data });
    } catch (e) {
      this.handlePrismaError(e);
      throw e;
    }
  }

  async update(id: string, data: any) {
    await this.ensureExists(id);
    try {
      return await this.prisma.sceneGroup.update({ where: { id }, data });
    } catch (e) {
      this.handlePrismaError(e);
      throw e;
    }
  }

  async remove(id: string) {
    await this.ensureExists(id);
    return this.prisma.sceneGroup.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'ARCHIVED' },
    });
  }

  async publish(id: string) {
    await this.ensureExists(id);
    return this.prisma.sceneGroup.update({ where: { id }, data: { status: 'PUBLISHED' } });
  }

  async archive(id: string) {
    await this.ensureExists(id);
    return this.prisma.sceneGroup.update({ where: { id }, data: { status: 'ARCHIVED' } });
  }

  async batchSortOrder(items: Array<{ id: string; sortOrder: number }>) {
    await this.prisma.$transaction(
      items.map((item) =>
        this.prisma.sceneGroup.update({
          where: { id: item.id },
          data: { sortOrder: item.sortOrder },
        })
      )
    );
    return { ok: true };
  }

  private async ensureExists(id: string) {
    const sg = await this.prisma.sceneGroup.findFirst({ where: { id, deletedAt: null } });
    if (!sg) throw new BusinessException(ERROR_CODES.NOT_FOUND, '场景组不存在');
  }

  private handlePrismaError(e: unknown) {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') {
        throw new BusinessException(
          ERROR_CODES.CONTENT_DUPLICATE_SLUG,
          'slug 或名称已存在，请换一个'
        );
      }
    }
  }
}
