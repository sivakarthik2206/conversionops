import axios, { AxiosInstance, AxiosError } from 'axios';
import type { Result } from '@conversionops/types';
import { ExternalServiceError, ValidationError, withRetry } from '@conversionops/sdk-standards';

export interface FUBContactInput {
  firstName?: string;
  lastName?: string;
  phones?: Array<{ value: string; type: string }>;
  emails?: Array<{ value: string }>;
  source?: string;
  assignedTo?: string;
  tags?: string[];
}

export interface FUBContact {
  id: string;
  firstName?: string;
  lastName?: string;
  phones?: Array<{ value: string; type: string }>;
  emails?: Array<{ value: string }>;
  source?: string;
  tags?: string[];
}

interface FUBErrorResponse {
  errors?: Record<string, string[]>;
  error?: string;
}

const BASE_URL = 'https://api.followupboss.com/v1';
const RATE_LIMIT_PER_SECOND = 5;

export class FollowUpBossClient {
  private readonly http: AxiosInstance;
  private readonly requestTimestamps: number[] = [];

  constructor(apiKey: string) {
    const token = Buffer.from(`${apiKey}:`).toString('base64');
    this.http = axios.create({
      baseURL: BASE_URL,
      timeout: 15_000,
      headers: { Authorization: `Basic ${token}`, 'Content-Type': 'application/json' },
    });
  }

  private async throttle(): Promise<void> {
    const now = Date.now();
    const recent = this.requestTimestamps.filter(t => now - t < 1000);
    if (recent.length >= RATE_LIMIT_PER_SECOND) {
      const oldest = recent[0] ?? now;
      const wait = 1000 - (now - oldest) + 10;
      await new Promise(r => setTimeout(r, wait));
    }
    this.requestTimestamps.push(Date.now());
    if (this.requestTimestamps.length > 50) this.requestTimestamps.splice(0, 25);
  }

  private wrapError(err: unknown, context: string): ExternalServiceError {
    if (err instanceof AxiosError && err.response?.data) {
      const data = err.response.data as FUBErrorResponse;
      const detail = data.error ?? JSON.stringify(data.errors ?? {});
      return new ExternalServiceError('follow-up-boss', `${context}: ${detail}`);
    }
    return new ExternalServiceError(
      'follow-up-boss',
      `${context}: ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  /** Creates a new contact in Follow Up Boss. Returns the created contact with id. */
  async createContact(data: FUBContactInput): Promise<Result<FUBContact>> {
    await this.throttle();
    try {
      const response = await withRetry(
        async () => {
          try {
            return await this.http.post<{ person: FUBContact }>('/people', data);
          } catch (e) {
            if (e instanceof AxiosError && e.response?.status === 429) {
              await new Promise(r => setTimeout(r, 1000));
              return this.http.post<{ person: FUBContact }>('/people', data);
            }
            if (e instanceof AxiosError && e.response?.status === 422) {
              const errData = e.response.data as FUBErrorResponse;
              throw new ValidationError('FUB validation failed', errData.errors as Record<string, unknown>);
            }
            throw e;
          }
        },
        { attempts: 2 },
      );
      return { ok: true, value: response.data.person };
    } catch (err) {
      if (err instanceof ValidationError) return { ok: false, error: err };
      return { ok: false, error: this.wrapError(err, 'createContact') };
    }
  }

  /** Updates an existing contact by their FUB person ID. */
  async updateContact(externalId: string, data: Partial<FUBContactInput>): Promise<Result<FUBContact>> {
    await this.throttle();
    try {
      const response = await this.http.put<{ person: FUBContact }>(`/people/${externalId}`, data);
      return { ok: true, value: response.data.person };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'updateContact') };
    }
  }

  /** Appends a note to a contact's timeline. */
  async createNote(personId: string, note: string, subject?: string): Promise<Result<void>> {
    await this.throttle();
    try {
      await this.http.post('/notes', { personId, body: note, subject: subject ?? 'Note' });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'createNote') };
    }
  }

  /** Looks up a contact by phone number. Returns null if not found. */
  async getContactByPhone(phone: string): Promise<Result<FUBContact | null>> {
    await this.throttle();
    try {
      const response = await this.http.get<{ people: FUBContact[] }>('/people', {
        params: { phone },
      });
      const first = response.data.people?.[0] ?? null;
      return { ok: true, value: first };
    } catch (err) {
      if (err instanceof AxiosError && err.response?.status === 404) {
        return { ok: true, value: null };
      }
      return { ok: false, error: this.wrapError(err, 'getContactByPhone') };
    }
  }

  /** Logs an activity event on a contact's timeline. */
  async createEvent(personId: string, type: string, message: string): Promise<Result<void>> {
    await this.throttle();
    try {
      await this.http.post('/events', { personId, type, message });
      return { ok: true, value: undefined };
    } catch (err) {
      return { ok: false, error: this.wrapError(err, 'createEvent') };
    }
  }
}
