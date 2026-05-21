import type { Request } from 'express';

/**
 * Returns the absolute URL that Twilio signed when invoking this endpoint.
 *
 * Twilio computes the signature over the *exact* URL it called, so we must
 * reconstruct it from the proxy headers (the API runs behind Cloud Run + a
 * load balancer that terminates TLS). Falls back to API_BASE_URL when no
 * forwarded headers are present (local dev).
 *
 * Twilio's signature includes any query string verbatim, so we preserve it.
 */
export function buildWebhookUrl(req: Request, path: string): string {
  const forwardedProto = (req.headers['x-forwarded-proto'] as string | undefined)?.split(',')[0]?.trim();
  const forwardedHost = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0]?.trim();
  const hostHeader = forwardedHost ?? (req.headers['host'] as string | undefined);

  if (hostHeader) {
    const proto = forwardedProto ?? 'https';
    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    return `${proto}://${hostHeader}${path}${query}`;
  }

  const base = process.env['API_BASE_URL'] ?? 'https://api.conversionops.io';
  return `${base.replace(/\/$/, '')}${path}`;
}
