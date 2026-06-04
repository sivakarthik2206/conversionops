'use client';
import { useEffect, useState } from 'react';
import { Icon } from '@/components/Icon';

type Phase = 'verifying' | 'set-password' | 'success' | 'error';

function getPasswordStrength(pw: string): 'weak' | 'fair' | 'strong' {
  if (pw.length < 8) return 'weak';
  const hasUpper = /[A-Z]/.test(pw);
  const hasNum = /\d/.test(pw);
  const hasSpec = /[^A-Za-z0-9]/.test(pw);
  const score = [pw.length >= 12, hasUpper, hasNum, hasSpec].filter(Boolean).length;
  if (score >= 3) return 'strong';
  if (score >= 2) return 'fair';
  return 'weak';
}

const strengthColor = { weak: 'var(--red)', fair: 'var(--amber)', strong: 'var(--green)' };
const strengthLabel = { weak: 'Weak', fair: 'Fair', strong: 'Strong' };

export default function VerifyPage() {
  const [phase, setPhase] = useState<Phase>('verifying');
  const [errorMsg, setErrorMsg] = useState('Link expired or already used.');
  const [jwt, setJwt] = useState('');

  // Password creation state
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [pwError, setPwError] = useState('');
  const [pwLoading, setPwLoading] = useState(false);

  useEffect(() => {
    async function verify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        if (!token) { setErrorMsg('No token in URL. Please request a new sign-in link.'); setPhase('error'); return; }

        const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');
        const res = await fetch(`${base}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (!res.ok) { setErrorMsg((data.message as string) || `Error ${res.status}. Please request a new link.`); setPhase('error'); return; }

        const sessionJwt = (data.jwt ?? data.token ?? data.accessToken) as string | undefined;
        if (!sessionJwt) { setErrorMsg('Server did not return a token. Please try again.'); setPhase('error'); return; }

        try { localStorage.setItem('co_token', sessionJwt); } catch { /* private mode */ }
        document.cookie = `co_token=${sessionJwt}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax; Secure`;

        setJwt(sessionJwt);

        if (data.hasPassword === false) {
          setPhase('set-password');
        } else {
          setPhase('success');
          setTimeout(() => { window.location.href = '/'; }, 1000);
        }
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Network error. Please try again.');
        setPhase('error');
      }
    }
    verify();
  }, []);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setPwError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setPwError('Passwords do not match.'); return; }
    setPwError('');
    setPwLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');
      const res = await fetch(`${base}/auth/set-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${jwt}` },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) throw new Error('Failed to set password');
      setPhase('success');
      setTimeout(() => { window.location.href = '/'; }, 1000);
    } catch {
      setPwError('Failed to save password. Please try again.');
    } finally {
      setPwLoading(false);
    }
  };

  const page: React.CSSProperties = { minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0b', gap: '20px', padding: '24px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' };

  if (phase === 'verifying') return (
    <div style={page}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(232,255,71,0.15)', borderTopColor: '#e8ff47', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: '#f4f4f5', fontSize: 22, margin: 0 }}>Signing you in...</p>
      <p style={{ color: '#71717a', fontSize: 14, margin: 0 }}>Please wait a moment</p>
    </div>
  );

  if (phase === 'set-password') {
    const strength = password ? getPasswordStrength(password) : null;
    return (
      <div style={{ ...page, gap: 0 }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 52, height: 52, background: 'rgba(232,255,71,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e8ff47" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </div>
            <h1 style={{ color: '#f4f4f5', fontSize: 24, margin: '0 0 8px', fontWeight: 600 }}>Set your password</h1>
            <p style={{ color: '#71717a', fontSize: 14, margin: 0, lineHeight: 1.5 }}>Create a password so you can log in without a magic link next time.</p>
          </div>
          <form onSubmit={submitPassword} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 13, color: '#a1a1aa', display: 'block', marginBottom: 8 }}>New password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); if (pwError) setPwError(''); }}
                  placeholder="Min. 8 characters"
                  style={{ width: '100%', background: '#18181b', border: '1px solid #27272a', borderRadius: 8, padding: '12px 44px 12px 16px', color: '#f4f4f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525b', display: 'flex', padding: 4 }}>
                  <Icon name={showPw ? 'eye-off' : 'eye'} size={16} stroke={1.6} />
                </button>
              </div>
              {password && strength && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                  <div style={{ flex: 1, height: 4, borderRadius: 2, background: '#27272a', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: strength === 'weak' ? '33%' : strength === 'fair' ? '66%' : '100%', background: strengthColor[strength], borderRadius: 2, transition: 'width 0.3s, background 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 12, color: strengthColor[strength], fontWeight: 600 }}>{strengthLabel[strength]}</span>
                </div>
              )}
            </div>
            <div>
              <label style={{ fontSize: 13, color: '#a1a1aa', display: 'block', marginBottom: 8 }}>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirm}
                onChange={e => { setConfirm(e.target.value); if (pwError) setPwError(''); }}
                placeholder="Repeat password"
                style={{ width: '100%', background: '#18181b', border: `1px solid ${pwError ? '#ef4444' : '#27272a'}`, borderRadius: 8, padding: '12px 16px', color: '#f4f4f5', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
            {pwError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{pwError}</p>}
            <button type="submit" disabled={pwLoading} style={{ width: '100%', background: '#e8ff47', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: pwLoading ? 'not-allowed' : 'pointer', opacity: pwLoading ? 0.85 : 1, marginTop: 4 }}>
              {pwLoading ? 'Saving...' : 'Set password & continue →'}
            </button>
            <button type="button" onClick={() => { setPhase('success'); setTimeout(() => { window.location.href = '/'; }, 100); }} style={{ background: 'none', border: 'none', color: '#52525b', fontSize: 13, cursor: 'pointer', textDecoration: 'underline', textUnderlineOffset: 2 }}>
              Skip for now
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (phase === 'success') return (
    <div style={page}>
      <div style={{ width: 56, height: 56, background: 'rgba(71,255,142,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#47ff8e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
      </div>
      <p style={{ color: '#f4f4f5', fontSize: 26, margin: 0 }}>You&apos;re in!</p>
      <p style={{ color: '#71717a', fontSize: 14, margin: 0 }}>Taking you to your dashboard...</p>
    </div>
  );

  return (
    <div style={page}>
      <div style={{ width: 56, height: 56, background: 'rgba(255,71,71,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4747" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
      </div>
      <p style={{ color: '#f4f4f5', fontSize: 24, margin: 0 }}>Link expired</p>
      <p style={{ color: '#a1a1aa', fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 320, lineHeight: 1.6 }}>{errorMsg}</p>
      <a href="/auth/login" style={{ marginTop: 8, padding: '12px 24px', background: '#e8ff47', color: '#000', borderRadius: 8, fontSize: 14, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
        Request a new link →
      </a>
    </div>
  );
}
