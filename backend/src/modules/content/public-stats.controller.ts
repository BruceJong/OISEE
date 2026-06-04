import { Controller, Get } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('stats')
export class PublicStatsController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  getStats() {
    return this.contentService.getStats();
  }
}
