import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { MediaController } from './media.controller';
import { LocalStorageService } from './local-storage.service';
import { OssStorageService } from './oss-storage.service';
import { STORAGE_SERVICE } from './storage.interface';

// 由 OISEE_STORAGE_DRIVER 决定存储实现：'oss' → 阿里云 OSS，否则本地磁盘。
// 用 useFactory 保证只实例化被选中的那个（OSS 实现构造时需要 AK 环境变量）。
const storageProvider = {
  provide: STORAGE_SERVICE,
  useFactory: () =>
    process.env.OISEE_STORAGE_DRIVER === 'oss'
      ? new OssStorageService()
      : new LocalStorageService(),
};

@Module({
  imports: [
    MulterModule.register({
      limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
    }),
  ],
  controllers: [MediaController],
  providers: [storageProvider],
  exports: [STORAGE_SERVICE],
})
export class MediaModule {}
