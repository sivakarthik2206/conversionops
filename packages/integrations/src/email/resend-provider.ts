import { Resend } from 'resend';
import type { EmailProvider, SendEmailRequest, SendEmailResponse } from './email-provider.interface';

/**
 * Resend email provider implementation.
 * Conforms to EmailProvider interface — swap for any other provider without changing callers.
 */
export class ResendEmailProvider implements EmailProvider {
  readonly name = 'resend';
  private readonly resend: Resend | null;
  private readonly fromAddress: string;

  constructor(apiKey?: string, fromAddress = 'ConversionOps <noreply@conversionops.in>') {
    this.resend = apiKey ? new Resend(apiKey) : null;
    this.fromAddress = fromAddress;
  }

  isConfigured(): boolean {
    return this.resend !== null;
  }

  async sendEmail(request: SendEmailRequest): Promise<SendEmailResponse> {
    if (!this.resend) {
      return { ok: false, provider: this.name, error: 'Resend not configured (RESEND_API_KEY missing)' };
    }

    const recipients = Array.isArray(request.to) ? request.to : [request.to];
    const toAddresses = recipients.map((r) => (r.name ? `${r.name} <${r.email}>` : r.email));

    try {
      const { data, error } = await this.resend.emails.send({
        from: request.from.name
          ? `${request.from.name} <${request.from.email}>`
          : (request.from.email ?? this.fromAddress),
        to: toAddresses,
        subject: request.subject,
        text: request.textBody,
        html: request.htmlBody,
        reply_to: request.replyTo,
        tags: request.tags?.map((t) => ({ name: t, value: t })),
        headers: request.idempotencyKey
          ? { 'X-Entity-Ref-ID': request.idempotencyKey }
          : undefined,
      });

      if (error) {
        return { ok: false, provider: this.name, error: error.message };
      }

      return { ok: true, provider: this.name, messageId: data?.id };
    } catch (err) {
      return {
        ok: false,
        provider: this.name,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
