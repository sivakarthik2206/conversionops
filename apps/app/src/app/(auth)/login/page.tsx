'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

function PasswordUpdatedBanner() {
  const searchParams = useSearchParams();
  if (searchParams.get('message') !== 'password_updated') return null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', background: 'rgba(71,255,142,0.08)', border: '1px solid rgba(71,255,142,0.25)', borderRadius: 8, fontSize: 13, color: '#47ff8e', marginBottom: 20 }}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
      Password updated successfully. Sign in with your new password.
    </div>
  );
}

function storeSession(jwt: string) {
  try { localStorage.setItem('co_token', jwt); } catch { /* private mode */ }
  document.cookie = `co_token=${jwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password.'); return; }
    setError('');
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');
      const res = await fetch(`${base}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as Record<string, unknown>;
      if (!res.ok) {
        setError('Invalid email or password.');
        return;
      }
      const jwt = data.jwt as string;
      if (!jwt) { setError('Login failed. Please try again.'); return; }
      storeSession(jwt);
      window.location.href = '/';
    } catch {
      setError('Connection error. Please check your network and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', padding: '24px' }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', maxWidth: 400 }}
      >
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <span style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 28,
            color: 'var(--accent)',
            letterSpacing: '-0.02em',
          }}>
            ConversionOps
          </span>
        </div>

        <h1 style={{
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontSize: 32,
          fontWeight: 400,
          color: 'var(--text)',
          margin: '0 0 8px',
          letterSpacing: '-0.02em',
          textAlign: 'center',
        }}>
          Sign in to your account
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 36px', textAlign: 'center' }}>
          Enter your email and password to continue
        </p>

        <Suspense fallback={null}>
          <PasswordUpdatedBanner />
        </Suspense>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Email address
            </label>
            <input
              type="email"
              value={email}
              onChange={e => { setEmail(e.target.value); if (error) setError(''); }}
              placeholder="you@brokerage.com"
              autoComplete="email"
              autoFocus
              style={{
                width: '100%',
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 9,
                padding: '13px 16px',
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
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                placeholder="••••••••"
                autoComplete="current-password"
                style={{
                  width: '100%',
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 9,
                  padding: '13px 48px 13px 16px',
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
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-4)',
                  display: 'flex',
                  alignItems: 'center',
                  padding: 4,
                }}
              >
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={16} stroke={1.6} />
              </button>
            </div>
          </div>

          {error && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              background: 'rgba(255,92,92,0.08)',
              border: '1px solid rgba(255,92,92,0.25)',
              borderRadius: 8,
              fontSize: 13,
              color: 'var(--red)',
            }}>
              <Icon name="x-circle" size={14} stroke={2} />
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: 15,
              padding: '14px',
              borderRadius: 9,
              border: 'none',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.85 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'filter 150ms',
              marginTop: 4,
            }}
            onMouseEnter={e => { if (!loading) e.currentTarget.style.filter = 'brightness(1.06)'; }}
            onMouseLeave={e => { e.currentTarget.style.filter = 'none'; }}
          >
            {loading ? (
              <>
                <Icon name="loader" size={16} stroke={2} style={{ animation: 'spin 0.8s linear infinite' }} />
                Signing in...
              </>
            ) : 'Sign in →'}
          </button>

          <div style={{ textAlign: 'center' }}>
            <a
              href="/auth/forgot-password"
              style={{ fontSize: 13, color: 'var(--text-3)', textDecoration: 'none', transition: 'color 150ms' }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--accent)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              Forgot your password?
            </a>
          </div>
        </form>

        <p style={{ marginTop: 40, textAlign: 'center', fontSize: 12, color: 'var(--text-4)', lineHeight: 1.5 }}>
          Need access? Contact your administrator.
        </p>
      </motion.div>

      <div className="grain" />
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
