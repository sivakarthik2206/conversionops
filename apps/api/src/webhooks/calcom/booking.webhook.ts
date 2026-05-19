import {
  Body, Controller, Headers, HttpCode, HttpStatus, Post,
  RawBodyRequest, Req, UnauthorizedException, BadRequestException,
} from '@nestjs/common';
import { createHmac } from 'crypto';
import { Request } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { IdempotencyService, queues } from '@conversionops/orchestration';
import { parseCalComWebhook } from '@conversionops/integrations';
import { TwilioClient } from '@conversionops/integrations';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import { CreateAppointmentHandler } from '../../modules/appointment/commands/create-appointment.handler';
import { CreateAppointmentCommand } from '../../modules/appointment/commands/create-appointment.command';
import { UpdateAppointmentHandler } from '../../modules/appointment/commands/update-appointment.handler';
import { UpdateAppointmentCommand } from '../../modules/appointment/commands/update-appointment.command';
import { NotificationType } from '@conversionops/db';

@Controller('webhooks/calcom')
@Public()
export class CalComWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(
    private readonly prisma: PrismaService,
    private readonly createAppointmentHandler: CreateAppointmentHandler,
    private readonly updateAppointmentHandler: UpdateAppointmentHandler,
  ) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Handles Cal.com booking webhooks. Verifies HMAC signature before processing.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async handleCalComWebhook(
    @Body() body: unknown,
    @Headers('x-cal-signature-256') signature: string,
    @Req() req: RawBodyRequest<Request>,
  ): Promise<{ received: boolean }> {
    const secret = process.env['CALCOM_WEBHOOK_SECRET'] ?? '';
    const rawBody = (req.rawBody ?? Buffer.from(JSON.stringify(body))).toString('utf8');

    if (secret) {
      const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
      if (signature !== expected) {
        throw new UnauthorizedException('Invalid Cal.com webhook signature');
      }
    }

    const parseResult = parseCalComWebhook(body);
    if (!parseResult.ok) {
      throw new BadRequestException(`Invalid webhook payload: ${parseResult.error.message}`);
    }

    const { triggerEvent, payload } = parseResult.value;
    const idempotencyKey = `calcom:${payload.uid}:${triggerEvent}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'calcom');
      if (cached !== null) return { received: true };
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return { received: true };
      logger.error({ err, uid: payload.uid }, 'calcom: idempotency acquire failed');
    }

    try {
      if (triggerEvent === 'BOOKING_CREATED') {
        await this.handleBookingCreated(payload);
      } else if (triggerEvent === 'BOOKING_CANCELLED') {
        await this.handleBookingCancelled(payload);
      } else if (triggerEvent === 'BOOKING_RESCHEDULED') {
        await this.handleBookingRescheduled(payload);
      }

      await this.idempotencyService.complete(idempotencyKey, { processed: triggerEvent });
    } catch (err) {
      logger.error({ err, uid: payload.uid, triggerEvent }, 'calcom: webhook processing error');
      try { await this.idempotencyService.fail(idempotencyKey); } catch { /* ignore */ }
    }

    return { received: true };
  }

  private async handleBookingCreated(payload: { uid: string; startTime: string; endTime: string; attendees: Array<{ email: string; name?: string; timeZone?: string }>; organizer?: { email?: string }; responses?: { phone?: { value: string } } }): Promise<void> {
    const organizerEmail = payload.organizer?.email;
    const phone = payload.responses?.phone?.value ?? payload.attendees[0]?.email;
    const attendeeTimezone = payload.attendees[0]?.timeZone ?? 'America/New_York';

    const workspace = organizerEmail
      ? await this.prisma.workspace.findFirst({
          where: { ownerEmail: organizerEmail, deletedAt: null },
        })
      : null;

    if (!workspace) {
      logger.warn({ organizerEmail }, 'calcom: no workspace found for organizer, skipping');
      return;
    }

    const lead = phone
      ? await this.prisma.lead.findFirst({
          where: {
            workspaceId: workspace.id,
            OR: [
              { phone },
              { email: phone },
            ],
            deletedAt: null,
          },
        })
      : null;

    const scheduledAt = new Date(payload.startTime);
    const endAt = new Date(payload.endTime);
    const durationMinutes = Math.round((endAt.getTime() - scheduledAt.getTime()) / 60000);

    const result = await this.createAppointmentHandler.execute(
      new CreateAppointmentCommand(
        lead?.id ?? '',
        workspace.id,
        scheduledAt,
        attendeeTimezone,
        durationMinutes || 60,
        undefined,
        undefined,
        undefined,
        payload.uid,
      ),
    );

    if (!result.ok) {
      logger.warn({ uid: payload.uid }, 'calcom: appointment creation failed');
      return;
    }

    if (lead?.phone && workspace.twilioNumber) {
      const aiConfig = workspace.aiConfig as Record<string, unknown>;
      const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'your agent';
      const dateStr = scheduledAt.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const timeStr = scheduledAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: attendeeTimezone });

      const twilioClient = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        workspace.twilioNumber,
      );
      await twilioClient
        .sendSMS({
          to: lead.phone,
          body: `Your appointment with ${agentName} is confirmed for ${dateStr} at ${timeStr}. We will send a reminder the day before.`,
          workspaceId: workspace.id,
          workspaceTimezone: workspace.timezone,
        }, this.prisma)
        .catch((err: unknown) => logger.error({ err }, 'calcom: confirmation SMS failed'));
    }

    await queues.notification
      .add('appointment-booked-ws', {
        workspaceId: workspace.id,
        type: NotificationType.APPOINTMENT_BOOKED,
        payload: { appointmentId: result.value.id, uid: payload.uid },
        isOpsAlert: false,
      }, { removeOnComplete: 500 })
      .catch(() => undefined);
  }

  private async handleBookingCancelled(payload: { uid: string; startTime: string }): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { externalBookingId: payload.uid, deletedAt: null },
      include: { lead: { select: { phone: true, workspaceId: true } }, workspace: { select: { twilioNumber: true, aiConfig: true, timezone: true } } },
    });
    if (!appointment) return;

    await this.updateAppointmentHandler.execute(
      new UpdateAppointmentCommand(
        appointment.id,
        appointment.workspaceId,
        undefined,
        'CANCELLED',
        undefined,
        undefined,
        'Cancelled via Cal.com',
      ),
    );

    await queues.notification
      .add('appointment-cancelled', {
        workspaceId: appointment.workspaceId,
        type: NotificationType.APPOINTMENT_BOOKED,
        payload: { appointmentId: appointment.id, cancelled: true },
        isOpsAlert: false,
      }, { removeOnComplete: 500 })
      .catch(() => undefined);

    if (appointment.lead?.phone && appointment.workspace?.twilioNumber) {
      const twilioClient = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        appointment.workspace.twilioNumber,
      );
      await twilioClient
        .sendSMS({
          to: appointment.lead.phone,
          body: 'Your appointment has been cancelled. Reply to reschedule.',
          workspaceId: appointment.workspaceId,
          workspaceTimezone: appointment.workspace.timezone,
        }, this.prisma)
        .catch((err: unknown) => logger.error({ err }, 'calcom: cancellation SMS failed'));
    }
  }

  private async handleBookingRescheduled(payload: { uid: string; startTime: string }): Promise<void> {
    const appointment = await this.prisma.appointment.findFirst({
      where: { externalBookingId: payload.uid, deletedAt: null },
      include: { lead: { select: { phone: true } }, workspace: { select: { twilioNumber: true, aiConfig: true, timezone: true } } },
    });
    if (!appointment) return;

    const newTime = new Date(payload.startTime);
    await this.updateAppointmentHandler.execute(
      new UpdateAppointmentCommand(
        appointment.id,
        appointment.workspaceId,
        newTime,
        'RESCHEDULED',
      ),
    );

    if (appointment.lead?.phone && appointment.workspace?.twilioNumber) {
      const aiConfig = appointment.workspace.aiConfig as Record<string, unknown>;
      const agentName = typeof aiConfig['agentName'] === 'string' ? aiConfig['agentName'] : 'your agent';
      const dateStr = newTime.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
      const timeStr = newTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: appointment.timezone });

      const twilioClient = new TwilioClient(
        process.env['TWILIO_ACCOUNT_SID'] ?? '',
        process.env['TWILIO_AUTH_TOKEN'] ?? '',
        appointment.workspace.twilioNumber,
      );
      await twilioClient
        .sendSMS({
          to: appointment.lead.phone,
          body: `Your appointment with ${agentName} has been rescheduled to ${dateStr} at ${timeStr}.`,
          workspaceId: appointment.workspaceId,
          workspaceTimezone: appointment.workspace.timezone,
        }, this.prisma)
        .catch((err: unknown) => logger.error({ err }, 'calcom: reschedule SMS failed'));
    }
  }
}
