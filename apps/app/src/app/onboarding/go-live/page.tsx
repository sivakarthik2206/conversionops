'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@conversionops/ui';

export default function GoLivePage() {
  const router = useRouter();
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confettiFall { 0% { transform: translateY(-100px) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
      .confetti { position: fixed; width: 8px; height: 8px; border-radius: 50%; pointer-events: none; animation: confettiFall 2.5s linear forwards; z-index: 9999; }
    `;
    document.head.appendChild(style);
    const colors = ['#e8ff47','#47ff8e','#4796ff','#ffb347','#a78bfa'];
    for (let i = 0; i < 60; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = '0';
      el.style.background = colors[Math.floor(Math.random() * colors.length)] ?? '#e8ff47';
      el.style.animationDelay = `${Math.random() * 1.5}s`;
      el.style.animationDuration = `${1.5 + Math.random() * 2}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    }
    return () => { style.remove(); };
  }, []);

  return (
    <div className="text-center">
      <motion.h1 className="font-display text-[48px] mb-3" style={{ color: 'var(--text)' }}
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        {"You're live"}
      </motion.h1>
      <motion.p className="text-base mb-10" style={{ color: 'var(--text-2)' }}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        Your AI is ready to convert leads 24/7. Zero effort from you.
      </motion.p>
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
        <div className="rounded-[10px] border p-5 text-left mb-8" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <p className="text-[11px] uppercase tracking-wide mb-4 font-medium" style={{ color: 'var(--text-3)' }}>Your Setup</p>
          {[
            { label: 'AI Agent', value: 'Alex' },
            { label: 'Response Time', value: '< 60 seconds' },
            { label: 'TCPA Compliant', value: 'Yes' },
          ].map(item => (
            <div key={item.label} className="flex justify-between py-2" style={{ borderBottom: '1px solid var(--border)' }}>
              <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.label}</span>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{item.value}</span>
            </div>
          ))}
        </div>
        <Button onClick={() => router.push('/')} className="w-full" size="lg">Go to dashboard ?</Button>
      </motion.div>
    </div>
  );
}
