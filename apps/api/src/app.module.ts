import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR, Reflector } from '@nestjs/core';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { PrismaModule } from './modules/prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { WorkspaceModule } from './modules/workspace/workspace.module';
import { LeadModule } from './modules/lead/lead.module';
import { ConversationModule } from './modules/conversation/conversation.module';
import { AgentModule } from './modules/agent/agent.module';
import { RoutingModule } from './modules/routing/routing.module';
import { TwilioSmsWebhookController } from './webhooks/twilio/sms.webhook';
import { TwilioVoiceWebhookController } from './webhooks/twilio/voice.webhook';
import { ZillowWebhookController } from './webhooks/zillow/zillow.webhook';
import { GenericLeadWebhookController } from './webhooks/generic/generic-lead.webhook';
import { AuthGuard } from './common/guards/auth.guard';
import { RbacGuard } from './common/guards/rbac.guard';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TenantMiddleware } from './common/middleware/tenant.middleware';
import { AuditLogMiddleware } from './common/middleware/audit-log.middleware';
import { PrismaService } from './modules/prisma/prisma.service';

@Module({
  imports: [
    NestConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    WorkspaceModule,
    LeadModule,
    ConversationModule,
    AgentModule,
    RoutingModule,
  ],
  controllers: [
    TwilioSmsWebhookController,
    TwilioVoiceWebhookController,
    ZillowWebhookController,
    GenericLeadWebhookController,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector, prisma: PrismaService) =>
        new AuthGuard(reflector, prisma),
      inject: [Reflector, PrismaService],
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RbacGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditInterceptor,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware, AuditLogMiddleware)
      .exclude(
        { path: 'v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'v1/webhooks/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
