import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('scenes')
export class PublicScenesController {
  constructor(private svc: ContentService) {}

  @Get()
  list() {
    return this.svc.listScenes();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.svc.getSceneBySlug(slug);
  }
}
