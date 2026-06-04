import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('public/experiments')
export class PublicExperimentsController {
  constructor(private readonly contentService: ContentService) {}

  @Get()
  listExperiments() {
    return this.contentService.listExperiments();
  }

  @Get(':slug')
  getExperiment(@Param('slug') slug: string) {
    return this.contentService.getExperimentBySlug(slug);
  }
}
