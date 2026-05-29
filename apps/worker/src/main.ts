import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // fallback

import 'reflect-metadata';
import { createServer } from 'http';
import { NestFactory } from '@nestjs/core';
import { logger, initTracing } from '@conversionops/observability';

// Initialize OpenTelemetry before importing instrumented modules
initTracing('conversionops-worker');

import { WorkerModule } from './worker.module';

// Required at worker startup — fail fast rather than silently process jobs incorrectly
const REQUIRED_ENV_VARS_PROD = ['DATABASE_URL', 'REDIS_URL'];

function validateRequiredEnvVars(keys: string[]): void {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length > 0) {
    throw new Error(`Worker startup failed: missing required env vars: ${missing.join(', ')}`);
  }
}

async function bootstrap(): Promise<void> {
  if (process.env['NODE_ENV'] === 'production') {
    validateRequiredEnvVars(REQUIRED_ENV_VARS_PROD);
  }

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    logger: false,
  });

  // Cloud Run *services* require the container to listen on $PORT, even though
  // this process is a BullMQ consumer with no public API. A tiny health server
  // satisfies that contract and exposes liveness for probes/uptime checks.
  const port = parseInt(process.env['PORT'] ?? '8080', 10);
  const healthServer = createServer((req, res) => {
    if (req.url === '/health' || req.url === '/' || req.url === '/healthz') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'worker', uptime: Math.floor(process.uptime()) }));
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  healthServer.listen(port, () => logger.info({ port }, 'Worker health server listening'));

  logger.info({ nodeEnv: process.env['NODE_ENV'] }, 'ConversionOps worker started');

  let isShuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, 'Worker shutting down — draining in-flight jobs (max 30s)');
    try {
      healthServer.close();
      await app.close();
      logger.info('Worker shutdown complete');
    } catch (err) {
      logger.error({ err }, 'Worker shutdown error');
    } finally {
      process.exit(0);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Surface unhandled rejections — never silently swallow
  process.on('unhandledRejection', (reason: unknown) => {
    logger.error({ reason }, 'Unhandled promise rejection in worker');
  });

  process.on('uncaughtException', (err: Error) => {
    logger.error({ err }, 'Uncaught exception in worker — exiting');
    process.exit(1);
  });
}

bootstrap().catch((err: unknown) => {
  logger.error({ err }, 'Worker failed to start');
  process.exit(1);
});
