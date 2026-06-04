export default function NotFound() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 20, padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: 22, color: 'var(--accent)', marginBottom: 8 }}>ConversionOps</span>
      <div style={{ fontSize: 72, fontWeight: 700, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>404</div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Page not found</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, textAlign: 'center', maxWidth: 300, lineHeight: 1.6 }}>The page you are looking for does not exist or has been moved.</p>
      <a href="/" style={{ padding: '11px 24px', background: 'var(--accent)', color: '#000', borderRadius: 9, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>Go to dashboard</a>
    </div>
  );
}
