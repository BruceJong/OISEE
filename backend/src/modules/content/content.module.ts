import { Module } from '@nestjs/common';
import { PublicScenesController } from './public-scenes.controller';
import { PublicItemsController } from './public-items.controller';
import { PublicKnowledgeController } from './public-knowledge.controller';
import { PublicExperimentsController } from './public-experiments.controller';
import { PublicStatsController } from './public-stats.controller';
import { ContentService } from './content.service';

@Module({
  controllers: [PublicScenesController, PublicItemsController, PublicKnowledgeController, PublicExperimentsController, PublicStatsController],
  providers: [ContentService],
})
export class ContentModule {}
