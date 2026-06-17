import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class PublicSceneGroupsController {
  constructor(private prisma: PrismaService) {}

  /**
   * 公开接口：返回所有已发布的一级场景，含 mapPosition / iconKind / themeColor
   * 用户端在共享世界地图上渲染可点击热区。
   */
  @Get('scene-groups')
  async list() {
    return this.prisma.sceneGroup.findMany({
      where: { deletedAt: null, status: 'PUBLISHED' },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        slug: true,
        name: true,
        description: true,
        mapPosition: true,
        iconKind: true,
        themeColor: true,
        sortOrder: true,
        isLocked: true,
        unlockHint: true,
        unlockConditions: true,
      },
    });
  }

  /**
   * 公开接口：返回当前生效的世界地图（imageUrl / imagePrompt）。
   * 管理员未设置时返回 null，用户端回退到默认地图。
   */
  @Get('world-map')
  async getWorldMap() {
    const record = await this.prisma.adminSetting.findUnique({
      where: { key: 'world_map' },
    });
    return record?.value ?? null;
  }
}
