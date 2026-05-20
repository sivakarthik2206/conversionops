import twilio from 'twilio';
import type { Twilio } from 'twilio';
import type { PrismaClient } from '@conversionops/db';
import { ConsentChannel, ConsentStatus } from '@conversionops/db';
import { TCPAViolationError, ExternalServiceError } from '@conversionops/sdk-standards';
import type { Result } from '@conversionops/types';

export interface SendSMSOptions {
  to: string;
  body: string;
  workspaceId: string;
}

export class TwilioClient {
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  /**
   * Sends an SMS message. Performs TCPA consent check when prisma is provided.
   * @returns Result<messageSid> — never throws
   */
  async sendSMS(options: SendSMSOptions, prisma?: PrismaClient): Promise<Result<string>> {
    const { to, body, workspaceId } = options;

    if (prisma) {
      const consentRecord = await prisma.consentRecord.findFirst({
        where: { phone: to, workspaceId, channel: ConsentChannel.SMS, status: ConsentStatus.OPTED_IN },
      });
      if (!consentRecord) {
        return {
          ok: false,
          error: new TCPAViolationError(to, 'No OPTED_IN consent record found'),
        };
      }
    }

    try {
      const message = await this.client.messages.create({
        to,
        from: this.fromNumber,
        body,
      });
      return { ok: true, value: message.sid };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Twilio', error instanceof Error ? error.message : String(error)),
      };
    }
  }

  /**
   * Validates a Twilio webhook request signature.
   * Must be called before processing any webhook payload.
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
    authToken: string,
  ): boolean {
    return twilio.validateRequest(authToken, signature, url, params);
  }

  /**
   * Provisions a new phone number in the given area code.
   * @returns Result<{ number, sid }>
   */
  async provisionPhoneNumber(areaCode: string): Promise<Result<{ number: string; sid: string }>> {
    try {
      const available = await this.client.availablePhoneNumbers('US').local.list({
        areaCode: parseInt(areaCode, 10),
        limit: 1,
      });

      if (!available[0]) {
        return { ok: false, error: new ExternalServiceError('Twilio', `No numbers available in area code ${areaCode}`) };
      }

      const purchased = await this.client.incomingPhoneNumbers.create({
        phoneNumber: available[0].phoneNumber,
      });

      return { ok: true, value: { number: purchased.phoneNumber, sid: purchased.sid } };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Twilio', error instanceof Error ? error.message : String(error)),
      };
    }
  }
}
