'use client';

export default function GlobalError({ reset }: { reset: () => void }) {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', gap: 20, padding: 24, fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
      <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'rgba(255,92,92,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Something went wrong</h1>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>We have been notified and are looking into it.</p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={reset} style={{ padding: '10px 20px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Try again</button>
        <a href="/" style={{ padding: '10px 20px', background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 14, textDecoration: 'none' }}>Go to dashboard</a>
      </div>
    </div>
  );
}
