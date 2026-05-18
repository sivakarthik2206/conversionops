import { Module } from "@nestjs/common";
// Processors registered phase by phase
// Phase 4: LeadIntakeProcessor, AiResponseProcessor, QualificationProcessor
// Phase 5: CrmSyncProcessor, MissedCallProcessor
// Phase 9: AppointmentBookingProcessor, ReactivationProcessor

@Module({
  imports: [],
  providers: [],
})
export class WorkerModule {}
