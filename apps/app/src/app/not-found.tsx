import Link from 'next/link';

export default function NotFound() {
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
      <h1 style={{
        fontFamily: 'DM Serif Display, serif',
        fontSize: 120,
        fontWeight: 400,
        color: 'var(--text-4)',
        lineHeight: 1,
        margin: 0,
      }}>
        404
      </h1>
      <h2 style={{ fontSize: 24, fontWeight: 700, marginTop: 16, marginBottom: 8 }}>
        Page not found
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 16, marginBottom: 32, maxWidth: 400 }}>
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        style={{
          background: 'var(--accent)',
          color: '#000',
          textDecoration: 'none',
          padding: '12px 28px',
          borderRadius: 10,
          fontWeight: 700,
          fontSize: 15,
        }}
      >
        Go home
      </Link>
    </div>
  );
}
