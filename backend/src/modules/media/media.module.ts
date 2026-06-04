import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { LocalStorageService } from './local-storage.service';

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  ],
  controllers: [MediaController],
  providers: [LocalStorageService],
})
export class MediaModule {}
