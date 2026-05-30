import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import type { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { logger, initTracing } from '@conversionops/observability';
import { validateRequiredEnvVars } from '@conversionops/config';
import * as express from 'express';
import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

// Initialize OpenTelemetry before importing instrumented modules
initTracing('conversionops-api');

// Initialize Sentry — sample at 10% in production to control cost
if (process.env['SENTRY_DSN']) {
  Sentry.init({
    dsn: process.env['SENTRY_DSN'],
    integrations: [nodeProfilingIntegration()],
    tracesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.1 : 1.0,
    profilesSampleRate: process.env['NODE_ENV'] === 'production' ? 0.05 : 0.5,
    // Never send PII to Sentry
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers?.authorization) {
        event.request.headers.authorization = '[REDACTED]';
      }
      return event;
    },
  });
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3002',
  'http://localhost:3003',
  'https://app.conversionops.in',
  'https://conversionops.in',
  'https://admin.conversionops.in',
];

// Required env vars for production startup — fail fast if missing
const REQUIRED_ENV_VARS_PROD = ['DATABASE_URL', 'REDIS_URL', 'JWT_SECRET', 'MAGIC_LINK_SECRET', 'APP_URL', 'RESEND_API_KEY'];

async function bootstrap(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    validateRequiredEnvVars(REQUIRED_ENV_VARS_PROD);
    const jwtSecret = process.env['JWT_SECRET'] ?? '';
    if (jwtSecret.length < 64) {
      throw new Error('JWT_SECRET must be at least 64 characters in production');
    }
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));
  app.use(compression());

  // Payload limits: 512KB for most routes, 5MB for webhooks (accommodated below)
  app.use('/v1/webhooks', express.json({ limit: '512kb' }));
  app.use('/v1/webhooks', express.urlencoded({ limit: '512kb', extended: true }));
  app.use(express.json({ limit: '512kb' }));
  app.use(express.urlencoded({ limit: '512kb', extended: true }));

  // Request ID middleware — propagates x-request-id for end-to-end tracing
  app.use((req: Request, res: Response, next: NextFunction) => {
    const incoming = req.headers['x-request-id'];
    // Validate format to prevent header injection — only accept safe alphanumeric UUIDs
    const isValidId = typeof incoming === 'string' && /^[a-zA-Z0-9\-_]{1,64}$/.test(incoming);
    const requestId = isValidId ? (incoming as string) : `req_${randomUUID().replace(/-/g, '')}`;
    req.headers['x-request-id'] = requestId;
    res.setHeader('x-request-id', requestId);
    next();
  });

  const envOrigins = process.env['CORS_ORIGIN']?.split(',').map((s) => s.trim()).filter(Boolean);
  const allowedOrigins = envOrigins && envOrigins.length > 0 ? envOrigins : DEFAULT_ALLOWED_ORIGINS;

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-admin-api-key'],
    maxAge: 86400,
  });

  app.enableShutdownHooks();

  app.setGlobalPrefix('v1');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  const port = parseInt(process.env['PORT'] ?? '3001', 10);
  await app.listen(port, '0.0.0.0');
  console.log(`API_LISTENING: port=${port}`); // sync confirmation for Cloud Run logs
  logger.info({ port, allowedOrigins, nodeEnv: process.env['NODE_ENV'] }, 'ConversionOps API started');
}

// Surface any pre-bootstrap async failure with a synchronous write so it makes
// it into the logs before the process exits.
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT_EXCEPTION:', err && err.stack ? err.stack : err);
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED_REJECTION:', reason);
});

bootstrap().catch((err) => {
  // Use a synchronous console.error first: Pino's async transport often does
  // not flush its buffer before process.exit, causing silent exit(1) on Cloud Run.
  console.error('FATAL_API_START:', err && (err as Error).stack ? (err as Error).stack : err);
  logger.error({ err }, 'Fatal: failed to start API');
  process.exit(1);
});
