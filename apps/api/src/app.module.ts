import { Module, NestModule, MiddlewareConsumer, RequestMethod, Injectable } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import type { ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

// Webhook and health paths must never be rate-limited — Twilio bursts legitimately
// and health probes run every 30s from Cloud Run.
const THROTTLE_EXEMPT_PREFIXES = ['/v1/webhooks/', '/v1/health', '/v1/metrics'];

@Injectable()
class AppThrottlerGuard extends ThrottlerGuard {
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path ?? '';
    if (THROTTLE_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;
    return super.shouldSkip(context);
  }
}
import { PrismaModule } from './modules/prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { LeadModule } from './modules/lead/lead.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { AgentModule } from './modules/agent/agent.module';
import { BillingModule } from './modules/billing/billing.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AppointmentModule } from './modules/appointment/appointment.module';
import { RoutingModule } from './modules/routing/routing.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationModule } from './modules/notification/notification.module';
import { RealtimeGateway } from './gateway/realtime.gateway';
import { WorkspaceRoomsService } from './gateway/workspace.rooms';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TwilioSMSWebhookController } from './webhooks/twilio/sms.webhook';
import { TwilioVoiceWebhookController } from './webhooks/twilio/voice.webhook';
import { CalComWebhookController } from './webhooks/calcom/booking.webhook';
import { ZillowWebhookController } from './webhooks/zillow/zillow.webhook';
import { GenericLeadWebhookController } from './webhooks/generic/generic-lead.webhook';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env', '../../.env.local', '../../.env'],
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 120, // 120 req/min per IP for authenticated endpoints
    }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    WorkspaceModule,
    LeadModule,
    ConversationModule,
    AgentModule,
    BillingModule,
    AnalyticsModule,
    AppointmentModule,
    RoutingModule,
    AdminModule,
    NotificationModule,
  ],
  controllers: [
    TwilioSMSWebhookController,
    TwilioVoiceWebhookController,
    CalComWebhookController,
    ZillowWebhookController,
    GenericLeadWebhookController,
  ],
  providers: [
    RealtimeGateway,
    WorkspaceRoomsService,
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: AppThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'v1/auth/magic-link', method: RequestMethod.POST },
        { path: 'v1/auth/verify', method: RequestMethod.POST },
        { path: 'v1/webhooks/(.*)', method: RequestMethod.ALL },
        { path: 'v1/admin/(.*)', method: RequestMethod.ALL },
        { path: 'v1/health', method: RequestMethod.GET },
      )
      .forRoutes('*');
  }
}
