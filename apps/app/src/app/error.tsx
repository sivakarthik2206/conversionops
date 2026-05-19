'use client';

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorPageProps) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      padding: 32,
    }}>
      <div style={{
        background: 'rgba(255,71,71,0.08)',
        border: '1px solid rgba(255,71,71,0.2)',
        borderRadius: 16,
        padding: '40px 48px',
        maxWidth: 520,
      }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚠</div>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginBottom: 8 }}>
          {error.message || 'An unexpected error occurred. Our team has been notified.'}
        </p>
        {error.digest && (
          <p style={{ color: 'var(--text-4)', fontSize: 11, fontFamily: 'monospace', marginBottom: 24 }}>
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            background: 'var(--accent)',
            color: '#000',
            border: 'none',
            borderRadius: 10,
            padding: '12px 28px',
            fontWeight: 700,
            fontSize: 15,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    </div>
  );
}
