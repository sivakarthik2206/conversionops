'use client';

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

/**
 * Catches errors thrown in the root layout itself, which the route-level
 * error.tsx boundary cannot. It replaces the entire document, so it must
 * render its own <html>/<body> and cannot rely on globals.css being applied —
 * all styling is inlined with the design-token color values.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    console.error('[app:global-error-boundary]', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          padding: 32,
          background: '#07070a',
          color: '#fafafa',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'rgba(255,92,92,0.10)',
            border: '1px solid rgba(255,92,92,0.30)',
            color: '#ff5c5c',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 24,
            fontSize: 28,
            lineHeight: 1,
          }}
          aria-hidden="true"
        >
          !
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 600, margin: '0 0 12px', letterSpacing: '-0.02em' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: 15, color: '#b8b8c0', margin: '0 0 28px', maxWidth: 440, lineHeight: 1.55 }}>
          The application failed to load. Please try again — if the problem persists, contact support.
        </p>
        {error.digest && (
          <p
            style={{
              fontSize: 11,
              color: '#52525b',
              fontFamily: 'monospace',
              marginBottom: 24,
            }}
          >
            Error ID · {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          style={{
            height: 44,
            padding: '0 22px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.18)',
            background: 'linear-gradient(180deg, #f5ff9e 0%, #e8ff47 50%, #c9e025 100%)',
            color: '#0a0a0b',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
