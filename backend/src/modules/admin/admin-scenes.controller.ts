import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminContentService } from './admin-content.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  SceneCreateSchema,
  SceneUpdateSchema,
  UpdateItemLayoutsSchema,
  type SceneCreateInput,
  type SceneUpdateInput,
} from '@oisee/shared';

@Controller('admin/scenes')
@UseGuards(JwtAdminGuard)
export class AdminScenesController {
  constructor(private svc: AdminContentService) {}

  @Get()
  list(@Query('keyword') keyword?: string, @Query('status') status?: string) {
    return this.svc.listScenes({ keyword, status });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.getScene(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(SceneCreateSchema))
  create(@Body() body: SceneCreateInput) {
    return this.svc.createScene(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SceneUpdateSchema)) body: SceneUpdateInput
  ) {
    return this.svc.updateScene(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteScene(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publishScene(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archiveScene(id);
  }

  @Patch(':id/item-layouts')
  updateLayouts(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(UpdateItemLayoutsSchema)) body: any
  ) {
    return this.svc.updateItemLayouts(id, body);
  }

  /** 批量更新排序 */
  @Patch('batch/sort-order')
  batchSort(@Body() body: { items: Array<{ id: string; sortOrder: number }> }) {
    return this.svc.batchSceneSortOrder(body.items);
  }
}
