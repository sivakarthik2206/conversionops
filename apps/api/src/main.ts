import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { logger } from '@conversionops/observability';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: [
      process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000',
      process.env['NEXT_PUBLIC_WEB_URL'] ?? 'http://localhost:3001',
      process.env['NEXT_PUBLIC_ADMIN_URL'] ?? 'http://localhost:3002',
    ],
    credentials: true,
  });

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env['PORT'] ?? 3001;
  await app.listen(port);

  logger.info({ port }, `API listening on port ${port}`);
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Failed to start API');
  process.exit(1);
});
