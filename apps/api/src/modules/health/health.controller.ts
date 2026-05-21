import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { redisConnection } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
@Public()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check(): Promise<{
    status: 'healthy' | 'degraded' | 'down';
    version: string;
    timestamp: string;
    services: { database: 'healthy' | 'unhealthy'; redis: 'healthy' | 'unhealthy' };
  }> {
    const [dbOk, redisOk] = await Promise.all([this.checkDb(), this.checkRedis()]);
    const status = dbOk && redisOk ? 'healthy' : dbOk || redisOk ? 'degraded' : 'down';
    return {
      status,
      version: process.env['npm_package_version'] ?? '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: dbOk ? 'healthy' : 'unhealthy',
        redis: redisOk ? 'healthy' : 'unhealthy',
      },
    };
  }

  @Get('ready')
  async ready(): Promise<{ ready: true }> {
    const dbOk = await this.checkDb();
    if (!dbOk) throw new ServiceUnavailableException('Database not ready');
    return { ready: true };
  }

  @Get('live')
  live(): { alive: true } {
    return { alive: true };
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
}
