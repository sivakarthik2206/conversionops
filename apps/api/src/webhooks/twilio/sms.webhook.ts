import {
  Controller,
  Post,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  Headers,
} from '@nestjs/common';
import { Request, Response } from 'express';
import twilio from 'twilio';
import { Public } from '../../common/decorators/public.decorator';
import { IdempotencyService } from '@conversionops/orchestration';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { isOptOutKeyword } from '@conversionops/compliance';
import { ConsentChannel } from '@conversionops/db';
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { ConsentRepository } from '@conversionops/db';
import { buildWebhookUrl } from './webhook-url';

interface TwilioSMSWebhookBody {
  MessageSid?: string;
  From?: string;
  To?: string;
  Body?: string;
  AccountSid?: string;
  [key: string]: string | undefined;
}

@Controller('webhooks/twilio/sms')
@Public()
export class TwilioSMSWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleSMS(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<void> {
    const body = req.body as TwilioSMSWebhookBody;
    const { MessageSid, From, To, Body: messageBody } = body;

    const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? '';
    if (!authToken) {
      logger.error({ messageSid: MessageSid }, 'twilio-sms: TWILIO_AUTH_TOKEN not configured — refusing webhook (fail-closed)');
      res.status(HttpStatus.SERVICE_UNAVAILABLE).type('text/xml').send('<Response/>');
      return;
    }
    if (!signature) {
      logger.warn({ messageSid: MessageSid }, 'twilio-sms: missing x-twilio-signature header');
      res.status(HttpStatus.FORBIDDEN).type('text/xml').send('<Response/>');
      return;
    }

    const url = buildWebhookUrl(req, '/v1/webhooks/twilio/sms');
    const params = body as Record<string, string>;
    if (!twilio.validateRequest(authToken, signature, url, params)) {
      logger.warn({ messageSid: MessageSid, url }, 'twilio-sms: invalid signature');
      res.status(HttpStatus.FORBIDDEN).type('text/xml').send('<Response/>');
      return;
    }

    if (!MessageSid || !From || !To) {
      res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
      return;
    }

    const idempotencyKey = `twilio:sms:${MessageSid}`;
    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'twilio');
      if (cached !== null) {
        res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
        return;
      }
    } catch (err) {
      if (err instanceof IdempotencyConflictError) {
        res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
        return;
      }
    }

    try {
      if (messageBody && isOptOutKeyword(messageBody)) {
        const workspace = await this.prisma.workspace.findFirst({
          where: { twilioNumber: To },
        });
        if (workspace) {
          const consentRepo = new ConsentRepository(this.prisma);
          await consentRepo.upsertOptOut(From, workspace.id, messageBody.trim().toUpperCase(), ConsentChannel.SMS);

          // Halt all active conversations for this phone + workspace immediately.
          // This closes the race window where a queued ai-response job might still
          // pass the opt-out keyword check (it also checks TwilioClient consent, but
          // setting aiActive=false is a belt-and-suspenders guarantee).
          const [affectedConversations] = await Promise.all([
            this.prisma.conversation.findMany({
              where: { workspaceId: workspace.id, aiActive: true, deletedAt: null,
                lead: { phone: From, deletedAt: null } },
              select: { id: true },
            }),
          ]);

          if (affectedConversations.length > 0) {
            const conversationIds = affectedConversations.map((c) => c.id);
            await this.prisma.conversation.updateMany({
              where: { id: { in: conversationIds }, workspaceId: workspace.id },
              data: { aiActive: false, status: 'OPT_OUT' },
            });
          }

          // Transition lead to OPT_OUT in state machine
          const lead = await this.prisma.lead.findFirst({
            where: { phone: From, workspaceId: workspace.id, deletedAt: null },
          });
          if (lead) {
            await this.prisma.lead.update({
              where: { id: lead.id, workspaceId: workspace.id },
              data: { status: 'OPT_OUT' },
            });
          }

          logger.info({ from: From, keyword: messageBody, workspaceId: workspace.id }, 'twilio-sms: opt-out recorded, conversations halted');
        }
        await this.idempotencyService.complete(idempotencyKey, { optOut: true });
        res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
        return;
      }

      const workspace = await this.prisma.workspace.findFirst({
        where: { twilioNumber: To },
      });

      if (!workspace) {
        logger.warn({ to: To }, 'twilio-sms: no workspace for number');
        await this.idempotencyService.complete(idempotencyKey, { skipped: true });
        res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
        return;
      }

      const consentRepo = new ConsentRepository(this.prisma);
      const hasConsent = await consentRepo.hasConsent(From, workspace.id, ConsentChannel.SMS);
      if (!hasConsent) {
        await consentRepo.upsertOptIn(From, workspace.id, ConsentChannel.SMS, 'inbound_sms');
      }

      await queues.leadIntake.add(
        'sms-inbound',
        {
          workspaceId: workspace.id,
          from: From,
          to: To,
          body: messageBody ?? '',
          messageSid: MessageSid,
          source: 'SMS_INBOUND',
        },
        { removeOnComplete: 1000 },
      );

      await this.idempotencyService.complete(idempotencyKey, { enqueued: true });
      logger.info({ messageSid: MessageSid, from: From, workspaceId: workspace.id }, 'twilio-sms: enqueued lead-intake');
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, messageSid: MessageSid }, 'twilio-sms: processing error');
    }

    res.status(HttpStatus.OK).type('text/xml').send('<Response/>');
  }
}
