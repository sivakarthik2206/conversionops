import {
  Body,
  Controller,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { Request } from 'express';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues, IdempotencyService } from '@conversionops/orchestration';
import { isOptOutKeyword, processOptOut, validateConsent } from '@conversionops/compliance';
import { logger } from '@conversionops/observability';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { ConsentStatus, ConsentChannel } from '@conversionops/db';

const TWIML_EMPTY = '<?xml version="1.0" encoding="UTF-8"?><Response></Response>';

interface TwilioSmsBody {
  MessageSid: string;
  From: string;
  To: string;
  Body: string;
  AccountSid?: string;
  [key: string]: string | undefined;
}

@Controller('webhooks/twilio')
@Public()
export class TwilioSmsWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Handles inbound Twilio SMS webhooks.
   * Must return TwiML within 5 seconds — all processing is async via queues.
   */
  @Post('sms')
  @HttpCode(HttpStatus.OK)
  async handleSms(
    @Body() body: TwilioSmsBody,
    @Headers('x-twilio-signature') signature: string,
    @Req() req: Request,
  ): Promise<string> {
    const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? '';
    const url = `${req.protocol}://${req.get('host')}${req.originalUrl}`;
    const params: Record<string, string> = {};
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string') params[key] = value;
    }

    const isValid = validateRequest(authToken, signature ?? '', url, params);
    if (!isValid && process.env['NODE_ENV'] === 'production') {
      throw new ForbiddenException('Invalid Twilio signature');
    }

    const idempotencyKey = `twilio:sms:${body.MessageSid}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'twilio');
      if (cached !== null) return TWIML_EMPTY;
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return TWIML_EMPTY;
      logger.error({ err, messageSid: body.MessageSid }, 'twilio/sms: idempotency acquire failed');
    }

    try {
      const fromPhone = body.From;
      const toPhone = body.To;
      const messageBody = body.Body ?? '';

      const workspace = await this.prisma.workspace.findFirst({
        where: { twilioNumber: toPhone, deletedAt: null },
      });

      if (!workspace) {
        logger.warn({ to: toPhone }, 'twilio/sms: no workspace for Twilio number');
        await this.idempotencyService.complete(idempotencyKey, { skipped: 'no_workspace' });
        return TWIML_EMPTY;
      }

      const hasConsent = await validateConsent(fromPhone, workspace.id, this.prisma);

      if (!hasConsent) {
        const normalised = messageBody.trim().toUpperCase();
        if (normalised === 'YES' || normalised === 'START') {
          await this.prisma.consentRecord.create({
            data: {
              workspaceId: workspace.id,
              phone: fromPhone,
              channel: ConsentChannel.SMS,
              status: ConsentStatus.OPTED_IN,
              consentMethod: 'keyword',
              consentText: messageBody,
              consentSource: 'twilio_sms',
            },
          });
          logger.info({ phone: fromPhone, workspaceId: workspace.id }, 'twilio/sms: consent opt-in');
        } else {
          logger.info({ phone: fromPhone, workspaceId: workspace.id }, 'twilio/sms: no consent, dropping message');
          await this.idempotencyService.complete(idempotencyKey, { skipped: 'no_consent' });
          return TWIML_EMPTY;
        }
      }

      if (isOptOutKeyword(messageBody)) {
        await processOptOut(fromPhone, workspace.id, messageBody, this.prisma);
        await this.idempotencyService.complete(idempotencyKey, { optOut: true });
        logger.info({ phone: fromPhone, keyword: messageBody }, 'twilio/sms: opt-out processed');
        return TWIML_EMPTY;
      }

      await queues.leadIntake.add(
        'sms-inbound',
        {
          workspaceId: workspace.id,
          from: fromPhone,
          to: toPhone,
          body: messageBody,
          messageSid: body.MessageSid,
          source: 'SMS_INBOUND',
        },
        { removeOnComplete: 500, priority: 1 },
      );

      await this.idempotencyService.complete(idempotencyKey, { queued: true });
      return TWIML_EMPTY;
    } catch (err) {
      logger.error({ err, messageSid: body.MessageSid }, 'twilio/sms: processing error');
      try {
        await this.idempotencyService.fail(idempotencyKey);
      } catch {
        // ignore failure
      }
      return TWIML_EMPTY;
    }
  }
}
