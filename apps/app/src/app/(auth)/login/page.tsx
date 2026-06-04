'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

type Tab = 'magic' | 'password';

function storeSession(jwt: string) {
  try { localStorage.setItem('co_token', jwt); } catch { /* private mode */ }
  document.cookie = `co_token=${jwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;
}

export default function LoginPage() {
  const [tab, setTab] = useState<Tab>('magic');

  // Magic link state
  const [magicEmail, setMagicEmail] = useState('');
  const [magicSent, setMagicSent] = useState(false);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState('');

  // Password login state
  const [pwEmail, setPwEmail] = useState('');
  const [pwPassword, setPwPassword] = useState('');
  const [pwShowPass, setPwShowPass] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  const submitMagic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!magicEmail.includes('@')) { setMagicError('Enter a valid email address'); return; }
    setMagicError('');
    setMagicLoading(true);
    try {
      await apiClient.post('/auth/magic-link', { email: magicEmail });
      setMagicSent(true);
    } catch {
      setMagicError('Something went wrong. Please try again.');
    } finally {
      setMagicLoading(false);
    }
  };

  const resendMagic = async () => {
    setMagicLoading(true);
    try { await apiClient.post('/auth/magic-link', { email: magicEmail }); } catch { /* silent */ }
    finally { setMagicLoading(false); }
  };

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pwEmail.includes('@') || !pwPassword) { setPwError('Please fill in both fields.'); return; }
    setPwError('');
    setPwLoading(true);
    try {
      const res = await apiClient.post<{ jwt: string }>('/auth/login', { email: pwEmail, password: pwPassword });
      storeSession(res.jwt);
      window.location.href = '/';
    } catch {
      setPwError('Invalid email or password.');
    } finally {
      setPwLoading(false);
    }
  };

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: '100%',
    background: 'var(--bg-3)',
    border: `1px solid ${hasError ? 'var(--red)' : 'var(--border)'}`,
    borderRadius: 8,
    padding: '12px 16px',
    color: 'var(--text)',
    fontSize: 15,
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 150ms, box-shadow 150ms',
  });

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--border-focus)';
    e.currentTarget.style.boxShadow = '0 0 0 3px var(--accent-dim)';
  };
  const onBlur = (hasError: boolean) => (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = hasError ? 'var(--red)' : 'var(--border)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Left brand panel */}
      <div className="login-left" style={{ width: '45%', background: 'var(--bg-2)', padding: '60px', display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
        <div style={{ marginBottom: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 64 }}>
            <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: 28, color: 'var(--accent)', letterSpacing: '-0.02em' }}>ConversionOps</span>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', flexShrink: 0 }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20, marginBottom: 56 }}>
            {['AI responds to leads in 60 seconds', 'Qualifies, scores, books automatically', 'Syncs to Follow Up Boss instantly'].map(feat => (
              <div key={feat} style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <span style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(232,255,71,0.12)', border: '1px solid rgba(232,255,71,0.3)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 11, fontWeight: 700, marginTop: 1 }}>✓</span>
                <span style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.5 }}>{feat}</span>
              </div>
            ))}
          </div>
          <blockquote style={{ margin: 0, padding: '20px 24px', borderLeft: '2px solid rgba(232,255,71,0.3)', background: 'rgba(232,255,71,0.03)', borderRadius: '0 8px 8px 0' }}>
            <p style={{ fontSize: 14, color: 'var(--text-3)', fontStyle: 'italic', lineHeight: 1.65, margin: '0 0 8px' }}>&ldquo;Responded to 3 Zillow leads while I was showing a property. Two of them booked appointments.&rdquo;</p>
            <cite style={{ fontSize: 13, color: 'var(--text-4)', fontStyle: 'normal' }}>— Miami agent</cite>
          </blockquote>
        </div>
        <div style={{ position: 'absolute', bottom: -80, left: -80, width: 320, height: 320, borderRadius: '50%', background: 'radial-gradient(circle, rgba(232,255,71,0.04), transparent 70%)', filter: 'blur(40px)', pointerEvents: 'none' }} />
      </div>

      {/* Right auth panel */}
      <div className="login-right" style={{ width: '55%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '60px 24px', position: 'relative' }}>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }} style={{ width: '100%', maxWidth: 400 }}>

          <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 36, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400, letterSpacing: '-0.02em' }}>Welcome back</h1>
          <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 28px' }}>Sign in to your ConversionOps dashboard</p>

          {/* Tabs */}
          <div style={{ display: 'flex', background: 'var(--bg-3)', borderRadius: 10, padding: 4, marginBottom: 28, gap: 4 }}>
            {(['magic', 'password'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 7,
                border: 'none',
                background: tab === t ? 'var(--bg-2)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-3)',
                fontWeight: tab === t ? 600 : 400,
                fontSize: 13,
                cursor: 'pointer',
                transition: 'all 0.15s',
                boxShadow: tab === t ? 'var(--shadow-sm)' : 'none',
              }}>
                {t === 'magic' ? 'Magic Link' : 'Email & Password'}
              </button>
            ))}
          </div>

          {/* Magic Link Tab */}
          {tab === 'magic' && (
            magicSent ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                    <rect width="48" height="48" rx="24" fill="rgba(232,255,71,0.1)" />
                    <path d="M12 17a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H14a2 2 0 0 1-2-2V17z" stroke="var(--accent)" strokeWidth="1.8" fill="none" />
                    <path d="M12 17l12 9 12-9" stroke="var(--accent)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--text)', margin: '0 0 12px', fontWeight: 400 }}>Check your inbox</h2>
                <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.55 }}>We sent a sign-in link to <strong style={{ color: 'var(--text)' }}>{magicEmail}</strong></p>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px' }}>Link expires in 60 minutes</p>
                <p style={{ fontSize: 13, color: 'var(--text-3)' }}>
                  Didn&apos;t get it?{' '}
                  <button onClick={resendMagic} disabled={magicLoading} style={{ background: 'none', border: 'none', color: 'var(--accent)', fontSize: 13, cursor: 'pointer', padding: 0, textDecoration: 'underline', textUnderlineOffset: 2 }}>
                    {magicLoading ? 'sending...' : 'resend link'}
                  </button>
                </p>
              </div>
            ) : (
              <form onSubmit={submitMagic} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8, display: 'block' }}>Work email</label>
                  <input
                    type="email"
                    value={magicEmail}
                    onChange={e => { setMagicEmail(e.target.value); if (magicError) setMagicError(''); }}
                    placeholder="you@brokerage.com"
                    autoFocus
                    style={inputStyle(!!magicError)}
                    onFocus={onFocus}
                    onBlur={onBlur(!!magicError)}
                  />
                  {magicError && <p style={{ fontSize: 13, color: 'var(--red)', margin: '6px 0 0' }}>{magicError}</p>}
                </div>
                <button type="submit" disabled={magicLoading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: magicLoading ? 'not-allowed' : 'pointer', opacity: magicLoading ? 0.85 : 1 }}>
                  {magicLoading ? 'Sending...' : 'Send magic link →'}
                </button>
              </form>
            )
          )}

          {/* Password Tab */}
          {tab === 'password' && (
            <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', marginBottom: 8, display: 'block' }}>Work email</label>
                <input
                  type="email"
                  value={pwEmail}
                  onChange={e => { setPwEmail(e.target.value); if (pwError) setPwError(''); }}
                  placeholder="you@brokerage.com"
                  autoFocus
                  style={inputStyle(!!pwError)}
                  onFocus={onFocus}
                  onBlur={onBlur(!!pwError)}
                />
              </div>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>Password</label>
                  <a href="/auth/forgot-password" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Forgot password?</a>
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type={pwShowPass ? 'text' : 'password'}
                    value={pwPassword}
                    onChange={e => { setPwPassword(e.target.value); if (pwError) setPwError(''); }}
                    placeholder="••••••••"
                    style={{ ...inputStyle(!!pwError), paddingRight: 44 }}
                    onFocus={onFocus}
                    onBlur={onBlur(!!pwError)}
                  />
                  <button type="button" onClick={() => setPwShowPass(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', alignItems: 'center', padding: 4 }}>
                    <Icon name={pwShowPass ? 'eye-off' : 'eye'} size={16} stroke={1.6} />
                  </button>
                </div>
              </div>
              {pwError && <p style={{ fontSize: 13, color: 'var(--red)', margin: '-6px 0 0' }}>{pwError}</p>}
              <button type="submit" disabled={pwLoading} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.85 : 1 }}>
                {pwLoading ? 'Signing in...' : 'Sign in →'}
              </button>
            </form>
          )}

          <p style={{ marginTop: 24, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
            New to ConversionOps?{' '}
            <a href="https://cal.com/siva-karthik-angarayan-olmzzm/conversionops-demo" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Book a demo →</a>
          </p>
        </motion.div>
      </div>

      <div className="grain" />
      <style>{`
        @media (max-width: 767px) {
          .login-left { display: none !important; }
          .login-right { width: 100% !important; padding: 24px !important; }
        }
      `}</style>
    </div>
  );
}
