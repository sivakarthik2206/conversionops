'use client';
import { useEffect, useState } from 'react';

export default function VerifyPage() {
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMsg, setErrorMsg] = useState('Link expired or already used.');

  useEffect(() => {
    async function verify() {
      try {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');

        if (!token) {
          setErrorMsg('No token in URL. Please request a new sign-in link.');
          setStatus('error');
          return;
        }

        const base = (process.env.NEXT_PUBLIC_API_URL ?? 'https://api.conversionops.in/v1').replace(/\/$/, '');

        const res = await fetch(`${base}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        let data: Record<string, unknown> = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (!res.ok) {
          setErrorMsg((data.message as string) || `Error ${res.status}. Please request a new link.`);
          setStatus('error');
          return;
        }

        const jwt = (data.jwt ?? data.token ?? data.accessToken) as string | undefined;
        if (!jwt) {
          setErrorMsg('Server did not return an authentication token. Please try again.');
          setStatus('error');
          return;
        }

        try { localStorage.setItem('co_token', jwt); } catch { /* private mode */ }
        document.cookie = `co_token=${jwt}; path=/; max-age=604800; SameSite=Lax; Secure`;

        setStatus('success');
        setTimeout(() => { window.location.href = '/'; }, 1000);

      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : 'Network error. Please check your connection and try again.');
        setStatus('error');
      }
    }

    verify();
  }, []);

  const page: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0a0a0b',
    gap: '20px',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
  };

  if (status === 'verifying') return (
    <div style={page}>
      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      <div style={{ width:44, height:44, border:'3px solid rgba(232,255,71,0.15)', borderTopColor:'#e8ff47', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <p style={{ color:'#f4f4f5', fontSize:22, margin:0 }}>Signing you in...</p>
      <p style={{ color:'#71717a', fontSize:14, margin:0 }}>Please wait a moment</p>
    </div>
  );

  if (status === 'success') return (
    <div style={page}>
      <div style={{ width:56, height:56, background:'rgba(71,255,142,0.12)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#47ff8e" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <p style={{ color:'#f4f4f5', fontSize:26, margin:0 }}>You&apos;re in!</p>
      <p style={{ color:'#71717a', fontSize:14, margin:0 }}>Taking you to your dashboard...</p>
    </div>
  );

  return (
    <div style={page}>
      <div style={{ width:56, height:56, background:'rgba(255,71,71,0.12)', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ff4747" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </div>
      <p style={{ color:'#f4f4f5', fontSize:24, margin:0 }}>Link expired</p>
      <p style={{ color:'#a1a1aa', fontSize:14, margin:0, textAlign:'center', maxWidth:320, lineHeight:1.6 }}>{errorMsg}</p>
      <a href="/login" style={{ marginTop:8, padding:'12px 24px', background:'#e8ff47', color:'#000', borderRadius:8, fontSize:14, fontWeight:600, textDecoration:'none', display:'inline-block' }}>
        Request a new link →
      </a>
    </div>
  );
}
