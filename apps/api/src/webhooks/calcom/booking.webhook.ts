import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { IdempotencyService } from '@conversionops/orchestration';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { parseCalComWebhook } from '@conversionops/integrations';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import type { Prisma } from '@conversionops/db';
import { PrismaService } from '../../modules/prisma/prisma.service';

@Controller('webhooks/calcom')
@Public()
export class CalComWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleBookingWebhook(
    @Body() body: Record<string, unknown>,
    @Headers('x-cal-signature-256') signature: string,
  ): Promise<{ received: boolean }> {
    const webhookSecret = process.env['CALCOM_WEBHOOK_SECRET'];

    if (webhookSecret && signature) {
      const expectedSig = createHmac('sha256', webhookSecret)
        .update(JSON.stringify(body))
        .digest('hex');
      if (signature !== expectedSig) {
        logger.warn('calcom-webhook: invalid signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    let event: ReturnType<typeof parseCalComWebhook>;
    try {
      event = parseCalComWebhook(body);
    } catch (err) {
      logger.warn({ err }, 'calcom-webhook: failed to parse payload');
      return { received: true };
    }

    const bookingUid = String(body['uid'] ?? body['bookingId'] ?? '');
    if (!bookingUid) {
      return { received: true };
    }

    const idempotencyKey = `calcom:booking:${bookingUid}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'calcom');
      if (cached !== null) {
        return { received: true };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return { received: true };
      }
    }

    try {
      await this.processEvent(event, bookingUid);
      await this.idempotencyService.complete(idempotencyKey, { processed: true });
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, bookingUid }, 'calcom-webhook: processing failed');
    }

    return { received: true };
  }

  private async processEvent(
    eventResult: ReturnType<typeof parseCalComWebhook>,
    bookingUid: string,
  ): Promise<void> {
    if (!eventResult.ok) {
      logger.error({ err: eventResult.error }, 'calcom-webhook: invalid event payload');
      return;
    }
    const event = eventResult.value;

    if (event.triggerEvent === 'BOOKING_CREATED') {
      const attendeeEmail = event.payload.attendees[0]?.email;
      if (!attendeeEmail) return;

      const lead = await this.prisma.lead.findFirst({
        where: { email: attendeeEmail, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (!lead) {
        logger.warn({ attendeeEmail, bookingUid }, 'calcom-webhook: no lead found for attendee');
        return;
      }

      await this.prisma.appointment.create({
        data: {
          workspaceId: lead.workspaceId,
          leadId: lead.id,
          externalBookingId: bookingUid,
          scheduledAt: new Date(event.payload.startTime),
          durationMinutes: Math.round((new Date(event.payload.endTime).getTime() - new Date(event.payload.startTime).getTime()) / 60000),
          timezone: event.payload.attendees[0]?.timeZone ?? 'UTC',
          status: 'CONFIRMED',
          externalPayload: event.payload as unknown as Prisma.InputJsonValue,
        },
      });

      await queues.aiResponse.add(
        'appointment-confirmed-notify',
        { leadId: lead.id, workspaceId: lead.workspaceId, bookingUid },
        { removeOnComplete: 1000 },
      );

      logger.info({ leadId: lead.id, workspaceId: lead.workspaceId, bookingUid }, 'calcom-webhook: appointment created');
    } else if (event.triggerEvent === 'BOOKING_CANCELLED') {
      await this.prisma.appointment.updateMany({
        where: { externalBookingId: bookingUid },
        data: { status: 'CANCELLED' },
      });

      logger.info({ bookingUid }, 'calcom-webhook: appointment cancelled');
    }
  }
}
