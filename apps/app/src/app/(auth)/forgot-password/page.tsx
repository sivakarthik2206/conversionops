'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email address'); return; }
    setError('');
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');
      await fetch(`${base}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true); // always show success to prevent enumeration
    } catch {
      setSent(true); // same — always show success
    } finally {
      setLoading(false);
    }
  };

  const page: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' };

  return (
    <div style={page}>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} style={{ width: '100%', maxWidth: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: 24, color: 'var(--accent)' }}>ConversionOps</span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(232,255,71,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--text)', margin: '0 0 12px', fontWeight: 400 }}>Check your email</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.6 }}>If that email exists in our system, a password reset link is on its way. Check your spam folder if you don&apos;t see it.</p>
            <a href="/login" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>← Back to sign in</a>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400 }}>Reset password</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.5 }}>Enter your email and we&apos;ll send you a reset link.</p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Work email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="you@brokerage.com"
                  autoFocus
                  style={{ width: '100%', background: 'var(--bg-3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 16px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
                {error && <p style={{ fontSize: 13, color: 'var(--red)', margin: '6px 0 0' }}>{error}</p>}
              </div>
              <button type="submit" disabled={loading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.85 : 1 }}>
                {loading ? 'Sending...' : 'Send reset link →'}
              </button>
            </form>
            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to sign in</a>
            </p>
          </>
        )}
      </motion.div>
    </div>
  );
}
