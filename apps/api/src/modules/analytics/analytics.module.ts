import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { GetFunnelHandler } from './queries/get-funnel.handler';
import { GetResponseTimesHandler } from './queries/get-response-times.handler';
import { GetSourceBreakdownHandler } from './queries/get-source-breakdown.handler';

@Module({
  controllers: [AnalyticsController],
  providers: [GetFunnelHandler, GetResponseTimesHandler, GetSourceBreakdownHandler],
  exports: [GetFunnelHandler, GetResponseTimesHandler, GetSourceBreakdownHandler],
})
export class AnalyticsModule {}
