export { TwilioClient } from './comms/twilio';
export type { SendSMSOptions } from './comms/twilio';
export { ResendClient } from './comms/resend';

export { FollowUpBossClient } from './crm/follow-up-boss/client';
export type { FUBContactInput, FUBContact } from './crm/follow-up-boss/client';
export { syncLeadToFUB } from './crm/follow-up-boss/sync';

export { ZapierWebhookRelay } from './crm/zapier/webhook-relay';
export type { CRMEvent } from './crm/zapier/webhook-relay';

export { CalComClient } from './booking/cal-com/client';
export type { CalEventType, TimeSlot, CalBooking } from './booking/cal-com/client';
export { parseCalComWebhook } from './booking/cal-com/webhooks';
export type { CalComWebhookEvent, CalComEventType } from './booking/cal-com/webhooks';

export type { EmailProvider, SendEmailRequest, SendEmailResponse, EmailRecipient } from './email/email-provider.interface';
export { ResendEmailProvider } from './email/resend-provider';
export { EmailRouter } from './email/email-router';
