import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  app.setGlobalPrefix('api/v1', { exclude: ['uploads/(.*)', 'video/(.*)'] });

  // 生产（OSS 存储）：本地 uploads 未命中的文件回退到 OSS。
  // 覆盖前端历史遗留的 /uploads/* 相对路径（如世界地图 map-v11.png、首页剖面图）。
  // 本地命中的文件由上面的 ServeStatic 直接返回；未命中才走到这里。
  if (process.env.OISEE_STORAGE_DRIVER === 'oss') {
    const ossBase = (
      process.env.OISEE_OSS_PUBLIC_BASE_URL ||
      `https://${process.env.OISEE_OSS_BUCKET}.oss-${process.env.OISEE_OSS_REGION}.aliyuncs.com`
    ).replace(/\/+$/, '');
    app.use('/uploads', (req: { url: string }, res: { redirect: (code: number, url: string) => void }) => {
      res.redirect(302, ossBase + req.url);
    });
    Logger.log(`/uploads 未命中回退 → ${ossBase}`, 'Bootstrap');
  }

  app.enableCors({
    origin: [
      process.env.OISEE_WEB_ORIGIN ?? 'http://localhost:5173',
      process.env.OISEE_ADMIN_ORIGIN ?? 'http://localhost:5174',
    ],
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    })
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  const port = Number(process.env.OISEE_PORT ?? 3000);
  await app.listen(port);
  Logger.log(`🚀 OISee API running on http://localhost:${port}`, 'Bootstrap');
}

void bootstrap();
