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
import { Public } from '../../common/decorators/public.decorator';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { queues, IdempotencyService } from '@conversionops/orchestration';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';

import { isOptOutKeyword, validateConsent } from '@conversionops/compliance';
import { logger } from '@conversionops/observability';
import { IdempotencyConflictError } from '@conversionops/sdk-standards';
import { ConsentStatus } from '@conversionops/db';

const TWIML_HOLD = '<?xml version="1.0" encoding="UTF-8"?><Response><Say>Please hold, connecting you shortly.</Say></Response>';

interface TwilioVoiceBody {
  CallSid: string;
  From: string;
  To: string;
  CallStatus?: string;
  [key: string]: string | undefined;
}

@Controller('webhooks/twilio')
@Public()
export class TwilioVoiceWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  /**
   * Handles missed call webhooks from Twilio.
   * Enqueues missed-call job at highest priority for 8-second text-back SLA.
   */
  @Post('voice')
  @HttpCode(HttpStatus.OK)
  async handleVoice(
    @Body() body: TwilioVoiceBody,
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

    const idempotencyKey = `twilio:voice:${body.CallSid}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'twilio');
      if (cached !== null) return TWIML_HOLD;
    } catch (err) {
      if (err instanceof IdempotencyConflictError) return TWIML_HOLD;
      logger.error({ err, callSid: body.CallSid }, 'twilio/voice: idempotency acquire failed');
    }

    try {
      const fromPhone = body.From;
      const toPhone = body.To;

      const existingConsent = await this.prisma.consentRecord.findFirst({
        where: { phone: fromPhone, status: ConsentStatus.OPTED_IN, optedOutAt: null, deletedAt: null },
      });

      if (!existingConsent) {
        logger.info({ phone: fromPhone }, 'twilio/voice: no consent, skipping');
        await this.idempotencyService.complete(idempotencyKey, { skipped: 'no_consent' });
        return TWIML_HOLD;
      }

      if (isOptOutKeyword(fromPhone)) {
        logger.info({ phone: fromPhone }, 'twilio/voice: opted-out number, skipping');
        await this.idempotencyService.complete(idempotencyKey, { skipped: 'opted_out' });
        return TWIML_HOLD;
      }

      const workspace = await this.prisma.workspace.findFirst({
        where: { twilioNumber: toPhone, deletedAt: null },
      });

      if (!workspace) {
        logger.warn({ to: toPhone }, 'twilio/voice: no workspace for Twilio number');
        await this.idempotencyService.complete(idempotencyKey, { skipped: 'no_workspace' });
        return TWIML_HOLD;
      }

      await queues.missedCall.add(
        'missed-call',
        {
          workspaceId: workspace.id,
          fromNumber: fromPhone,
          toNumber: toPhone,
          callSid: body.CallSid,
        },
        { removeOnComplete: 500, priority: 1 },
      );

      await this.idempotencyService.complete(idempotencyKey, { queued: true });
      return TWIML_HOLD;
    } catch (err) {
      logger.error({ err, callSid: body.CallSid }, 'twilio/voice: processing error');
      try {
        await this.idempotencyService.fail(idempotencyKey);
      } catch {
        // ignore
      }
      return TWIML_HOLD;
    }
  }
}
