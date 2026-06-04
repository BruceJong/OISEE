import { Controller, Get, Param, Query } from '@nestjs/common';
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

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.svc.getKnowledgeBySlug(slug);
  }
}
