import { Module } from '@nestjs/common';
import { AdminScenesController } from './admin-scenes.controller';
import { AdminItemsController } from './admin-items.controller';
import { AdminKnowledgeController } from './admin-knowledge.controller';
import { AdminContentService } from './admin-content.service';

@Module({
  controllers: [AdminScenesController, AdminItemsController, AdminKnowledgeController],
  providers: [AdminContentService],
})
export class AdminContentModule {}
