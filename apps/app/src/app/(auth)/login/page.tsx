'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setError('Enter a valid work email');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/magic-link', { email });
      setSent(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        position: 'relative',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Ambient mesh */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 60% 50% at 20% 30%, rgba(232,255,71,0.10) 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 80% 60%, rgba(179,155,255,0.07) 0%, transparent 60%)',
          pointerEvents: 'none',
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '100%',
          maxWidth: 420,
          position: 'relative',
        }}
      >
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'center', marginBottom: 36 }}>
          <span
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0a0b',
              boxShadow: '0 8px 24px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <Icon name="logo-mark" size={20} stroke={2} />
          </span>
          <span
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 24,
              color: 'var(--text)',
              letterSpacing: '-0.015em',
            }}
          >
            ConversionOps
          </span>
        </div>

        <div
          className="surface-card"
          style={{
            padding: 32,
            boxShadow: 'var(--shadow-xl)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(232,255,71,0.10), transparent 70%)',
              filter: 'blur(30px)',
              pointerEvents: 'none',
            }}
          />

          {sent ? (
            <div style={{ textAlign: 'center', position: 'relative' }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--green), #2bd886)',
                  color: '#0a0a0b',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px',
                  boxShadow: '0 12px 32px rgba(77,255,165,0.35)',
                }}
              >
                <Icon name="check" size={22} stroke={2.4} />
              </div>
              <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400, fontStyle: 'italic', fontFamily: "'Instrument Serif', serif" }}>
                Check your email
              </h1>
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 16px', lineHeight: 1.55 }}>
                We sent a magic link to{' '}
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{email}</span>.<br />Click it to sign in.
              </p>
              <button
                onClick={() => setSent(false)}
                style={{
                  fontSize: 12,
                  color: 'var(--text-3)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                Wrong email?
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 8 }}>Sign in</p>
              <h1
                className="serif"
                style={{
                  fontSize: 28,
                  color: 'var(--text)',
                  margin: '0 0 8px',
                  fontWeight: 400,
                  letterSpacing: '-0.025em',
                }}
              >
                Welcome{' '}
                <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
                  back.
                </span>
              </h1>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px' }}>
                Enter your work email — we&apos;ll send you a magic link.
              </p>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <Input
                  label="Email"
                  type="email"
                  placeholder="you@brokerage.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  error={error}
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="btn-primary"
                  style={{ width: '100%', height: 46 }}
                >
                  {loading ? (
                    <Icon name="loader" size={14} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Icon name="mail" size={14} stroke={1.8} />
                  )}
                  Send magic link
                </button>
              </form>

              <p style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 20, textAlign: 'center', lineHeight: 1.55 }}>
                No passwords. We&apos;ll email you a one-time link.
              </p>
            </div>
          )}
        </div>

        <p style={{ fontSize: 11, color: 'var(--text-5)', textAlign: 'center', marginTop: 24, fontFamily: "'JetBrains Mono', monospace" }}>
          New to ConversionOps? Use the same email to sign up.
        </p>
      </motion.div>

      <div className="grain" />
    </div>
  );
}
