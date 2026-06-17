import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('knowledge')
export class PublicKnowledgeController {
  constructor(private svc: ContentService) {}

  @Get()
  list(
    @Query('subject') subject?: string,
    @Query('difficulty') difficulty?: string,
    @Query('keyword') keyword?: string
  ) {
    return this.svc.listKnowledge({ subject, difficulty, keyword });
  }

  @Get('network')
  network() {
    return this.svc.getKnowledgeNetwork();
  }

  /** 小测判分：提交后才返回正确答案与解析 */
  @Post('quiz/:questionId/answer')
  answerQuiz(
    @Param('questionId') questionId: string,
    @Body() body: { choice?: number }
  ) {
    return this.svc.answerQuizQuestion(questionId, Number(body?.choice));
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.svc.getKnowledgeBySlug(slug);
  }
}
