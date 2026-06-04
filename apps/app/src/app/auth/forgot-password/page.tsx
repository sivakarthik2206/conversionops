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
    } catch {
      // fall through — always show success to prevent enumeration
    } finally {
      setLoading(false);
      setSent(true);
    }
  };

  const page: React.CSSProperties = { minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' };

  return (
    <div style={page}>
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: 24, color: 'var(--accent)' }}>
            ConversionOps
          </span>
        </div>

        {sent ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(71,255,142,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#47ff8e" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--text)', margin: '0 0 12px', fontWeight: 400 }}>
              Check your email
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.6 }}>
              If <strong style={{ color: 'var(--text)' }}>{email}</strong> has an account, a reset link is on its way. Check your spam folder if you don&apos;t see it.
            </p>
            <a href="/login" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>
              ← Back to sign in
            </a>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400 }}>
              Reset your password
            </h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.5 }}>
              Enter your email and we&apos;ll send you a reset link.
            </p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
                  Email address
                </label>
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
              <button
                type="submit"
                disabled={loading}
                style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.85 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                {loading ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: 'spin 0.8s linear infinite' }}>
                      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                    </svg>
                    Sending...
                  </>
                ) : 'Send reset link →'}
              </button>
            </form>
            <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--text-3)' }}>
              <a href="/login" style={{ color: 'var(--accent)', textDecoration: 'none' }}>← Back to sign in</a>
            </p>
          </>
        )}
      </motion.div>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
