'use client';
import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api-client';

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
        const data = await apiClient.post<{ token: string; user: { email: string } }>(
          '/auth/verify',
          { token },
        );

        if (typeof window !== 'undefined') {
          localStorage.setItem('auth_token', data.token);
        }

        setStatus('success');
        setTimeout(() => router.push('/'), 1200);
      } catch {
        setStatus('error');
        setErrorMessage('This link has expired or already been used. Please request a new one.');
      }
    })();
  }, [token, router]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="w-full max-w-[400px] rounded-[12px] p-8 text-center"
      style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
    >
      {status === 'verifying' && (
        <>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--accent-dim)' }}>
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Signing you in…</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Verifying your login link.</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--green-dim)' }}>
            <CheckCircle size={24} style={{ color: 'var(--green)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>You&apos;re in!</h1>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Redirecting to your dashboard…</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--red-dim)' }}>
            <XCircle size={24} style={{ color: 'var(--red)' }} />
          </div>
          <h1 className="text-xl font-semibold mb-2" style={{ color: 'var(--text)' }}>Link expired</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--text-3)' }}>{errorMessage}</p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Request a new link
          </button>
        </>
      )}
    </motion.div>
  );
}

export default function VerifyPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <Suspense fallback={
        <div className="w-full max-w-[400px] rounded-[12px] p-8 text-center" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
          <Loader2 size={24} className="animate-spin mx-auto" style={{ color: 'var(--accent)' }} />
        </div>
      }>
        <VerifyContent />
      </Suspense>
    </div>
  );
}
