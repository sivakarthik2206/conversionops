'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid work email'); return; }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/magic-link', { email });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    setLoading(true);
    try { await apiClient.post('/auth/magic-link', { email }); } catch { /* silent */ }
    finally { setLoading(false); }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Left panel */}
      <div
        className="login-left"
        style={{
          width: '45%',
          background: 'var(--bg-2)',
          padding: '60px',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 64 }}>
            <span style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 28,
              color: 'var(--accent)',
              letterSpacing: '-0.02em',
            }}>
              ConversionOps
            </span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 56 }}>
            {[
              'AI responds to leads in 60 seconds',
              'Qualifies, scores, books automatically',
              'Syncs to Follow Up Boss instantly',
            ].map((feat) => (
              <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{
                  width: 20,
                  height: 20,
                  borderRadius: '50%',
                  background: 'rgba(232,255,71,0.12)',
                  border: '1px solid rgba(232,255,71,0.3)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: 11,
                  fontWeight: 700,
                  marginTop: 1,
                }}>
                  ✓
                </span>
                <span style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5 }}>{feat}</span>
              </div>
            ))}
          </div>

          <blockquote style={{
            margin: 0,
            padding: '20px 24px',
            borderLeft: '2px solid rgba(232,255,71,0.3)',
            background: 'rgba(232,255,71,0.03)',
            borderRadius: '0 8px 8px 0',
          }}>
            <p style={{ fontSize: 14, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 8px' }}>
              &ldquo;Responded to 3 Zillow leads while I was showing a property. Two of them booked appointments.&rdquo;
            </p>
            <cite style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'normal' }}>— Miami agent</cite>
          </blockquote>
        </div>

        <div style={{
          position: 'absolute',
          bottom: -80,
          left: -80,
          width: 320,
          height: 320,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,255,71,0.04), transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }} />
      </div>

      {/* Right panel */}
      <div
        className="login-right"
        style={{
          width: '55%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 24px',
          position: 'relative',
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          style={{ width: '100%', maxWidth: 400 }}
        >
          {sent ? (
            <div style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                  <rect width="48" height="48" rx="24" fill="rgba(232,255,71,0.1)" />
                  <path d="M12 17a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V17z" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
                  <path d="M12 17l12 9 12-9" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 28,
                color: 'var(--text)',
                margin: '0 0 12px',
                fontWeight: 400,
              }}>
                Check your inbox
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.55 }}>
                We sent a sign-in link to <strong style={{ color: 'var(--text)' }}>{email}</strong>
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px' }}>
                Link expires in 15 minutes
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                Didn&apos;t receive it? Check spam or{' '}
                <button
                  onClick={resend}
                  disabled={loading}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--accent)',
                    fontSize: 13,
                    cursor: 'pointer',
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: 2,
                  }}
                >
                  {loading ? 'sending...' : 'resend link'}
                </button>
              </p>
            </div>
          ) : (
            <>
              <h1 style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontSize: 36,
                color: 'var(--text)',
                margin: '0 0 8px',
                fontWeight: 400,
                letterSpacing: '-0.02em',
              }}>
                Welcome back
              </h1>
              <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 40px' }}>
                Sign in to your ConversionOps dashboard
              </p>

              <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-2)',
                  marginBottom: 8,
                  display: 'block',
                }}>
                  Work email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
                  placeholder="you@brokerage.com"
                  autoFocus
                  style={{
                    width: '100%',
                    background: 'var(--bg-3)',
                    border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`,
                    borderRadius: 8,
                    padding: '12px 16px',
                    color: 'var(--text)',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    transition: 'border-color 150ms, box-shadow 150ms',
                  }}
                  onFocus={e => {
                    e.currentTarget.style.borderColor = 'var(--border-focus)';
                    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
                  }}
                  onBlur={e => {
                    e.currentTarget.style.borderColor = error ? 'var(--red)' : 'var(--border)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                />
                {error && (
                  <p style={{ fontSize: 13, color: 'var(--red)', margin: '6px 0 0' }}>{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    marginTop: 16,
                    width: '100%',
                    background: 'var(--accent)',
                    color: '#000',
                    fontWeight: 600,
                    fontSize: 15,
                    padding: '14px',
                    borderRadius: 8,
                    border: 'none',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    opacity: loading ? 0.85 : 1,
                    transition: 'filter 150ms, transform 150ms',
                    animation: loading ? 'loginPulse 1.5s ease-in-out infinite' : 'none',
                  }}
                  onMouseEnter={e => {
                    if (!loading) {
                      e.currentTarget.style.filter = 'brightness(1.05)';
                      e.currentTarget.style.transform = 'scale(1.01)';
                    }
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.filter = 'none';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  {loading ? 'Sending...' : 'Send magic link →'}
                </button>
              </form>

              <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
                New to ConversionOps?{' '}
                <a
                  href="https://cal.com/siva-karthik-angarayan-olmzzm/conversionops-demo"
                  style={{ color: 'var(--accent)', textDecoration: 'none' }}
                >
                  Book a demo →
                </a>
              </p>
            </>
          )}
        </motion.div>
      </div>

      <div className="grain" />

      <style>{`
        @keyframes loginPulse {
          0%, 100% { opacity: 0.85; }
          50% { opacity: 1; }
        }
        @media (max-width: 767px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}
