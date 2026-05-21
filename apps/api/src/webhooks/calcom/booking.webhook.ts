import {
  Controller,
  Post,
  Req,
  HttpCode,
  HttpStatus,
  Headers,
  BadRequestException,
  RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { createHmac, timingSafeEqual } from 'crypto';
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
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-cal-signature-256') signature: string,
  ): Promise<{ received: boolean }> {
    const webhookSecret = process.env['CALCOM_WEBHOOK_SECRET'];
    const isProd = process.env['NODE_ENV'] === 'production';

    if (!webhookSecret) {
      if (isProd) {
        logger.error('calcom-webhook: CALCOM_WEBHOOK_SECRET not configured — refusing webhook (fail-closed)');
        throw new BadRequestException('Webhook not configured');
      }
      logger.warn('calcom-webhook: CALCOM_WEBHOOK_SECRET not configured — signature check skipped (dev only)');
    }

    const rawBody = req.rawBody;
    if (webhookSecret) {
      if (!rawBody || !signature) {
        throw new BadRequestException('Missing signature or raw body');
      }
      const expected = createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      let providedBuf: Buffer;
      try {
        providedBuf = Buffer.from(signature, 'hex');
      } catch {
        throw new BadRequestException('Invalid signature format');
      }
      if (expectedBuf.length !== providedBuf.length || !timingSafeEqual(expectedBuf, providedBuf)) {
        logger.warn('calcom-webhook: invalid signature');
        throw new BadRequestException('Invalid webhook signature');
      }
    }

    const body = req.body as Record<string, unknown>;
    const event = parseCalComWebhook(body);
    if (!event.ok) {
      logger.warn({ err: event.error }, 'calcom-webhook: failed to parse payload');
      return { received: true };
    }

    const bookingUid = event.value.payload.uid;
    const idempotencyKey = `calcom:booking:${event.value.triggerEvent}:${bookingUid}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'calcom');
      if (cached !== null) {
        return { received: true };
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        return { received: true };
      }
      throw err;
    }

    try {
      await this.processEvent(event.value, bookingUid);
      await this.idempotencyService.complete(idempotencyKey, { processed: true });
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, bookingUid }, 'calcom-webhook: processing failed');
    }

    return { received: true };
  }

  private async processEvent(
    event: NonNullable<Extract<ReturnType<typeof parseCalComWebhook>, { ok: true }>['value']>,
    bookingUid: string,
  ): Promise<void> {
    const workspaceId = await this.resolveWorkspaceId(event);
    if (!workspaceId) {
      logger.warn({ bookingUid, eventTypeId: event.payload.eventTypeId }, 'calcom-webhook: cannot attribute booking to workspace, skipping');
      return;
    }

    if (event.triggerEvent === 'BOOKING_CREATED') {
      const attendeeEmail = event.payload.attendees[0]?.email;
      if (!attendeeEmail) return;

      // Tenant-scoped lead lookup — never cross workspaces.
      const lead = await this.prisma.lead.findFirst({
        where: { email: attendeeEmail, workspaceId, deletedAt: null },
        orderBy: { createdAt: 'desc' },
      });

      if (!lead) {
        logger.warn({ attendeeEmail, bookingUid, workspaceId }, 'calcom-webhook: no lead found for attendee in workspace');
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
      // Tenant-scoped — never update appointments outside the resolved workspace.
      await this.prisma.appointment.updateMany({
        where: { externalBookingId: bookingUid, workspaceId },
        data: { status: 'CANCELLED' },
      });

      logger.info({ bookingUid, workspaceId }, 'calcom-webhook: appointment cancelled');
    }
  }

  /**
   * Maps a Cal.com booking to its workspace.
   *
   * Strategy:
   *  1. If payload.eventTypeId is present, find the unique workspace that has
   *     stored this eventTypeId in aiConfig.calcomEventTypeId.
   *  2. If multiple workspaces match the same eventTypeId, refuse to attribute
   *     (returns null — caller logs and skips). This is the safe default; an
   *     operator should make eventTypeIds unique per workspace.
   *
   * Without a confident workspace match we refuse to write, eliminating the
   * cross-tenant attribution risk that existed when leads were looked up by
   * email alone across all workspaces.
   */
  private async resolveWorkspaceId(
    event: Extract<ReturnType<typeof parseCalComWebhook>, { ok: true }>['value'],
  ): Promise<string | null> {
    const eventTypeId = event.payload.eventTypeId;
    if (!eventTypeId) return null;

    const matches = await this.prisma.workspace.findMany({
      where: {
        aiConfig: { path: ['calcomEventTypeId'], equals: eventTypeId },
        deletedAt: null,
      },
      select: { id: true },
      take: 2,
    });

    if (matches.length !== 1) {
      if (matches.length > 1) {
        logger.error({ eventTypeId, matchCount: matches.length }, 'calcom-webhook: eventTypeId maps to multiple workspaces, refusing');
      }
      return null;
    }
    return matches[0]!.id;
  }
}
