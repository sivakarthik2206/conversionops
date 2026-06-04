import { Resend } from 'resend';
import { ExternalServiceError } from '@conversionops/sdk-standards';
import { logger } from '@conversionops/observability';
import type { Result } from '@conversionops/types';

/**
 * ResendClient — transactional email via Resend.
 *
 * Gmail/Outlook deliverability rules applied to every send:
 *  - Table-based HTML (Outlook does not support flex/grid)
 *  - Inline styles only — no <style> blocks
 *  - Plain-text version included
 *  - From name set explicitly
 *  - 600px max width
 *  - X-Entity-Ref-ID header on magic links to prevent Gmail threading
 *  - Unsubscribe / privacy link in footer
 */
export class ResendClient {
  private readonly resend: Resend;
  private readonly fromAddress: string;

  constructor(apiKey: string, fromAddress = 'ConversionOps <hello@conversionops.in>') {
    this.resend = new Resend(apiKey || 'placeholder_not_configured');
    this.fromAddress = fromAddress;
  }

  /**
   * Sends a magic-link login email.
   * @param to - Recipient email
   * @param link - The fully-built magic-link URL (including token)
   * @param workspaceName - Optional workspace name for personalization
   */
  async sendMagicLink(
    to: string,
    link: string,
    workspaceName = 'ConversionOps',
  ): Promise<Result<void>> {
    logger.info({ to, linkLength: link.length, workspaceName }, 'Sending magic link email');
    try {
      const { data, error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Your sign-in link for ConversionOps',
        html: magicLinkTemplate(link, workspaceName),
        text:
          `Sign in to ConversionOps\n\n` +
          `Click this link to sign in: ${link}\n\n` +
          `This link expires in 60 minutes.\n\n` +
          `If you didn't request this, ignore this email.\n\n` +
          `ConversionOps\nhello@conversionops.in`,
        headers: {
          'X-Entity-Ref-ID': `magic-link-${Date.now()}`,
        },
      });
      if (error) {
        logger.error({ error, to }, 'Resend API returned error sending magic link');
        return { ok: false, error: new ExternalServiceError('Resend', JSON.stringify(error)) };
      }
      logger.info({ emailId: data?.id, to }, 'Magic link email sent successfully');
      return { ok: true, value: undefined };
    } catch (e) {
      logger.error({ err: e instanceof Error ? e.message : String(e), to }, 'Resend threw exception sending magic link');
      return {
        ok: false,
        error: new ExternalServiceError('Resend', e instanceof Error ? e.message : String(e)),
      };
    }
  }

  async sendPasswordReset(to: string, link: string): Promise<Result<void>> {
    logger.info({ to }, 'Sending password reset email');
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: 'Reset your ConversionOps password',
        html: passwordResetTemplate(link),
        text: `Reset your ConversionOps password\n\nClick this link to set a new password: ${link}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, ignore this email.\n\nConversionOps\nhello@conversionops.in`,
        headers: { 'X-Entity-Ref-ID': `pwd-reset-${Date.now()}` },
      });
      if (error) {
        logger.error({ error, to }, 'Resend error sending password reset');
        return { ok: false, error: new ExternalServiceError('Resend', JSON.stringify(error)) };
      }
      return { ok: true, value: undefined };
    } catch (e) {
      return { ok: false, error: new ExternalServiceError('Resend', e instanceof Error ? e.message : String(e)) };
    }
  }

  /**
   * Sends an agent action-needed alert (escalation, hot lead, etc.).
   */
  async sendAgentAlert(
    to: string,
    type: string,
    leadName: string,
    summary: string,
  ): Promise<Result<void>> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `${type}: ${leadName} — Action needed`,
        html: agentAlertTemplate(type, leadName, summary),
        text:
          `${type}\n\nLead: ${leadName}\n${summary}\n\n` +
          `Login to ConversionOps to respond: https://app.conversionops.in`,
      });
      if (error) {
        return { ok: false, error: new ExternalServiceError('Resend', error.message) };
      }
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)),
      };
    }
  }

  /**
   * Welcome email after onboarding.
   */
  async sendWelcome(to: string, workspaceName: string): Promise<Result<void>> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `Welcome to ConversionOps — ${workspaceName} is live`,
        html: welcomeTemplate(workspaceName),
        text:
          `Welcome to ConversionOps\n\n` +
          `Your workspace ${workspaceName} is set up. AI response is active — ` +
          `every inbound lead gets a response in under 60 seconds.\n\n` +
          `Dashboard: https://app.conversionops.in`,
      });
      if (error) {
        return { ok: false, error: new ExternalServiceError('Resend', error.message) };
      }
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)),
      };
    }
  }

  /**
   * Token-quota warning email.
   */
  async sendQuotaWarning(to: string, workspaceName: string, percentUsed: number): Promise<Result<void>> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject: `[Action Required] AI quota at ${percentUsed}% — ${workspaceName}`,
        html: quotaWarningTemplate(workspaceName, percentUsed),
        text:
          `AI Token Quota Warning\n\n` +
          `Your workspace ${workspaceName} has used ${percentUsed}% of its monthly AI token quota.\n` +
          `At 100%, AI responses will be paused and leads will be escalated to agents.\n\n` +
          `Upgrade: https://app.conversionops.in/settings/billing`,
      });
      if (error) {
        return { ok: false, error: new ExternalServiceError('Resend', error.message) };
      }
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)),
      };
    }
  }

  /**
   * Generic transactional email send. Caller is responsible for HTML.
   */
  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<Result<void>> {
    try {
      const { error } = await this.resend.emails.send({
        from: this.fromAddress,
        to,
        subject,
        html,
        text: text ?? stripHtml(html),
      });
      if (error) {
        return { ok: false, error: new ExternalServiceError('Resend', error.message) };
      }
      return { ok: true, value: undefined };
    } catch (error) {
      return {
        ok: false,
        error: new ExternalServiceError('Resend', error instanceof Error ? error.message : String(error)),
      };
    }
  }
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

function magicLinkTemplate(link: string, workspaceName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>Sign in to ConversionOps</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
  <tr><td style="background:#0a0a0b;padding:32px 40px;text-align:center;">
    <span style="font-size:24px;font-weight:700;color:#e8ff47;letter-spacing:-0.5px;">ConversionOps</span>
  </td></tr>
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111114;">Sign in to your account</h1>
    <p style="margin:0 0 8px;color:#71717a;font-size:15px;">Workspace: <strong style="color:#111114;">${workspaceName}</strong></p>
    <p style="margin:0 0 32px;color:#71717a;font-size:15px;">Click the button below to sign in. This link expires in 15 minutes.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0a0a0b;">
      <a href="${link}" style="display:inline-block;padding:14px 32px;color:#e8ff47;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Sign in to ConversionOps &rarr;</a>
    </td></tr></table>
    <p style="margin:32px 0 0;color:#a1a1aa;font-size:13px;">If the button doesn't work, copy this link:<br><a href="${link}" style="color:#4796ff;word-break:break-all;">${link}</a></p>
    <hr style="border:none;border-top:1px solid #f0f0f0;margin:32px 0;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">If you didn't request this sign-in link, you can safely ignore this email. Your account is secure.</p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">ConversionOps &middot; hello@conversionops.in &middot; <a href="https://conversionops.in/legal/privacy" style="color:#a1a1aa;">Privacy Policy</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function agentAlertTemplate(type: string, leadName: string, summary: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${type}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0a0a0b;padding:24px 40px;">
    <span style="font-size:20px;font-weight:700;color:#e8ff47;">ConversionOps</span>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 8px;color:#111114;">${type}</h2>
    <p style="margin:0 0 24px;color:#71717a;">Lead: <strong style="color:#111114;">${leadName}</strong></p>
    <div style="background:#f9f9f9;border-radius:8px;padding:20px;margin:0 0 24px;">
      <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${summary}</p>
    </div>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0a0a0b;">
      <a href="https://app.conversionops.in/conversations" style="display:inline-block;padding:12px 24px;color:#e8ff47;font-size:14px;font-weight:600;text-decoration:none;">View in Dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 40px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">ConversionOps &middot; <a href="https://conversionops.in/legal/privacy" style="color:#a1a1aa;">Privacy Policy</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function welcomeTemplate(workspaceName: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Welcome to ConversionOps</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0a0a0b;padding:24px 40px;">
    <span style="font-size:20px;font-weight:700;color:#e8ff47;">ConversionOps</span>
  </td></tr>
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 12px;color:#111114;font-size:22px;">You're live. Every lead answered.</h1>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">Your workspace <strong style="color:#111114;">${workspaceName}</strong> is set up. AI response is active &mdash; every inbound lead gets a response in under 60 seconds, 24/7.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0a0a0b;">
      <a href="https://app.conversionops.in" style="display:inline-block;padding:12px 24px;color:#e8ff47;font-size:14px;font-weight:600;text-decoration:none;">Open Dashboard &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 40px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">ConversionOps &middot; <a href="https://conversionops.in/legal/privacy" style="color:#a1a1aa;">Privacy Policy</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function quotaWarningTemplate(workspaceName: string, percentUsed: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>AI Quota Warning</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0a0a0b;padding:24px 40px;">
    <span style="font-size:20px;font-weight:700;color:#e8ff47;">ConversionOps</span>
  </td></tr>
  <tr><td style="padding:40px;">
    <h2 style="margin:0 0 12px;color:#111114;">AI token quota at ${percentUsed}%</h2>
    <p style="margin:0 0 16px;color:#71717a;font-size:15px;">Your workspace <strong style="color:#111114;">${workspaceName}</strong> has used <strong>${percentUsed}%</strong> of its monthly AI token quota.</p>
    <p style="margin:0 0 24px;color:#71717a;font-size:15px;">At 100%, AI responses pause and leads escalate to your agents. Upgrade your plan to avoid interruption.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0a0a0b;">
      <a href="https://app.conversionops.in/settings/billing" style="display:inline-block;padding:12px 24px;color:#e8ff47;font-size:14px;font-weight:600;text-decoration:none;">Upgrade plan &rarr;</a>
    </td></tr></table>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:16px 40px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">ConversionOps &middot; <a href="https://conversionops.in/legal/privacy" style="color:#a1a1aa;">Privacy Policy</a></p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

function passwordResetTemplate(link: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Reset your password</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;">
  <tr><td style="background:#0a0a0b;padding:32px 40px;text-align:center;">
    <span style="font-size:24px;font-weight:700;color:#e8ff47;">ConversionOps</span>
  </td></tr>
  <tr><td style="padding:40px;">
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:600;color:#111114;">Reset your password</h1>
    <p style="margin:0 0 32px;color:#71717a;font-size:15px;">Click the button below to set a new password. This link expires in 15 minutes.</p>
    <table cellpadding="0" cellspacing="0"><tr><td style="border-radius:8px;background:#0a0a0b;">
      <a href="${link}" style="display:inline-block;padding:14px 32px;color:#e8ff47;font-size:15px;font-weight:600;text-decoration:none;border-radius:8px;">Reset password &rarr;</a>
    </td></tr></table>
    <p style="margin:32px 0 0;color:#a1a1aa;font-size:13px;">If you didn't request a password reset, ignore this email.</p>
  </td></tr>
  <tr><td style="background:#f9f9f9;padding:24px 40px;text-align:center;">
    <p style="margin:0;color:#a1a1aa;font-size:12px;">ConversionOps &middot; hello@conversionops.in</p>
  </td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
