import twilio from 'twilio';
import { validateRequest } from 'twilio/lib/webhooks/webhooks';
import { PrismaClient } from '@conversionops/db';
import { validateConsent, isQuietHours } from '@conversionops/compliance';
import { TCPAViolationError, ExternalServiceError } from '@conversionops/sdk-standards';
import type { Result } from '@conversionops/types';

export interface SendSMSOptions {
  to: string;
  body: string;
  workspaceId: string;
  workspaceTimezone?: string;
}

export interface ProvisionedNumber {
  number: string;
  sid: string;
}

export class TwilioClient {
  private readonly client: ReturnType<typeof twilio>;

  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly fromNumber: string,
  ) {
    this.client = twilio(accountSid, authToken);
  }

  /**
   * Sends an SMS after TCPA validation. Throws TCPAViolationError if consent
   * is missing or quiet hours are active. Never call without going through these checks.
   * @returns Result<string> with messageSid on success
   */
  async sendSMS(options: SendSMSOptions, prisma: PrismaClient): Promise<Result<string>> {
    const hasConsent = await validateConsent(options.to, options.workspaceId, prisma);
    if (!hasConsent) {
      throw new TCPAViolationError(options.to, 'no_consent');
    }

    const timezone = options.workspaceTimezone ?? 'America/New_York';
    if (isQuietHours(timezone)) {
      throw new TCPAViolationError(options.to, 'quiet_hours');
    }

    try {
      const message = await this.client.messages.create({
        to: options.to,
        from: this.fromNumber,
        body: options.body,
      });
      return { ok: true, value: message.sid };
    } catch (err) {
      return {
        ok: false,
        error: new ExternalServiceError(
          'twilio',
          `SMS send failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      };
    }
  }

  /**
   * Validates that a webhook request originated from Twilio.
   * @param signature - X-Twilio-Signature header value
   * @param url - The full webhook URL including query string
   * @param params - POST body params sent by Twilio
   * @param authToken - Twilio auth token for this workspace
   */
  validateWebhookSignature(
    signature: string,
    url: string,
    params: Record<string, string>,
    authToken: string,
  ): boolean {
    try {
      return validateRequest(authToken, signature, url, params);
    } catch {
      return false;
    }
  }

  /**
   * Provisions a new Twilio phone number in the given area code.
   * @param areaCode - 3-digit US area code
   * @returns Result<ProvisionedNumber>
   */
  async provisionPhoneNumber(areaCode: string): Promise<Result<ProvisionedNumber>> {
    try {
      const available = await this.client
        .availablePhoneNumbers('US')
        .local.list({ areaCode: parseInt(areaCode, 10), limit: 1 });

      if (available.length === 0) {
        return {
          ok: false,
          error: new ExternalServiceError('twilio', `No numbers available in area code ${areaCode}`),
        };
      }

      const phoneNumber = available[0]?.phoneNumber;
      if (!phoneNumber) {
        return {
          ok: false,
          error: new ExternalServiceError('twilio', 'Phone number search returned empty result'),
        };
      }

      const purchased = await this.client.incomingPhoneNumbers.create({ phoneNumber });
      return { ok: true, value: { number: purchased.phoneNumber, sid: purchased.sid } };
    } catch (err) {
      return {
        ok: false,
        error: new ExternalServiceError(
          'twilio',
          `Number provisioning failed: ${err instanceof Error ? err.message : String(err)}`,
        ),
      };
    }
  }
}
