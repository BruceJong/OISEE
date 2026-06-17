import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { AdminScenesController } from './admin-scenes.controller';
import { AdminItemsController } from './admin-items.controller';
import { AdminKnowledgeController } from './admin-knowledge.controller';
import { AdminContentService } from './admin-content.service';
import { AdminSceneGroupsController } from './admin-scene-groups.controller';
import { AdminSceneGroupsService } from './admin-scene-groups.service';
import { AdminAiTasksController } from './admin-ai-tasks.controller';
import { AdminAiTasksService } from './admin-ai-tasks.service';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminSettingsService } from './admin-settings.service';
import { AdminExperimentsController } from './admin-experiments.controller';
import { AdminExperimentsService } from './admin-experiments.service';
import { AdminKpQuizController, AdminQuizController } from './admin-quiz.controller';
import { AdminQuizService } from './admin-quiz.service';

@Module({
  imports: [MediaModule],
  controllers: [
    AdminScenesController,
    AdminItemsController,
    AdminKnowledgeController,
    AdminKpQuizController,
    AdminQuizController,
    AdminExperimentsController,
    AdminSceneGroupsController,
    AdminAiTasksController,
    AdminSettingsController,
  ],
  providers: [
    AdminContentService,
    AdminExperimentsService,
    AdminQuizService,
    AdminSceneGroupsService,
    AdminAiTasksService,
    AdminSettingsService,
  ],
})
export class AdminContentModule {}
