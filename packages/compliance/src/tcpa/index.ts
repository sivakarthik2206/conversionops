import { PrismaClient, ConsentStatus, ConsentChannel } from '@conversionops/db';

export const TCPA_OPT_OUT_KEYWORDS = [
  'STOP',
  'STOPALL',
  'UNSUBSCRIBE',
  'CANCEL',
  'END',
  'QUIT',
] as const;

export const QUIET_HOURS_START = 21;
export const QUIET_HOURS_END = 8;

/**
 * Returns true if the message is a TCPA opt-out keyword.
 * Exact match only — trims and uppercases before comparison.
 */
export function isOptOutKeyword(message: string): boolean {
  const normalised = message.trim().toUpperCase();
  return (TCPA_OPT_OUT_KEYWORDS as readonly string[]).includes(normalised);
}

/**
 * Returns true if the current time is within quiet hours (9pm–8am) for the given timezone.
 * Fails SAFE — returns true (blocked) if the timezone is invalid or cannot be parsed.
 */
export function isQuietHours(timezone: string): boolean {
  try {
    const now = new Date();
    const formatted = now.toLocaleString('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
    });
    const hour = parseInt(formatted, 10);
    if (isNaN(hour)) return true;
    return hour >= QUIET_HOURS_START || hour < QUIET_HOURS_END;
  } catch {
    return true;
  }
}

/**
 * Returns the next Date when quiet hours end (8am local time in the given timezone).
 * Returns a same-day or next-day 8am, whichever is in the future.
 */
export function getNextAllowedTime(timezone: string): Date {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      hour12: false,
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const get = (type: string): number =>
      parseInt(parts.find((p) => p.type === type)?.value ?? '0', 10);

    const localYear = get('year');
    const localMonth = get('month') - 1;
    const localDay = get('day');
    const localHour = get('hour');

    // Build 8am in local timezone via UTC offset
    const eightAmLocal = new Date(now);
    const daysToAdd = localHour >= QUIET_HOURS_END ? 1 : 0;
    eightAmLocal.setDate(eightAmLocal.getDate() + daysToAdd);

    // Approximate: find the UTC time that corresponds to 8am local
    // We use the offset: local time - utc time
    const utcMs = Date.UTC(localYear, localMonth, localDay + daysToAdd, QUIET_HOURS_END, 0, 0);
    const localOffsetMs = now.getTime() - new Date(now.toLocaleString('en-US', { timeZone: timezone })).getTime();
    return new Date(utcMs + localOffsetMs);
  } catch {
    // Fail safe — return 8am UTC tomorrow
    const tomorrow = new Date();
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    tomorrow.setUTCHours(QUIET_HOURS_END, 0, 0, 0);
    return tomorrow;
  }
}

/**
 * Checks whether a phone has an active OPTED_IN consent record in the given workspace.
 * @returns true if consent is valid and present, false otherwise
 */
export async function validateConsent(
  phone: string,
  workspaceId: string,
  prisma: PrismaClient,
): Promise<boolean> {
  const record = await prisma.consentRecord.findFirst({
    where: {
      phone,
      workspaceId,
      status: ConsentStatus.OPTED_IN,
      optedOutAt: null,
      deletedAt: null,
    },
  });
  return record !== null;
}

/**
 * Records a TCPA opt-out. Upserts a ConsentRecord with OPTED_OUT status.
 * Must be called immediately when an opt-out keyword is received.
 */
export async function processOptOut(
  phone: string,
  workspaceId: string,
  keyword: string,
  prisma: PrismaClient,
): Promise<void> {
  const existing = await prisma.consentRecord.findFirst({
    where: { phone, workspaceId, channel: ConsentChannel.SMS, deletedAt: null },
  });

  if (existing) {
    await prisma.consentRecord.update({
      where: { id: existing.id },
      data: {
        status: ConsentStatus.OPTED_OUT,
        optedOutAt: new Date(),
        optOutKeyword: keyword.toUpperCase(),
        optOutChannel: 'SMS',
      },
    });
  } else {
    await prisma.consentRecord.create({
      data: {
        workspaceId,
        phone,
        channel: ConsentChannel.SMS,
        status: ConsentStatus.OPTED_OUT,
        optedOutAt: new Date(),
        optOutKeyword: keyword.toUpperCase(),
        optOutChannel: 'SMS',
      },
    });
  }
}
