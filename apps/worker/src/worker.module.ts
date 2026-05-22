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
import { CrmSyncProcessor } from './processors/crm-sync.processor';
import { AppointmentBookingProcessor } from './processors/appointment-booking.processor';
import { ReactivationProcessor } from './processors/reactivation.processor';
import { AnalyticsIngestProcessor } from './processors/analytics-ingest.processor';

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
    CrmSyncProcessor,
    AppointmentBookingProcessor,
    ReactivationProcessor,
    AnalyticsIngestProcessor,
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
    private readonly crmSyncProcessor: CrmSyncProcessor,
    private readonly appointmentBookingProcessor: AppointmentBookingProcessor,
    private readonly reactivationProcessor: ReactivationProcessor,
    private readonly analyticsIngestProcessor: AnalyticsIngestProcessor,
  ) {}

  onModuleInit(): void {
    const w = (concurrency: number) => ({
      connection: redisConnection,
      concurrency,
      // Allow up to 30s for a job to complete after receiving SIGTERM before forced shutdown
      closeTimeout: 30_000,
    });

    this.workers.push(
      new Worker(QUEUE_NAMES.LEAD_INTAKE,        (job) => this.leadIntakeProcessor.process(job),         w(10)),
      new Worker(QUEUE_NAMES.AI_RESPONSE,         (job) => this.aiResponseProcessor.process(job),         w(5)),
      new Worker(QUEUE_NAMES.QUALIFICATION,       (job) => this.qualificationProcessor.process(job),      w(10)),
      new Worker(QUEUE_NAMES.LEAD_ROUTING,        (job) => this.leadRoutingProcessor.process(job),        w(5)),
      new Worker(QUEUE_NAMES.APPOINTMENT_BOOKING, (job) => this.appointmentBookingProcessor.process(job), w(5)),
      new Worker(QUEUE_NAMES.CRM_SYNC,            (job) => this.crmSyncProcessor.process(job),            w(3)),
      new Worker(QUEUE_NAMES.MISSED_CALL,         (job) => this.missedCallProcessor.process(job),         w(5)),
      new Worker(QUEUE_NAMES.REACTIVATION,        (job) => this.reactivationProcessor.process(job),       w(3)),
      new Worker(QUEUE_NAMES.NOTIFICATION,        (job) => this.notificationProcessor.process(job),       w(10)),
      new Worker(QUEUE_NAMES.AUDIT_LOG,           (job) => this.auditLogProcessor.process(job),           w(20)),
      new Worker(QUEUE_NAMES.ANALYTICS_INGEST,    (job) => this.analyticsIngestProcessor.process(job),    w(10)),
      new Worker(QUEUE_NAMES.RETENTION,           (job) => this.retentionProcessor.process(job),          w(1)),
    );

    // Schedule nightly retention job at 3am UTC
    const retentionQueue = new Queue(QUEUE_NAMES.RETENTION, { connection: redisConnection });
    retentionQueue.add(
      'daily-retention',
      {},
      { repeat: { pattern: '0 3 * * *' }, removeOnComplete: 10, removeOnFail: 5 },
    ).catch(() => undefined);
  }

  async onModuleDestroy(): Promise<void> {
    // Graceful drain: stop accepting new jobs, wait for in-flight to complete (up to 30s each)
    await Promise.allSettled(this.workers.map((w) => w.close()));
  }
}
