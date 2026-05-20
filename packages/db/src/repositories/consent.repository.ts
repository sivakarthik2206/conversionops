import { PrismaClient, ConsentRecord, ConsentStatus, ConsentChannel } from '@prisma/client';

export class ConsentRepository {
  constructor(private readonly prisma: PrismaClient) {}

  /**
   * Finds the most recent consent record for a phone number in a workspace.
   */
  async findByPhone(phone: string, workspaceId: string): Promise<ConsentRecord | null> {
    return this.prisma.consentRecord.findFirst({
      where: { phone, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Finds the most recent consent record for an email address in a workspace.
   */
  async findByEmail(email: string, workspaceId: string): Promise<ConsentRecord | null> {
    return this.prisma.consentRecord.findFirst({
      where: { email, workspaceId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Creates or updates a consent record to OPTED_IN status.
   * Finds existing record first; creates if none exists.
   */
  async upsertOptIn(
    phone: string,
    workspaceId: string,
    channel: ConsentChannel,
    source: string,
    leadId?: string,
  ): Promise<ConsentRecord> {
    const existing = await this.prisma.consentRecord.findFirst({
      where: { phone, workspaceId, channel },
    });

    if (existing) {
      return this.prisma.consentRecord.update({
        where: { id: existing.id },
        data: {
          status: ConsentStatus.OPTED_IN,
          consentSource: source,
          optedOutAt: null,
          optOutKeyword: null,
          ...(leadId ? { leadId } : {}),
        },
      });
    }

    return this.prisma.consentRecord.create({
      data: {
        workspaceId,
        phone,
        channel,
        status: ConsentStatus.OPTED_IN,
        consentSource: source,
        ...(leadId ? { leadId } : {}),
      },
    });
  }

  /**
   * Creates or updates a consent record to OPTED_OUT status.
   * Records the opt-out keyword for compliance audit trail.
   */
  async upsertOptOut(
    phone: string,
    workspaceId: string,
    keyword: string,
    channel: ConsentChannel,
  ): Promise<ConsentRecord> {
    const existing = await this.prisma.consentRecord.findFirst({
      where: { phone, workspaceId, channel },
    });

    if (existing) {
      return this.prisma.consentRecord.update({
        where: { id: existing.id },
        data: {
          status: ConsentStatus.OPTED_OUT,
          optedOutAt: new Date(),
          optOutKeyword: keyword,
          optOutChannel: channel,
        },
      });
    }

    return this.prisma.consentRecord.create({
      data: {
        workspaceId,
        phone,
        channel,
        status: ConsentStatus.OPTED_OUT,
        optedOutAt: new Date(),
        optOutKeyword: keyword,
        optOutChannel: channel,
      },
    });
  }

  /**
   * Returns true if there is an active OPTED_IN consent record for the phone+channel.
   * TCPA invariant: must be true before any outbound SMS.
   */
  async hasConsent(phone: string, workspaceId: string, channel: ConsentChannel): Promise<boolean> {
    const record = await this.prisma.consentRecord.findFirst({
      where: { phone, workspaceId, channel, status: ConsentStatus.OPTED_IN },
    });
    return record !== null;
  }
}
