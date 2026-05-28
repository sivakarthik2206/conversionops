'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setErrorMessage('No login token found. Please request a new magic link.');
      return;
    }

    void (async () => {
      try {
        const data = await apiClient.post<{ token: string; user: { email: string } }>('/auth/verify', { token });
        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
          const maxAge = 7 * 24 * 60 * 60;
          const secure = location.protocol === 'https:' ? '; Secure' : '';
          document.cookie = `auth_token=${data.token}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
        }
        setStatus('success');
        setTimeout(() => router.push('/'), 1200);
      } catch {
        setStatus('error');
        setErrorMessage('This link has expired or already been used. Request a new one to continue.');
      }
    })();
  }, [token, router]);

  const config = {
    verifying: { color: 'var(--accent)', icon: 'loader' as const, title: 'Signing you in', sub: 'Verifying your login link.' },
    success:   { color: 'var(--green)',  icon: 'check'  as const, title: "You're in", sub: 'Redirecting to your dashboard…' },
    error:     { color: 'var(--red)',    icon: 'x'      as const, title: 'Link expired', sub: errorMessage },
  }[status];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="surface-card"
      style={{
        width: '100%',
        maxWidth: 420,
        padding: 36,
        textAlign: 'center',
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
          background: `radial-gradient(circle, ${config.color}1f, transparent 70%)`,
          filter: 'blur(30px)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: 60,
          height: 60,
          borderRadius: '50%',
          background: `${config.color}14`,
          border: `1px solid ${config.color}33`,
          color: config.color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 20px',
          position: 'relative',
        }}
      >
        <Icon
          name={config.icon}
          size={26}
          stroke={2.2}
          style={status === 'verifying' ? { animation: 'spin 1s linear infinite' } : undefined}
        />
      </div>

      <h1
        className="serif"
        style={{
          fontSize: 24,
          color: 'var(--text)',
          margin: '0 0 8px',
          fontWeight: 400,
          fontStyle: 'italic',
          fontFamily: "'Instrument Serif', serif",
          position: 'relative',
        }}
      >
        {config.title}
      </h1>
      <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px', lineHeight: 1.55, position: 'relative' }}>
        {config.sub}
      </p>

      {status === 'error' && (
        <button onClick={() => router.push('/login')} className="btn-primary" style={{ width: '100%', height: 44, position: 'relative' }}>
          Request a new link
        </button>
      )}
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,255,71,0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />
      <Suspense
        fallback={
          <div className="surface-card" style={{ width: '100%', maxWidth: 420, padding: 36, textAlign: 'center' }}>
            <Icon name="loader" size={26} stroke={2.2} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          </div>
        }
      >
        <VerifyContent />
      </Suspense>
      <div className="grain" />
    </div>
  );
}
