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
import { queues } from '@conversionops/orchestration';
import { logger } from '@conversionops/observability';
import { PrismaService } from '../../modules/prisma/prisma.service';

interface TwilioVoiceWebhookBody {
  CallSid?: string;
  From?: string;
  To?: string;
  CallStatus?: string;
  [key: string]: string | undefined;
}

@Controller('webhooks/twilio/voice')
@Public()
export class TwilioVoiceWebhookController {
  private readonly idempotencyService: IdempotencyService;

  constructor(private readonly prisma: PrismaService) {
    this.idempotencyService = new IdempotencyService(prisma);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  async handleVoice(
    @Req() req: Request,
    @Res() res: Response,
    @Headers('x-twilio-signature') signature: string,
  ): Promise<void> {
    const body = req.body as TwilioVoiceWebhookBody;
    const { CallSid, From, To, CallStatus } = body;

    const authToken = process.env['TWILIO_AUTH_TOKEN'] ?? '';
    const url = `${process.env['API_BASE_URL'] ?? 'https://api.conversionops.io'}/v1/webhooks/twilio/voice`;

    const params = body as Record<string, string>;
    if (authToken && signature) {
      const isValid = twilio.validateRequest(authToken, signature, url, params);
      if (!isValid) {
        logger.warn({ callSid: CallSid }, 'twilio-voice: invalid signature');
        res.status(HttpStatus.FORBIDDEN).type('text/xml').send('<Response/>');
        return;
      }
    }

    if (!CallSid || !From || !To) {
      res.status(HttpStatus.OK).type('text/xml').send('<Response><Hangup/></Response>');
      return;
    }

    if (CallStatus !== 'no-answer' && CallStatus !== 'busy' && CallStatus !== 'failed') {
      res.status(HttpStatus.OK).type('text/xml').send('<Response><Hangup/></Response>');
      return;
    }

    const idempotencyKey = `twilio:voice:${CallSid}`;

    try {
      const cached = await this.idempotencyService.acquire(idempotencyKey, 'twilio-voice');
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
      const workspace = await this.prisma.workspace.findFirst({
        where: { twilioNumber: To },
      });

      if (!workspace) {
        logger.warn({ to: To }, 'twilio-voice: no workspace for number');
        await this.idempotencyService.complete(idempotencyKey, { skipped: true });
        res.status(HttpStatus.OK).type('text/xml').send('<Response><Hangup/></Response>');
        return;
      }

      await queues.missedCall.add(
        'missed-call',
        {
          workspaceId: workspace.id,
          fromNumber: From,
          toNumber: To,
          callSid: CallSid,
        },
        { priority: 1, removeOnComplete: 1000 },
      );

      await this.idempotencyService.complete(idempotencyKey, { enqueued: true });
      logger.info({ callSid: CallSid, from: From, workspaceId: workspace.id }, 'twilio-voice: missed call enqueued');
    } catch (err) {
      await this.idempotencyService.fail(idempotencyKey).catch(() => undefined);
      logger.error({ err, callSid: CallSid }, 'twilio-voice: processing error');
    }

    res.status(HttpStatus.OK).type('text/xml').send('<Response><Hangup/></Response>');
  }
}
