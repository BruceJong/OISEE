import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminSceneGroupsService } from './admin-scene-groups.service';

@Controller('admin/scene-groups')
@UseGuards(JwtAdminGuard)
export class AdminSceneGroupsController {
  constructor(private svc: AdminSceneGroupsService) {}

  @Get()
  list(@Query('keyword') keyword?: string, @Query('status') status?: string) {
    return this.svc.list({ keyword, status });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() body: any) {
    return this.svc.update(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.remove(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publish(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archive(id);
  }

  /** 批量更新排序 */
  @Patch('batch/sort-order')
  batchSort(@Body() body: { items: Array<{ id: string; sortOrder: number }> }) {
    return this.svc.batchSortOrder(body.items);
  }
}
