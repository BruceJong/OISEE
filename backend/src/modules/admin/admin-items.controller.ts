import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { z } from 'zod';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminContentService } from './admin-content.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ItemCreateSchema,
  ItemUpdateSchema,
  type ItemCreateInput,
  type ItemUpdateInput,
} from '@oisee/shared';

const SetKpsSchema = z.object({
  knowledgePointIds: z.array(z.string()),
});

@Controller('admin/items')
@UseGuards(JwtAdminGuard)
export class AdminItemsController {
  constructor(private svc: AdminContentService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('sceneId') sceneId?: string
  ) {
    return this.svc.listItems({ keyword, status, sceneId });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.getItem(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(ItemCreateSchema))
  create(@Body() body: ItemCreateInput) {
    return this.svc.createItem(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ItemUpdateSchema)) body: ItemUpdateInput
  ) {
    return this.svc.updateItem(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteItem(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publishItem(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archiveItem(id);
  }

  @Post(':id/knowledge-points')
  setKps(@Param('id') id: string, @Body(new ZodValidationPipe(SetKpsSchema)) body: any) {
    return this.svc.setItemKnowledgePoints(id, body.knowledgePointIds);
  }

  /** 批量更新排序 */
  @Patch('batch/sort-order')
  batchSort(@Body() body: { items: Array<{ id: string; sortOrder: number }> }) {
    return this.svc.batchItemSortOrder(body.items);
  }
}
