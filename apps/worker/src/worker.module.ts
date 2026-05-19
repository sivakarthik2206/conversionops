import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Worker } from 'bullmq';
import { QUEUE_NAMES, redisConnection } from '@conversionops/orchestration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { LeadIntakeProcessor } from './processors/lead-intake.processor';
import { LeadRoutingProcessor } from './processors/lead-routing.processor';
import { AuditLogProcessor } from './processors/audit-log.processor';
import { NotificationProcessor } from './processors/notification.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  providers: [
    LeadIntakeProcessor,
    LeadRoutingProcessor,
    AuditLogProcessor,
    NotificationProcessor,
  ],
})
export class WorkerModule implements OnModuleInit, OnModuleDestroy {
  private readonly workers: Worker[] = [];

  constructor(
    private readonly leadIntakeProcessor: LeadIntakeProcessor,
    private readonly leadRoutingProcessor: LeadRoutingProcessor,
    private readonly auditLogProcessor: AuditLogProcessor,
    private readonly notificationProcessor: NotificationProcessor,
  ) {}

  onModuleInit(): void {
    this.workers.push(
      new Worker(
        QUEUE_NAMES.LEAD_INTAKE,
        (job) => this.leadIntakeProcessor.process(job),
        { connection: redisConnection, concurrency: 10 },
      ),
      new Worker(
        QUEUE_NAMES.LEAD_ROUTING,
        (job) => this.leadRoutingProcessor.process(job),
        { connection: redisConnection, concurrency: 5 },
      ),
      new Worker(
        QUEUE_NAMES.AUDIT_LOG,
        (job) => this.auditLogProcessor.process(job),
        { connection: redisConnection, concurrency: 20 },
      ),
      new Worker(
        QUEUE_NAMES.NOTIFICATION,
        (job) => this.notificationProcessor.process(job),
        { connection: redisConnection, concurrency: 10 },
      ),
    );
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}
