import { Module, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { Worker, Queue } from 'bullmq';
import { QUEUE_NAMES, redisConnection } from '@conversionops/orchestration';
import { PrismaModule } from './modules/prisma/prisma.module';
import { RealtimeEmitterService } from './modules/realtime/realtime-emitter.service';
import { LeadIntakeProcessor } from './processors/lead-intake.processor';
import { LeadRoutingProcessor } from './processors/lead-routing.processor';
import { AuditLogProcessor } from './processors/audit-log.processor';
import { NotificationProcessor } from './processors/notification.processor';
import { AiResponseProcessor } from './processors/ai-response.processor';
import { QualificationProcessor } from './processors/qualification.processor';
import { MissedCallProcessor } from './processors/missed-call.processor';
import { RetentionProcessor } from './processors/retention.processor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
  ],
  providers: [
    RealtimeEmitterService,
    LeadIntakeProcessor,
    LeadRoutingProcessor,
    AuditLogProcessor,
    NotificationProcessor,
    AiResponseProcessor,
    QualificationProcessor,
    MissedCallProcessor,
    RetentionProcessor,
  ],
})
export class WorkerModule implements OnModuleInit, OnModuleDestroy {
  private readonly workers: Worker[] = [];

  constructor(
    private readonly leadIntakeProcessor: LeadIntakeProcessor,
    private readonly leadRoutingProcessor: LeadRoutingProcessor,
    private readonly auditLogProcessor: AuditLogProcessor,
    private readonly notificationProcessor: NotificationProcessor,
    private readonly aiResponseProcessor: AiResponseProcessor,
    private readonly qualificationProcessor: QualificationProcessor,
    private readonly missedCallProcessor: MissedCallProcessor,
    private readonly retentionProcessor: RetentionProcessor,
  ) {}

  onModuleInit(): void {
    this.workers.push(
      new Worker(QUEUE_NAMES.LEAD_INTAKE, (job) => this.leadIntakeProcessor.process(job), { connection: redisConnection, concurrency: 10 }),
      new Worker(QUEUE_NAMES.LEAD_ROUTING, (job) => this.leadRoutingProcessor.process(job), { connection: redisConnection, concurrency: 5 }),
      new Worker(QUEUE_NAMES.AUDIT_LOG, (job) => this.auditLogProcessor.process(job), { connection: redisConnection, concurrency: 20 }),
      new Worker(QUEUE_NAMES.NOTIFICATION, (job) => this.notificationProcessor.process(job), { connection: redisConnection, concurrency: 10 }),
      new Worker(QUEUE_NAMES.AI_RESPONSE, (job) => this.aiResponseProcessor.process(job), { connection: redisConnection, concurrency: 5 }),
      new Worker(QUEUE_NAMES.QUALIFICATION, (job) => this.qualificationProcessor.process(job), { connection: redisConnection, concurrency: 10 }),
      new Worker(QUEUE_NAMES.MISSED_CALL, (job) => this.missedCallProcessor.process(job), { connection: redisConnection, concurrency: 5 }),
      new Worker(QUEUE_NAMES.RETENTION, (job) => this.retentionProcessor.process(job), { connection: redisConnection, concurrency: 1 }),
    );

    // Schedule daily retention job at 3am UTC
    const retentionQueue = new Queue(QUEUE_NAMES.RETENTION, { connection: redisConnection });
    retentionQueue.add(
      'daily-retention',
      {},
      { repeat: { pattern: '0 3 * * *' }, removeOnComplete: 10, removeOnFail: 5 },
    ).catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all(this.workers.map((w) => w.close()));
  }
}

