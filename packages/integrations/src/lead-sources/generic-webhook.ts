export interface GenericLeadPayload {
  name?: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  message?: string;
  area?: string;
  source?: string;
  external_id?: string;
  [key: string]: unknown;
}

export interface ParsedGenericLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  area: string | null;
  externalId: string | null;
  source: string | null;
  sourcePayload: Record<string, unknown>;
}

/**
 * Parses a generic inbound lead webhook payload into a standardised format.
 * Supports common field name variations (snake_case, camelCase).
 */
export function parseGenericLeadWebhook(payload: GenericLeadPayload): ParsedGenericLead {
  const name = payload.name
    ?? (payload.first_name || payload.last_name
      ? [payload.first_name, payload.last_name].filter(Boolean).join(' ')
      : null)
    ?? null;

  return {
    name,
    email: payload.email ?? null,
    phone: normalisePhone(payload.phone ?? null),
    message: payload.message ?? null,
    area: payload.area ?? null,
    externalId: payload.external_id ?? null,
    source: payload.source ?? null,
    sourcePayload: payload as Record<string, unknown>,
  };
}

function normalisePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}
