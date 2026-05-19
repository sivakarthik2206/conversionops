import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Result } from '@conversionops/types';
import { ExternalServiceError } from '@conversionops/sdk-standards';

const BASE_URL = 'https://api.cal.com/v1';

export interface CalEventType {
  id: number;
  title: string;
  slug: string;
  length: number;
  description?: string;
}

export interface TimeSlot {
  time: string;
  attendees?: number;
  bookingUid?: string;
}

export interface CalBooking {
  uid: string;
  title: string;
  startTime: string;
  endTime: string;
  status: string;
  attendees: Array<{ name: string; email: string; timeZone: string }>;
}

export class CalComClient {
  private readonly http: AxiosInstance;

  constructor(apiKey: string) {
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 15_000,
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    });
  }

  private wrapError(err: unknown, context: string): ExternalServiceError {
    if (err instanceof AxiosError) {
      return new ExternalServiceError('cal-com', `${context}: HTTP ${err.response?.status ?? 'unknown'}`);
    }
    return new ExternalServiceError(
      'cal-com',
      `${context}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  /** Returns all event types for the connected Cal.com account. */
  async getEventTypes(): Promise<Result<CalEventType[]>> {
    try {
      const res = await this.http.get<{ event_types: CalEventType[] }>('/event-types');
      return { ok: true, value: res.data.event_types ?? [] };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'getEventTypes') };
    }
  }

  /** Returns available time slots for a given event type in a date range. */
  async getAvailability(
    eventTypeId: number,
    dateFrom: string,
    dateTo: string,
  ): Promise<Result<TimeSlot[]>> {
    try {
      const res = await this.http.get<{ slots: Record<string, TimeSlot[]> }>('/availability', {
        params: { eventTypeId, dateFrom, dateTo },
      });
      const slots = Object.values(res.data.slots ?? {}).flat();
      return { ok: true, value: slots };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'getAvailability') };
    }
  }

  /**
   * Generates a direct booking link with pre-filled attendee data.
   * No API call — constructs URL client-side.
   */
  createBookingLink(
    eventTypeId: number,
    prefill: { name?: string; email?: string; phone?: string; notes?: string },
  ): string {
    const params = new URLSearchParams();
    params.set('eventTypeId', String(eventTypeId));
    if (prefill.name) params.set('name', prefill.name);
    if (prefill.email) params.set('email', prefill.email);
    if (prefill.phone) params.set('phone', prefill.phone);
    if (prefill.notes) params.set('notes', prefill.notes);
    return `https://cal.com/api/book?${params.toString()}`;
  }

  /** Returns a single booking by its UID. */
  async getBooking(bookingId: string): Promise<Result<CalBooking>> {
    try {
      const res = await this.http.get<CalBooking>(`/bookings/${bookingId}`);
      return { ok: true, value: res.data };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'getBooking') };
    }
  }

  /** Cancels a booking with an optional reason. */
  async cancelBooking(bookingId: string, reason?: string): Promise<Result<void>> {
    try {
      await this.http.delete(`/bookings/${bookingId}`, { data: { reason: reason ?? '' } });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'cancelBooking') };
    }
  }
}
