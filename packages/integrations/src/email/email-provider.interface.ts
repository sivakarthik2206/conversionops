export interface EmailRecipient {
  email: string;
  name?: string;
}

export interface SendEmailRequest {
  to: EmailRecipient | EmailRecipient[];
  from: EmailRecipient;
  subject: string;
  textBody: string;
  htmlBody?: string;
  idempotencyKey?: string;
  replyTo?: string;
  tags?: string[];
  metadata?: Record<string, string>;
}

export interface SendEmailResponse {
  ok: boolean;
  messageId?: string;
  provider: string;
  error?: string;
}

export interface EmailProvider {
  /**
   * Identifies the provider (e.g. 'resend', 'sendgrid', 'ses').
   */
  readonly name: string;

  /**
   * Returns true if the provider is fully configured in the environment.
   */
  isConfigured(): boolean;

  /**
   * Attempts to send an email using this provider.
   */
  sendEmail(request: SendEmailRequest): Promise<SendEmailResponse>;
}
