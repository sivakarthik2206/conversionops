import { Injectable } from '@nestjs/common';
import { encrypt, decrypt, maskSecret } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';
import { PrismaService } from '../prisma/prisma.service';

const SENSITIVE_FIELDS: Record<string, string[]> = {
  twilio:        ['authToken'],
  follow_up_boss: ['apiKey'],
  calcom:        ['apiKey'],
  zapier:        [],
  zillow:        [],
  realtor_com:   [],
  website:       [],
};

function encryptionKey(): string {
  const key = process.env['INTEGRATION_ENCRYPTION_KEY'];
  if (!key) throw new Error('INTEGRATION_ENCRYPTION_KEY not configured');
  return key;
}

function encryptConfig(provider: string, raw: Record<string, string>): Record<string, string> {
  const sensitive = SENSITIVE_FIELDS[provider] ?? [];
  const result: Record<string, string> = { ...raw };
  for (const field of sensitive) {
    if (result[field]) {
      result[field] = encrypt(result[field], encryptionKey());
    }
  }
  return result;
}

function decryptConfig(provider: string, stored: Record<string, string>): Record<string, string> {
  const sensitive = SENSITIVE_FIELDS[provider] ?? [];
  const result: Record<string, string> = { ...stored };
  for (const field of sensitive) {
    if (result[field]) {
      try { result[field] = decrypt(result[field], encryptionKey()); } catch { /* corrupted */ }
    }
  }
  return result;
}

function maskConfig(provider: string, stored: Record<string, string>): Record<string, string> {
  const sensitive = SENSITIVE_FIELDS[provider] ?? [];
  const result: Record<string, string> = { ...stored };
  for (const field of sensitive) {
    if (result[field]) {
      const plain = (() => { try { return decrypt(result[field], encryptionKey()); } catch { return result[field]; } })();
      result[field] = maskSecret(plain);
    }
  }
  return result;
}

@Injectable()
export class IntegrationsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(workspaceId: string) {
    const rows = await this.prisma.integrationConfig.findMany({
      where: { workspaceId, deletedAt: null },
      orderBy: { provider: 'asc' },
    });
    return rows.map(r => ({
      provider: r.provider,
      status: r.status,
      lastTestedAt: r.lastTestedAt?.toISOString() ?? null,
      lastTestResult: r.lastTestResult ?? null,
      config: maskConfig(r.provider, r.config as Record<string, string>),
    }));
  }

  /** Returns raw decrypted config for internal use (processors, webhooks). */
  async getRawConfig(workspaceId: string, provider: string): Promise<Record<string, string> | null> {
    const row = await this.prisma.integrationConfig.findUnique({
      where: { workspaceId_provider: { workspaceId, provider } },
    });
    if (!row || row.status !== 'connected' || row.deletedAt) return null;
    return decryptConfig(provider, row.config as Record<string, string>);
  }

  async connect(workspaceId: string, provider: string, rawConfig: Record<string, string>): Promise<Result<Record<string, string>>> {
    // Test connection before saving
    const testResult = await this.testProvider(provider, rawConfig);
    if (!testResult.ok) return testResult;

    const encrypted = encryptConfig(provider, rawConfig);

    // Side effect: update workspace Twilio number
    if (provider === 'twilio' && rawConfig['phoneNumber']) {
      await this.prisma.workspace.update({
        where: { id: workspaceId },
        data: { twilioNumber: rawConfig['phoneNumber'] },
      }).catch(e => logger.warn({ e }, 'Failed to update twilioNumber on workspace'));
    }

    await this.prisma.integrationConfig.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      create: {
        workspaceId,
        provider,
        status: 'connected',
        config: encrypted,
        lastTestedAt: new Date(),
        lastTestResult: testResult.value.message,
      },
      update: {
        status: 'connected',
        config: encrypted,
        lastTestedAt: new Date(),
        lastTestResult: testResult.value.message,
        deletedAt: null,
      },
    });

    logger.info({ workspaceId, provider }, 'Integration connected');
    return { ok: true, value: maskConfig(provider, encrypted) };
  }

  async disconnect(workspaceId: string, provider: string): Promise<void> {
    await this.prisma.integrationConfig.updateMany({
      where: { workspaceId, provider, deletedAt: null },
      data: { status: 'disconnected', config: {}, deletedAt: new Date() },
    });
    logger.info({ workspaceId, provider }, 'Integration disconnected');
  }

  async test(workspaceId: string, provider: string): Promise<Result<{ message: string; latencyMs: number }>> {
    const raw = await this.getRawConfig(workspaceId, provider);
    if (!raw) return { ok: false, error: new Error('Integration not connected') };

    const start = Date.now();
    const result = await this.testProvider(provider, raw);
    const latencyMs = Date.now() - start;

    const message = result.ok ? result.value.message : (result.error?.message ?? 'Test failed');
    await this.prisma.integrationConfig.updateMany({
      where: { workspaceId, provider },
      data: {
        lastTestedAt: new Date(),
        lastTestResult: message,
        status: result.ok ? 'connected' : 'error',
      },
    });

    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, value: { message, latencyMs } };
  }

  /** Mark-as-connected for providers that don't have an API test (Zillow, Realtor.com, Website). */
  async markConnected(workspaceId: string, provider: string, config: Record<string, string> = {}): Promise<void> {
    await this.prisma.integrationConfig.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      create: { workspaceId, provider, status: 'connected', config, lastTestedAt: new Date(), lastTestResult: 'Marked as connected' },
      update: { status: 'connected', config, lastTestedAt: new Date(), lastTestResult: 'Marked as connected', deletedAt: null },
    });
  }

  private async testProvider(provider: string, config: Record<string, string>): Promise<Result<{ message: string }>> {
    try {
      switch (provider) {
        case 'twilio':    return this.testTwilio(config);
        case 'follow_up_boss': return this.testFUB(config);
        case 'calcom':    return this.testCalCom(config);
        case 'zapier':    return this.testZapier(config);
        default:          return { ok: true, value: { message: 'OK' } };
      }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e : new Error(String(e)) };
    }
  }

  private async testTwilio(config: Record<string, string>): Promise<Result<{ message: string }>> {
    const { accountSid, authToken } = config;
    if (!accountSid || !authToken) return { ok: false, error: new Error('accountSid and authToken required') };
    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`, {
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (res.ok) return { ok: true, value: { message: 'Twilio credentials verified' } };
    return { ok: false, error: new Error('Invalid Twilio credentials') };
  }

  private async testFUB(config: Record<string, string>): Promise<Result<{ message: string }>> {
    const { apiKey } = config;
    if (!apiKey) return { ok: false, error: new Error('apiKey required') };
    const credentials = Buffer.from(`${apiKey}:`).toString('base64');
    const res = await fetch('https://api.followupboss.com/v1/people?limit=1', {
      headers: { Authorization: `Basic ${credentials}` },
    });
    if (res.ok) return { ok: true, value: { message: 'Follow Up Boss credentials verified' } };
    return { ok: false, error: new Error('Invalid Follow Up Boss API key') };
  }

  private async testCalCom(config: Record<string, string>): Promise<Result<{ message: string }>> {
    const { apiKey } = config;
    if (!apiKey) return { ok: false, error: new Error('apiKey required') };
    const res = await fetch(`https://api.cal.com/v1/me?apiKey=${encodeURIComponent(apiKey)}`);
    if (res.ok) return { ok: true, value: { message: 'Cal.com credentials verified' } };
    return { ok: false, error: new Error('Invalid Cal.com API key') };
  }

  private async testZapier(config: Record<string, string>): Promise<Result<{ message: string }>> {
    const { webhookUrl } = config;
    if (!webhookUrl) return { ok: false, error: new Error('webhookUrl required') };
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ test: true, source: 'conversionops', timestamp: new Date().toISOString() }),
    });
    if (res.status >= 200 && res.status < 300) return { ok: true, value: { message: 'Zapier webhook reachable' } };
    return { ok: false, error: new Error(`Zapier returned ${res.status}`) };
  }
}
