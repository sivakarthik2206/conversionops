'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

function getStrength(pw: string): 'weak' | 'fair' | 'strong' {
  if (pw.length < 8) return 'weak';
  const score = [pw.length >= 12, /[A-Z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return score >= 3 ? 'strong' : score >= 2 ? 'fair' : 'weak';
}
const strengthColor = { weak: 'var(--red)', fair: 'var(--amber)', strong: 'var(--green)' };
const strengthLabel = { weak: 'Weak', fair: 'Fair', strong: 'Strong' };

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const token = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('token') : null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!token) { setError('Invalid reset link.'); return; }
    setError('');
    setLoading(true);
    try {
      const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');
      const res = await fetch(`${base}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) throw new Error('failed');
      setDone(true);
      setTimeout(() => { window.location.href = '/login?message=password_updated'; }, 2000);
    } catch {
      setError('This link has expired or is invalid. Please request a new reset link.');
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

        {done ? (
          <div style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, background: 'rgba(71,255,142,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#47ff8e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
            </div>
            <h2 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 26, color: 'var(--text)', margin: '0 0 12px', fontWeight: 400 }}>Password updated!</h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Redirecting you to sign in...</p>
          </div>
        ) : (
          <>
            <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 30, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400 }}>Set new password</h1>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px' }}>Choose a strong password for your account.</p>
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>New password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={password}
                    onChange={e => { setPassword(e.target.value); if (error) setError(''); }}
                    placeholder="Min. 8 characters"
                    style={{ width: '100%', background: 'var(--bg-3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 44px 12px 16px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                  />
                  <button type="button" onClick={() => setShowPw(v => !v)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 4 }}>
                    <Icon name={showPw ? 'eye-off' : 'eye'} size={16} stroke={1.6} />
                  </button>
                </div>
                {password && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'var(--bg-3)' }}>
                      <div style={{ height: '100%', width: getStrength(password) === 'weak' ? '33%' : getStrength(password) === 'fair' ? '66%' : '100%', background: strengthColor[getStrength(password)], borderRadius: 2, transition: 'width 0.3s' }} />
                    </div>
                    <span style={{ fontSize: 12, color: strengthColor[getStrength(password)], fontWeight: 600 }}>{strengthLabel[getStrength(password)]}</span>
                  </div>
                )}
              </div>
              <div>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Confirm password</label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirm}
                  onChange={e => { setConfirm(e.target.value); if (error) setError(''); }}
                  placeholder="Repeat password"
                  style={{ width: '100%', background: 'var(--bg-3)', border: `1px solid ${error ? 'var(--red)' : 'var(--border)'}`, borderRadius: 8, padding: '12px 16px', color: 'var(--text)', fontSize: 15, outline: 'none', boxSizing: 'border-box' }}
                />
              </div>
              {error && (
                <div>
                  <p style={{ fontSize: 13, color: 'var(--red)', margin: 0, lineHeight: 1.5 }}>{error}</p>
                  {error.includes('expired') && (
                    <a href="/auth/forgot-password" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>Request a new link →</a>
                  )}
                </div>
              )}
              <button type="submit" disabled={loading || !token} style={{ width: '100%', background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 15, padding: '14px', borderRadius: 8, border: 'none', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.85 : 1 }}>
                {loading ? 'Updating...' : 'Update password →'}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
