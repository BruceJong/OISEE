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
