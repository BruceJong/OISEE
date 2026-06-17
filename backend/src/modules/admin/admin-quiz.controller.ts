import { Body, Controller, Delete, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common';
import { JwtAdminGuard } from '../auth/guards/jwt-admin.guard';
import { AdminQuizService } from './admin-quiz.service';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import {
  QuizQuestionCreateSchema,
  QuizQuestionUpdateSchema,
  SetKnowledgeRelationsSchema,
  type QuizQuestionCreateInput,
  type QuizQuestionUpdateInput,
} from '@oisee/shared';

/** 知识点下挂的小测题与知识网络关系管理 */
@Controller('admin/knowledge-points')
@UseGuards(JwtAdminGuard)
export class AdminKpQuizController {
  constructor(private svc: AdminQuizService) {}

  @Get(':id/quiz-questions')
  listQuiz(@Param('id') id: string) {
    return this.svc.listQuiz(id);
  }

  @Post(':id/quiz-questions')
  createQuiz(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(QuizQuestionCreateSchema)) body: QuizQuestionCreateInput
  ) {
    return this.svc.createQuiz(id, body);
  }

  @Get(':id/relations')
  getRelations(@Param('id') id: string) {
    return this.svc.getRelations(id);
  }

  @Put(':id/relations')
  setRelations(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(SetKnowledgeRelationsSchema)) body: { relatedIds: string[] }
  ) {
    return this.svc.setRelations(id, body.relatedIds);
  }
}

@Controller('admin/quiz-questions')
@UseGuards(JwtAdminGuard)
export class AdminQuizController {
  constructor(private svc: AdminQuizService) {}

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(QuizQuestionUpdateSchema)) body: QuizQuestionUpdateInput
  ) {
    return this.svc.updateQuiz(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.svc.removeQuiz(id);
  }
}
