import { Controller, Get, Param } from '@nestjs/common';
import { ContentService } from './content.service';

@Controller('items')
export class PublicItemsController {
  constructor(private svc: ContentService) {}

  @Get()
  list() {
    return this.svc.listItems();
  }

  @Get(':slug')
  detail(@Param('slug') slug: string) {
    return this.svc.getItemBySlug(slug);
  }
}
