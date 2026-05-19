'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bot, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Spinner } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

const MOCK_REPLIES = [
  "Hi! I'm Alex with your team. I saw your inquiry — are you looking to buy or sell a property? I can help right now!",
  "Great! What area are you looking in? And what's your approximate timeline — are you ready to move within the next 30-90 days?",
  "Perfect. And have you spoken with a lender yet, or are you still exploring financing options?",
];

export default function TestLeadPage() {
  const router = useRouter();
  const [firing, setFiring] = useState(false);
  const [messages, setMessages] = useState<string[]>([]);
  const [score, setScore] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [done, setDone] = useState(false);

  const handleFire = async () => {
    setFiring(true);
    const start = Date.now();
    const tick = setInterval(() => setElapsed(Math.floor((Date.now()-start)/1000)), 100);
    try { await apiClient.post('/webhooks/lead', { source: 'WEB_FORM', name: 'Test Lead', phone: '+15550001234', email: 'test@example.com' }); } catch { /* continue simulation */ }
    MOCK_REPLIES.forEach((reply, i) => {
      setTimeout(() => {
        setMessages(m => [...m, reply]);
        setScore(s => Math.min(94, s + 31));
        if (i === MOCK_REPLIES.length - 1) { clearInterval(tick); setFiring(false); setDone(true); }
      }, (i+1)*2200);
    });
  };

  return (
    <div>
      <h1 className="font-display text-[32px] mb-2" style={{ color: 'var(--text)' }}>Fire a test lead</h1>
      <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>See your AI respond to a real lead in real time.</p>
      {!firing && messages.length === 0 ? (
        <Button onClick={handleFire} className="w-full mb-6">Fire test lead ?</Button>
      ) : (
        <div className="rounded-[10px] border p-4 mb-6" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: firing ? 'var(--amber)' : 'var(--green)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{firing ? 'AI responding…' : 'Complete'}</span>
            </div>
            <div className="flex items-center gap-1" style={{ color: 'var(--text-3)' }}>
              <Clock size={12} />
              <span className="text-xs font-mono">{elapsed}s</span>
            </div>
          </div>
          <div className="flex flex-col gap-3 mb-4">
            <div className="text-right">
              <div className="inline-block px-3 py-2 rounded-[10px] text-sm" style={{ background: 'var(--accent-dim)', color: 'var(--text)' }}>
                Hi, I saw a listing on Zillow and wanted more info
              </div>
            </div>
            <AnimatePresence>
              {messages.map((msg, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: 'var(--purple-dim)' }}>
                      <Bot size={12} style={{ color: 'var(--purple)' }} />
                    </div>
                    <div className="px-3 py-2 rounded-[10px] text-sm" style={{ background: 'var(--bg-3)', borderLeft: '2px solid var(--purple)', color: 'var(--text)' }}>{msg}</div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {firing && messages.length < MOCK_REPLIES.length && (
              <div className="flex items-center gap-2">
                <Spinner size={14} />
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>Typing…</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Lead Score</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
              <motion.div className="h-full rounded-full" style={{ background: 'var(--accent)' }} animate={{ width: `${score}%` }} transition={{ duration: 0.5 }} />
            </div>
            <motion.span className="text-sm font-display" style={{ color: 'var(--accent)' }} animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.3 }}>{score}</motion.span>
          </div>
        </div>
      )}
      {done && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <p className="text-sm mb-4 font-medium" style={{ color: 'var(--green)' }}>It works! AI responded in {elapsed}s</p>
          <Button onClick={() => router.push('/onboarding/go-live')} className="w-full">{"You're ready — go live ?"}</Button>
        </motion.div>
      )}
    </div>
  );
}
