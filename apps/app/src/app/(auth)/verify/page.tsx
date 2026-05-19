'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, AlertCircle } from 'lucide-react';
import { Button, Spinner } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

export default function VerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    const token = params.get('token');
    if (!token) { setStatus('error'); return; }
    apiClient.post<{ jwt: string }>('/auth/verify', { token })
      .then(data => {
        localStorage.setItem('auth_token', data.jwt);
        setStatus('success');
        setTimeout(() => router.push('/'), 800);
      })
      .catch(() => setStatus('error'));
  }, [params, router]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        {status === 'loading' && (
          <>
            <Spinner size={32} className="mx-auto mb-4" />
            <p style={{ color: 'var(--text-2)' }}>Verifying your link…</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle size={32} className="mx-auto mb-4" style={{ color: 'var(--green)' }} />
            <p style={{ color: 'var(--text)' }}>Signed in! Redirecting…</p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle size={32} className="mx-auto mb-4" style={{ color: 'var(--red)' }} />
            <h2 className="text-lg font-medium mb-2" style={{ color: 'var(--text)' }}>Link expired or invalid</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>Magic links expire after 15 minutes.</p>
            <Button variant="secondary" onClick={() => router.push('/login')}>Request new link</Button>
          </>
        )}
      </div>
    </div>
  );
}
