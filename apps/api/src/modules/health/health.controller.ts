import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { redisConnection } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

interface ServiceHealth {
  database: 'healthy' | 'unhealthy';
  redis: 'healthy' | 'unhealthy';
  vertexAi: 'healthy' | 'unconfigured';
}

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    timestamp: string;
    services: ServiceHealth;
  }> {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const vertexStatus = this.checkVertexAI();

    const criticalOk = dbOk && redisOk;
    const status = criticalOk ? 'healthy' : dbOk || redisOk ? 'degraded' : 'down';

    return {
      status,
      version: process.env['npm_package_version'] ?? '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'healthy' : 'unhealthy',
        redis: redisOk ? 'healthy' : 'unhealthy',
        vertexAi: vertexStatus,
      },
    };
  }

  /** Readiness probe — used by Cloud Run to gate traffic. DB + Redis must be healthy. */
  @Get('ready')
  async ready(): Promise<{ ready: true }> {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    if (!dbOk) throw new ServiceUnavailableException('Database not ready');
    if (!redisOk) throw new ServiceUnavailableException('Redis not ready');
    return { ready: true };
  }

  /** Liveness probe — always returns 200 if the process is alive. */
  @Get('live')
  live(): { alive: true; uptime: number } {
    return { alive: true, uptime: Math.floor(process.uptime()) };
  }

  private async checkDb(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (err) {
      logger.warn({ err }, 'health: database check failed');
      return false;
    }
  }

  private async checkRedis(): Promise<boolean> {
    try {
      const result = await redisConnection.ping();
      return result === 'PONG';
    } catch (err) {
      logger.warn({ err }, 'health: redis check failed');
      return false;
    }
  }

  private checkVertexAI(): 'healthy' | 'unconfigured' {
    // Lightweight check — verify env vars are present; actual API health is tracked via circuit breaker
    const hasProject = !!process.env['GOOGLE_CLOUD_PROJECT'];
    const hasModel = !!process.env['VERTEX_AI_MODEL'];
    if (hasProject && hasModel) return 'healthy';
    return 'unconfigured';
  }
}
