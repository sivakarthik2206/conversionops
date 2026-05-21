'use client';

import { Icon } from '@/components/Icon';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: 32,
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(255,92,92,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          background: 'rgba(255,92,92,0.10)',
          border: '1px solid rgba(255,92,92,0.30)',
          color: 'var(--red)',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: 24,
          position: 'relative',
        }}
      >
        <Icon name="x-circle" size={28} stroke={1.6} />
      </div>

      <h1
        className="serif"
        style={{
          fontSize: 'clamp(32px, 5vw, 48px)',
          color: 'var(--text)',
          margin: '0 0 12px',
          fontWeight: 400,
          letterSpacing: '-0.03em',
          position: 'relative',
        }}
      >
        Something{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--red)' }}>
          broke.
        </span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 8px', maxWidth: 460, lineHeight: 1.55, position: 'relative' }}>
        {error.message || 'An unexpected error occurred. Our team has been notified.'}
      </p>
      {error.digest && (
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-4)',
            fontFamily: "'JetBrains Mono', monospace",
            marginBottom: 28,
            padding: '4px 10px',
            borderRadius: 6,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            position: 'relative',
          }}
        >
          Error ID · {error.digest}
        </p>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 12, position: 'relative' }}>
        <button onClick={reset} className="btn-primary">
          <Icon name="reload" size={14} stroke={2} />
          Try again
        </button>
        <a href="/" className="btn-ghost">
          Go home
        </a>
      </div>
    </div>
  );
}
