import twilio from 'twilio';
import type { Twilio } from 'twilio';
import type { PrismaClient } from '@conversionops/db';
import { ConsentChannel, ConsentStatus } from '@conversionops/db';
import { TCPAViolationError, ExternalServiceError } from '@conversionops/sdk-standards';
import type { Result } from '@conversionops/types';

/**
 * TCPA purpose discriminator.
 * - 'customer'  → outbound to a lead. Requires OPTED_IN ConsentRecord AND not-quiet-hours.
 * - 'internal'  → operational alert to a workspace user (agent/admin). Skips consent check
 *                 (workspace users have business relationship, not TCPA-protected for
 *                 transactional alerts) but still rejects if an OPTED_OUT record exists.
 *                 Internal sends ignore quiet hours (alerts are time-sensitive).
 */
export type SendSMSPurpose = 'customer' | 'internal';

export interface SendSMSOptions {
  to: string;
  body: string;
  workspaceId: string;
  purpose: SendSMSPurpose;
  /** IANA timezone for quiet-hours check. Required when purpose === 'customer'. */
  timezone?: string;
}

const QUIET_HOURS_START = 21;
const QUIET_HOURS_END = 8;

/**
 * Returns true if the given timezone is currently within quiet hours (21:00–08:00 local).
 * Fails SAFE — invalid timezone returns true (blocks send).
 */
function isWithinQuietHours(timezone: string): boolean {
  try {
    const hourStr = new Date().toLocaleString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const hour = parseInt(hourStr, 10);
    if (isNaN(hour)) return true;
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  } catch {
    return true;
  }
}

export class TwilioClient {
  private readonly client: Twilio;
  private readonly fromNumber: string;

  constructor(accountSid: string, authToken: string, fromNumber: string) {
    this.client = twilio(accountSid, authToken);
    this.fromNumber = fromNumber;
  }

  /**
   * Sends an SMS. Enforces the TCPA pre-send checklist inside the wrapper so that
   * compliance cannot be bypassed by a caller forgetting to gate upstream.
   *
   * Customer purpose:
   *   • requires an OPTED_IN ConsentRecord (no opt-out, not soft-deleted)
   *   • requires not-quiet-hours in the supplied timezone
   * Internal purpose:
   *   • rejects if an OPTED_OUT ConsentRecord exists for the recipient
   *   • ignores quiet hours (operational alerts)
   *
   * @returns Result<messageSid> — never throws
   */
  async sendSMS(options: SendSMSOptions, prisma: PrismaClient): Promise<Result<string>> {
    const { to, body, workspaceId, purpose, timezone } = options;

    if (purpose === 'customer') {
      if (!timezone) {
        return {
          ok: false,
          error: new TCPAViolationError(to, 'Customer SMS requires timezone for quiet-hours check'),
        };
      }
      if (isWithinQuietHours(timezone)) {
        return {
          ok: false,
          error: new TCPAViolationError(to, `Quiet hours in ${timezone}`),
        };
      }
      const consent = await prisma.consentRecord.findFirst({
        where: {
          phone: to,
          workspaceId,
          channel: ConsentChannel.SMS,
          status: ConsentStatus.OPTED_IN,
          optedOutAt: null,
          deletedAt: null,
        },
      });
      if (!consent) {
        return {
          ok: false,
          error: new TCPAViolationError(to, 'No OPTED_IN consent record found'),
        };
      }
    } else {
      // internal — block if recipient explicitly opted out
      const optOut = await prisma.consentRecord.findFirst({
        where: {
          phone: to,
          workspaceId,
          channel: ConsentChannel.SMS,
          status: ConsentStatus.OPTED_OUT,
          deletedAt: null,
        },
      });
      if (optOut) {
        return {
          ok: false,
          error: new TCPAViolationError(to, 'Recipient has opted out'),
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
