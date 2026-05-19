'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, CheckCircle } from 'lucide-react';
import { Button, Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { addToast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) { setError('Enter a valid email'); return; }
    setError('');
    setLoading(true);
    try {
      await apiClient.post('/auth/magic-link', { email });
      setSent(true);
    } catch {
      addToast('Something went wrong. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.16,1,0.3,1] }}
        className="w-full max-w-[400px] rounded-[12px] p-8"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-lg)' }}
      >
        {sent ? (
          <div className="text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--green-dim)' }}>
              <CheckCircle size={24} style={{ color: 'var(--green)' }} />
            </div>
            <h1 className="font-display text-[28px] mb-2" style={{ color: 'var(--text)' }}>Check your email</h1>
            <p className="text-sm" style={{ color: 'var(--text-2)' }}>We sent a magic link to <strong style={{ color: 'var(--text)' }}>{email}</strong>. Click it to sign in.</p>
            <button onClick={() => setSent(false)} className="mt-4 text-sm hover:underline" style={{ color: 'var(--text-3)' }}>Wrong email?</button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="font-display text-[32px] mb-1" style={{ color: 'var(--text)' }}>
                Conversion<span style={{ color: 'var(--accent)' }}>Ops</span>
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Sign in with your work email</p>
            </div>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <Input label="Email" type="email" placeholder="you@brokerage.com" value={email} onChange={e => setEmail(e.target.value)} error={error} autoFocus />
              <Button type="submit" loading={loading} className="w-full gap-2">
                <Mail size={14} /> Send magic link
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
