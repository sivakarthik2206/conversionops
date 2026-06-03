'use client';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    async function verify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setErrorMsg('No token found. Please request a new sign-in link.');
          setStatus('error');
          return;
        }

        const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.conversionops.in/v1').replace(/\/$/, '');

        const res = await fetch(`${apiUrl}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const text = await res.text();
        let data: Record<string, unknown> = {};
        try { data = JSON.parse(text); } catch { /* non-json response */ }

        if (!res.ok) {
          const msg = (data.message as string) || `Server error ${res.status}`;
          setErrorMsg(msg);
          setStatus('error');
          return;
        }

        const jwt = (data.jwt || data.token || data.accessToken) as string;
        if (!jwt) {
          setErrorMsg('No authentication token received from server.');
          setStatus('error');
          return;
        }

        try { localStorage.setItem('co_token', jwt); } catch { /* private browsing */ }
        document.cookie = `co_token=${jwt}; path=/; max-age=604800; SameSite=Lax; Secure`;

        setStatus('success');
        setTimeout(() => { window.location.href = '/'; }, 1200);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Network error. Please check your connection.');
        setStatus('error');
      }
    }

    void verify();
  }, []);

  const styles = {
    page: { minHeight: '100vh', display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', background: '#0a0a0b', gap: '20px', padding: '24px' },
    icon: { width: 56, height: 56, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' },
    title: { color: '#f4f4f5', fontFamily: 'Georgia, serif', fontSize: 26, margin: 0, textAlign: 'center' as const },
    subtitle: { color: '#a1a1aa', fontSize: 14, margin: 0, textAlign: 'center' as const, maxWidth: 340, lineHeight: 1.6 },
    button: { marginTop: 8, padding: '12px 24px', background: '#e8ff47', color: '#000', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', textDecoration: 'none', display: 'inline-block' },
  };

  if (status === 'verifying') return (
    <div style={styles.page}>
      <div style={{ width: 44, height: 44, border: '3px solid rgba(232,255,71,0.15)', borderTop: '3px solid #e8ff47', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <p style={styles.title}>Signing you in...</p>
      <p style={styles.subtitle}>Please wait a moment</p>
    </div>
  );

  if (status === 'success') return (
    <div style={styles.page}>
      <div style={{ ...styles.icon, background: 'rgba(71,255,142,0.12)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#47ff8e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style={styles.title}>You&apos;re in!</p>
      <p style={styles.subtitle}>Taking you to your dashboard...</p>
    </div>
  );

  return (
    <div style={styles.page}>
      <div style={{ ...styles.icon, background: 'rgba(255,71,71,0.12)' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4747" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <p style={styles.title}>Link expired</p>
      <p style={styles.subtitle}>{errorMsg || 'This link has expired or already been used.'}</p>
      <a href="/login" style={styles.button}>Request a new link →</a>
    </div>
  );
}
