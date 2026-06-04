import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminContentService } from './admin-content.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  KnowledgePointCreateSchema,
  KnowledgePointUpdateSchema,
  type KnowledgePointCreateInput,
  type KnowledgePointUpdateInput,
} from '@oisee/shared';

@Controller('admin/knowledge-points')
@UseGuards(JwtAdminGuard)
export class AdminKnowledgeController {
  constructor(private svc: AdminContentService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('subject') subject?: string,
    @Query('difficulty') difficulty?: string
  ) {
    return this.svc.listKnowledge({ keyword, status, subject, difficulty });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.getKnowledge(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(KnowledgePointCreateSchema))
  create(@Body() body: KnowledgePointCreateInput) {
    return this.svc.createKnowledge(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(KnowledgePointUpdateSchema)) body: KnowledgePointUpdateInput
  ) {
    return this.svc.updateKnowledge(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.deleteKnowledge(id);
  }

  @Post(':id/publish')
  publish(@Param('id') id: string) {
    return this.svc.publishKnowledge(id);
  }

  @Post(':id/archive')
  archive(@Param('id') id: string) {
    return this.svc.archiveKnowledge(id);
  }
}
