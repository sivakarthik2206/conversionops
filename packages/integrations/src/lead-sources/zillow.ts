export interface ZillowLeadPayload {
  name?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
  propertyAddress?: string;
  propertyUrl?: string;
  listingId?: string;
  price?: number;
  area?: string;
  timestamp?: string;
  [key: string]: unknown;
}

export interface ParsedLead {
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  area: string | null;
  externalId: string | null;
  sourcePayload: Record<string, unknown>;
}

/**
 * Parses a raw Zillow lead webhook payload into a standardised lead format.
 */
export function parseZillowLead(payload: ZillowLeadPayload): ParsedLead {
  const name = payload.name
    ?? (payload.firstName || payload.lastName
      ? [payload.firstName, payload.lastName].filter(Boolean).join(' ')
      : null)
    ?? null;

  const area = payload.area
    ?? (payload.propertyAddress ? extractAreaFromAddress(payload.propertyAddress) : null)
    ?? null;

  return {
    name,
    email: payload.email ?? null,
    phone: normalisePhone(payload.phone ?? null),
    message: payload.message ?? null,
    area,
    externalId: payload.listingId ?? null,
    sourcePayload: payload as Record<string, unknown>,
  };
}

function extractAreaFromAddress(address: string): string | null {
  const parts = address.split(',');
  if (parts.length >= 2) {
    return parts.slice(-2).join(',').trim();
  }
  return address;
}

function normalisePhone(phone: string | null): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return phone;
}
