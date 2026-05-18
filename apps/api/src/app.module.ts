mport { Module } from "@nestjs/common";
import { ConfigModule } from "./config/config.module";
// Modules added phase by phase — see build order
// Phase 2: PrismaModule, AuthModule, WorkspaceModule
// Phase 3: RBAC, TenantMiddleware
// Phase 4: OrchestrationModule
// Phase 5: LeadModule, ConversationModule, WebhooksModule
// Phase 6: RealtimeGateway

@Module({
  imports: [
    ConfigModule,
    // PrismaModule,     // Phase 2
    // AuthModule,       // Phase 2
    // WorkspaceModule,  // Phase 2
    // LeadModule,       // Phase 3
    // ConversationModule, // Phase 3
  ],
})
export class AppModule {}
