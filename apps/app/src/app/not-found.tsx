import Link from 'next/link';
import { Icon } from '@/components/Icon';

export default function NotFound() {
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
          background:
            'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,255,71,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      <h1
        className="serif"
        style={{
          fontSize: 'clamp(120px, 22vw, 200px)',
          color: 'transparent',
          WebkitTextStroke: '1px var(--border-light)',
          lineHeight: 0.85,
          margin: 0,
          fontStyle: 'italic',
          fontFamily: "'Instrument Serif', serif",
          letterSpacing: '-0.04em',
          position: 'relative',
        }}
      >
        404
      </h1>

      <h2
        className="serif"
        style={{
          fontSize: 'clamp(24px, 3vw, 32px)',
          color: 'var(--text)',
          margin: '8px 0 12px',
          fontWeight: 400,
          letterSpacing: '-0.025em',
          position: 'relative',
        }}
      >
        Page not found.
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 28px', maxWidth: 380, lineHeight: 1.55, position: 'relative' }}>
        The page you&apos;re looking for doesn&apos;t exist or has moved. Let&apos;s get you back home.
      </p>

      <div style={{ display: 'flex', gap: 10, position: 'relative' }}>
        <Link href="/" className="btn-primary">
          <Icon name="home" size={14} stroke={1.8} />
          Go home
        </Link>
        <Link href="/conversations" className="btn-ghost">
          View conversations
        </Link>
      </div>
    </div>
  );
}
