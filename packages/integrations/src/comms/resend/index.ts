import { Resend } from 'resend';
import { ExternalServiceError } from '@conversionops/sdk-standards';
import type { Result } from '@conversionops/types';

export class ResendClient {
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress = 'ConversionOps <noreply@conversionops.io>') {
    this.resend = new Resend(apiKey);
    this.fromAddress = fromAddress;
  }

  /**
   * Sends a magic-link login email.
   * @param to - Recipient email address
   * @param token - The magic link token
   * @param appUrl - Base URL of the dashboard app
   */
  async sendMagicLink(to: string, token: string, appUrl: string): Promise<Result<void>> {
    const link = `${appUrl}/auth/verify?token=${encodeURIComponent(token)}`;
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Your ConversionOps login link',
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <h2 style="font-size: 24px; color: #f4f4f5; margin-bottom: 16px;">Sign in to ConversionOps</h2>
            <p style="color: #a1a1aa; margin-bottom: 32px;">Click the button below to securely sign in. This link expires in 15 minutes.</p>
            <a href="${link}" style="display: inline-block; background: #e8ff47; color: #0a0a0b; padding: 12px 24px; border-radius: 8px; font-weight: 600; text-decoration: none;">Sign in →</a>
            <p style="color: #71717a; font-size: 12px; margin-top: 32px;">If you did not request this link, you can safely ignore this email.</p>
          </div>
        `,
      });
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Sends a welcome email when a new workspace is created.
   */
  async sendWelcome(to: string, workspaceName: string): Promise<Result<void>> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `Welcome to ConversionOps — ${workspaceName} is live`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <h2 style="font-size: 24px; color: #f4f4f5;">You're live. Every lead answered.</h2>
            <p style="color: #a1a1aa;">Your workspace <strong>${workspaceName}</strong> is set up. AI response is active — every inbound lead gets a response in under 60 seconds.</p>
          </div>
        `,
      });
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Sends a token quota warning email.
   */
  async sendQuotaWarning(to: string, workspaceName: string, percentUsed: number): Promise<Result<void>> {
    try {
      await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `[Action Required] AI quota at ${percentUsed}% — ${workspaceName}`,
        html: `
          <div style="font-family: 'DM Sans', sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px;">
            <h2 style="font-size: 24px; color: #f4f4f5;">AI Token Quota Warning</h2>
            <p style="color: #a1a1aa;">Your workspace <strong>${workspaceName}</strong> has used <strong>${percentUsed}%</strong> of its monthly AI token quota.</p>
            <p style="color: #a1a1aa;">At 100%, AI responses will be paused and leads will be escalated to agents. Consider upgrading your plan.</p>
          </div>
        `,
      });
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)) };
    }
  }

  /**
   * Generic transactional email send.
   */
  async sendEmail(to: string, subject: string, html: string): Promise<Result<void>> {
    try {
      await this.resend.emails.send({ from: this.fromAddress, to, subject, html });
      return { ok: true, value: undefined };
    } catch (error) {
      return { ok: false, error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)) };
    }
  }
}
