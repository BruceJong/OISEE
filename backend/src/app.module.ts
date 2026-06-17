import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContentModule } from './modules/content/content.module';
import { AdminContentModule } from './modules/admin/admin-content.module';
import { MediaModule } from './modules/media/media.module';
import { HealthController } from './modules/health/health.controller';

@Module({
  imports: [
    // .env 位于项目根（向上三级：code/apps/api → 根）
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ['.env', '../../../.env'] }),
    // 本地开发：把 ./uploads 暴露为 /uploads/* 静态资源（替代 OSS）
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.OISEE_UPLOAD_DIR ?? './uploads'),
      serveRoot: '/uploads',
      serveStaticOptions: { fallthrough: false },
    }),
    // 演示视频本地服务 → /video/*；生产环境视频地址走 CMS 配置（DB 字段 *VideoUrl）
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), process.env.OISEE_VIDEO_DIR ?? '../data/video'),
      serveRoot: '/video',
      serveStaticOptions: { fallthrough: false },
    }),
    PrismaModule,
    AuthModule,
    ContentModule,
    AdminContentModule,
    MediaModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
