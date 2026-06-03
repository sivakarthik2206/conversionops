'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('Magic links can only be used once and expire after 60 minutes.');

  useEffect(() => {
    if (!token) {
      setErrorMessage('No login token found. Please request a new magic link.');
      setStatus('error');
      return;
    }

    const apiUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';

    void (async () => {
      try {
        const res = await fetch(`${apiUrl}/auth/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await res.json() as { jwt?: string; user?: { email: string }; message?: string; error?: string };

        if (!res.ok) {
          setErrorMessage(data.message ?? 'Link expired or already used.');
          setStatus('error');
          return;
        }

        const jwt = data.jwt ?? '';
        if (!jwt) {
          setErrorMessage('Invalid response from server.');
          setStatus('error');
          return;
        }

        localStorage.setItem('auth_token', jwt);
        const maxAge = 7 * 24 * 60 * 60;
        const secure = location.protocol === 'https:' ? '; Secure' : '';
        document.cookie = `auth_token=${jwt}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;

        setStatus('success');
        setTimeout(() => router.push('/'), 1000);
      } catch {
        setErrorMessage('Could not reach the server. Check your connection and try again.');
        setStatus('error');
      }
    })();
  }, [token, router]);

  if (status === 'verifying') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: 'verifySpin 0.9s linear infinite' }}>
            <circle cx="20" cy="20" r="16" stroke="rgba(232,255,71,0.2)" strokeWidth="3" fill="none" />
            <path d="M20 4 a16 16 0 0 1 16 16" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400 }}>
          Signing you in...
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>Please wait a moment</p>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <rect width="48" height="48" rx="24" fill="rgba(77,255,165,0.1)" />
            <path d="M14 24l8 8 12-16" stroke="var(--green)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 28, color: 'var(--text)', margin: '0 0 10px', fontWeight: 400 }}>
          You&apos;re in!
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-2)', margin: 0 }}>Taking you to your dashboard...</p>
      </div>
    );
  }

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center' }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect width="48" height="48" rx="24" fill="rgba(255,77,77,0.1)" />
          <path d="M16 16l16 16M32 16L16 32" stroke="var(--red)" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      </div>
      <h1 style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontSize: 24, color: 'var(--text)', margin: '0 0 10px', fontWeight: 400 }}>
        Link expired or already used
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.55, maxWidth: 320 }}>
        {errorMessage}
      </p>
      <button
        onClick={() => router.push('/login')}
        style={{ background: 'var(--accent)', color: '#000', fontWeight: 600, fontSize: 14, padding: '12px 24px', borderRadius: 8, border: 'none', cursor: 'pointer' }}
      >
        Request a new link →
      </button>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, background: 'var(--bg)', position: 'relative' }}>
      <Suspense fallback={
        <div style={{ textAlign: 'center' }}>
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none" style={{ animation: 'verifySpin 0.9s linear infinite' }}>
            <circle cx="20" cy="20" r="16" stroke="rgba(232,255,71,0.2)" strokeWidth="3" fill="none" />
            <path d="M20 4 a16 16 0 0 1 16 16" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
        </div>
      }>
        <VerifyContent />
      </Suspense>
      <div className="grain" />
      <style>{`
        @keyframes verifySpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
