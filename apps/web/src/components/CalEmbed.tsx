'use client';

import type { ReactNode } from 'react';

// Set NEXT_PUBLIC_CALCOM_LINK to your Cal.com path, e.g. "miami-premier/demo".
const CAL_LINK = process.env['NEXT_PUBLIC_CALCOM_LINK'] ?? '';

/**
 * Renders a live Cal.com booking embed when NEXT_PUBLIC_CALCOM_LINK is configured.
 * Falls back to the provided node (the static slot mockup + email CTA) until then,
 * so the page is fully functional before a Cal.com account is connected.
 */
export function CalEmbed({ fallback }: { fallback: ReactNode }) {
  if (!CAL_LINK) return <>{fallback}</>;

  const src = `https://cal.com/${CAL_LINK}?embed=1&theme=dark&layout=month_view`;

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-3)',
        position: 'relative',
      }}
    >
      <iframe
        src={src}
        title="Book a demo with ConversionOps"
        loading="lazy"
        style={{ width: '100%', height: 660, border: 'none', display: 'block' }}
      />
    </div>
  );
}
