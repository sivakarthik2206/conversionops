import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { logger } from '@conversionops/observability';

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://app.conversionops.in',
  'https://conversionops.in',
  'https://admin.conversionops.in',
];

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(compression());

  // Request ID middleware — propagates x-request-id for end-to-end tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  const envOrigins = process.env['CORS_ORIGIN']?.split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = envOrigins && envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;

  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.enableShutdownHooks();

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port);
  logger.info({ port, allowedOrigins }, 'ConversionOps API started');
}

bootstrap().catch((err) => {
  logger.error({ err }, 'Fatal: failed to start API');
  process.exit(1);
});
