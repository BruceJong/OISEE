import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards, UsePipes } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminExperimentsService } from './admin-experiments.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  ExperimentCreateSchema,
  ExperimentUpdateSchema,
  type ExperimentCreateInput,
  type ExperimentUpdateInput,
} from '@oisee/shared';

@Controller('admin/experiments')
@UseGuards(JwtAdminGuard)
export class AdminExperimentsController {
  constructor(private svc: AdminExperimentsService) {}

  @Get()
  list(
    @Query('keyword') keyword?: string,
    @Query('status') status?: string,
    @Query('difficulty') difficulty?: string
  ) {
    return this.svc.list({ keyword, status, difficulty });
  }

  @Get(':id')
  detail(@Param('id') id: string) {
    return this.svc.getOne(id);
  }

  @Post()
  @UsePipes(new ZodValidationPipe(ExperimentCreateSchema))
  create(@Body() body: ExperimentCreateInput) {
    return this.svc.create(body);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(ExperimentUpdateSchema)) body: ExperimentUpdateInput
  ) {
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
}
