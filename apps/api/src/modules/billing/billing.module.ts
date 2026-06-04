import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { PaddleService } from './paddle.service';
import { PaddleWebhookController } from './paddle.webhook';
import { StripeWebhookController } from './stripe.webhooks';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [BillingController, PaddleWebhookController, StripeWebhookController],
  providers: [BillingService, PaddleService],
  exports: [BillingService, PaddleService],
})
export class BillingModule {}
