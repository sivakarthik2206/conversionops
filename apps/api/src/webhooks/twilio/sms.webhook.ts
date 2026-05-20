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
    const url = `${process.env['API_BASE_URL'] ?? 'https://api.conversionops.io'}/v1/webhooks/twilio/sms`;

    const params = body as Record<string, string>;
    if (authToken && signature) {
      const isValid = twilio.validateRequest(authToken, signature, url, params);
      if (!isValid) {
        logger.warn({ messageSid: MessageSid }, 'twilio-sms: invalid signature');
        res.status(HttpStatus.FORBIDDEN).send('<Response/>');
        return;
      }
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
          logger.info({ from: From, keyword: messageBody, workspaceId: workspace.id }, 'twilio-sms: opt-out recorded');
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
