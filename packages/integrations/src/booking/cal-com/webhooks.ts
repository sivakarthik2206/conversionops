import { z } from 'zod';
import type { Result } from '@conversionops/types';
import { ExternalServiceError } from '@conversionops/sdk-standards';

export type CalComEventType =
  | 'BOOKING_CREATED'
  | 'BOOKING_CANCELLED'
  | 'BOOKING_RESCHEDULED'
  | 'MEETING_ENDED';

const CalComWebhookSchema = z.object({
  triggerEvent: z.enum(['BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_RESCHEDULED', 'MEETING_ENDED']),
  payload: z.object({
    uid: z.string(),
    title: z.string().optional(),
    startTime: z.string(),
    endTime: z.string(),
    status: z.string().optional(),
    attendees: z.array(z.object({
      name: z.string().optional(),
      email: z.string(),
      timeZone: z.string().optional(),
    })).default([]),
    organizer: z.object({ email: z.string() }).optional(),
    responses: z.object({
      phone: z.object({ value: z.string() }).optional(),
      name: z.object({ value: z.string() }).optional(),
    }).optional(),
  }),
});

export type CalComWebhookEvent = z.infer<typeof CalComWebhookSchema>;

/**
 * Parses and validates an incoming Cal.com webhook payload.
 * Returns Result<CalComWebhookEvent> — never throws.
 */
export function parseCalComWebhook(payload: unknown): Result<CalComWebhookEvent> {
  const result = CalComWebhookSchema.safeParse(payload);
  if (!result.success) {
    return {
      ok: false,
      error: new ExternalServiceError(
        'cal-com',
        `Invalid webhook payload: ${result.error.message}`,
      ),
    };
  }
  return { ok: true, value: result.data };
}
