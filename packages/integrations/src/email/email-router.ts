import type { EmailProvider, SendEmailRequest, SendEmailResponse } from './email-provider.interface';

/**
 * EmailRouter — tries providers in priority order, falls back on failure.
 * Callers never reference a specific provider; this handles failover transparently.
 *
 * Usage:
 *   const router = new EmailRouter([resendProvider]);
 *   await router.send(request);
 */
export class EmailRouter {
  private readonly providers: EmailProvider[];

  constructor(providers: EmailProvider[]) {
    this.providers = providers.filter((p) => p.isConfigured());
  }

  /**
   * Sends an email using the first configured provider.
   * If it fails, tries the next provider in order.
   * Returns the first successful send, or the last failure if all fail.
   */
  async send(request: SendEmailRequest): Promise<SendEmailResponse> {
    if (this.providers.length === 0) {
      return { ok: false, provider: 'none', error: 'No email providers configured' };
    }

    let lastResponse: SendEmailResponse = {
      ok: false,
      provider: 'none',
      error: 'All providers failed',
    };

    for (const provider of this.providers) {
      lastResponse = await provider.sendEmail(request);
      if (lastResponse.ok) return lastResponse;
    }

    return lastResponse;
  }

  /** Returns names of configured providers for health/diagnostics. */
  getConfiguredProviders(): string[] {
    return this.providers.map((p) => p.name);
  }
}
