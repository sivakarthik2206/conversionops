'use client';

import { useState, type ReactNode } from 'react';

const CAL_LINK = process.env['NEXT_PUBLIC_CALCOM_LINK'] ?? '';

export function CalEmbed({ fallback }: { fallback: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  if (!CAL_LINK) return <>{fallback}</>;

  const src = `https://cal.com/${CAL_LINK}?embed=1&theme=dark&layout=month_view`;
  const directUrl = `https://cal.com/${CAL_LINK}`;

  if (failed) {
    return (
      <div
        style={{
          borderRadius: 14,
          border: '1px solid var(--border)',
          background: 'var(--bg-3)',
          padding: 32,
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16,
          minHeight: 240,
          justifyContent: 'center',
        }}
      >
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
          Couldn&apos;t load the booking calendar inline.
        </p>
        <a
          href={directUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-primary"
          style={{ textDecoration: 'none' }}
        >
          Open booking page ↗
        </a>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 14,
        overflow: 'hidden',
        border: '1px solid var(--border)',
        background: 'var(--bg-3)',
        position: 'relative',
        minHeight: loaded ? 'auto' : 400,
      }}
    >
      {!loaded && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              border: '2px solid var(--border-light)',
              borderTopColor: 'var(--accent)',
              animation: 'spin 0.7s linear infinite',
              display: 'block',
              flexShrink: 0,
            }}
          />
          <span
            style={{
              fontSize: 12,
              color: 'var(--text-4)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            Loading calendar…
          </span>
          <a
            href={directUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 12,
              color: 'var(--text-3)',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
              marginTop: 4,
            }}
          >
            Open in new tab ↗
          </a>
        </div>
      )}
      <iframe
        src={src}
        title="Book a demo with ConversionOps"
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setFailed(true)}
        style={{
          width: '100%',
          height: 660,
          border: 'none',
          display: 'block',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.4s',
        }}
      />
    </div>
  );
}
