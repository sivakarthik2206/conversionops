'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

export default function GoLivePage() {
  const router = useRouter();

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes confettiFall {
        0% { transform: translateY(-100px) rotate(0deg); opacity: 1; }
        100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
      }
      .confetti {
        position: fixed;
        width: 10px;
        height: 10px;
        border-radius: 2px;
        pointer-events: none;
        animation: confettiFall 3.2s cubic-bezier(0.16,1,0.3,1) forwards;
        z-index: 9998;
      }
    `;
    document.head.appendChild(style);

    const colors = ['#e8ff47', '#4dffa5', '#5aa3ff', '#ffb547', '#b39bff', '#ff7ab8'];
    const shapes = ['2px', '50%', '2px'];

    for (let i = 0; i < 80; i++) {
      const el = document.createElement('div');
      el.className = 'confetti';
      el.style.left = `${Math.random() * 100}%`;
      el.style.top = '0';
      const color = colors[Math.floor(Math.random() * colors.length)] ?? '#e8ff47';
      const shape = shapes[Math.floor(Math.random() * shapes.length)] ?? '2px';
      el.style.background = color;
      el.style.borderRadius = shape;
      el.style.width = `${6 + Math.random() * 8}px`;
      el.style.height = `${6 + Math.random() * 12}px`;
      el.style.animationDelay = `${Math.random() * 2}s`;
      el.style.animationDuration = `${2.4 + Math.random() * 2}s`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 5500);
    }

    return () => {
      style.remove();
    };
  }, []);

  return (
    <div style={{ textAlign: 'center', position: 'relative' }}>
      {/* Halo */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,255,71,0.18), transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 80,
          height: 80,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--accent-soft), var(--accent), var(--accent-2))',
          color: '#0a0a0b',
          marginBottom: 28,
          boxShadow: '0 16px 48px rgba(232,255,71,0.35), inset 0 1px 0 rgba(255,255,255,0.45)',
          position: 'relative',
        }}
      >
        <Icon name="sparkle" size={32} stroke={2.2} />
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="eyebrow"
        style={{ color: 'var(--accent)', marginBottom: 12, position: 'relative' }}
      >
        Step 6 of 6 · Complete
      </motion.p>

      <motion.h1
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="serif"
        style={{
          fontSize: 'clamp(40px, 6vw, 64px)',
          color: 'var(--text)',
          margin: '0 0 12px',
          fontWeight: 400,
          lineHeight: 1.0,
          letterSpacing: '-0.03em',
          position: 'relative',
        }}
      >
        You&apos;re{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          live.
        </span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        style={{
          fontSize: 16,
          color: 'var(--text-2)',
          margin: '0 auto 36px',
          maxWidth: 440,
          lineHeight: 1.55,
          position: 'relative',
        }}
      >
        Your AI is converting leads 24/7. Zero effort from you. The first response will land in under 60 seconds.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        style={{ position: 'relative' }}
      >
        <div
          className="surface-card"
          style={{
            padding: 20,
            textAlign: 'left',
            marginBottom: 24,
            display: 'flex',
            flexDirection: 'column',
            gap: 0,
          }}
        >
          <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 12 }}>Your setup</div>
          {[
            { label: 'AI agent',         value: 'Alex',            icon: 'bot' as const,    color: 'var(--purple)' },
            { label: 'Response time',    value: '< 60 seconds',    icon: 'bolt' as const,   color: 'var(--accent)' },
            { label: 'TCPA compliance',  value: 'Active',          icon: 'shield' as const, color: 'var(--green)' },
            { label: 'Always answering', value: '24 / 7',          icon: 'clock' as const,  color: 'var(--blue)' },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 0',
                borderTop: i === 0 ? 'none' : '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: `${item.color}14`,
                  border: `1px solid ${item.color}33`,
                  color: item.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Icon name={item.icon} size={13} stroke={1.8} />
              </div>
              <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)' }}>{item.label}</span>
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: item.color,
                  fontFamily: i === 1 || i === 3 ? "'JetBrains Mono', monospace" : 'inherit',
                }}
              >
                {item.value}
              </span>
              {(arr.length - 1 === i || i < arr.length) && i < 4 && (
                <span style={{ marginLeft: 4 }} />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={() => router.push('/')}
          className="btn-primary"
          style={{ width: '100%', height: 52 }}
        >
          Open dashboard
          <Icon name="arrow-right" size={14} stroke={2.2} />
        </button>
      </motion.div>
    </div>
  );
}
