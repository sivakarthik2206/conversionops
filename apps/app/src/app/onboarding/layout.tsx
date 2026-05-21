'use client';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Icon } from '@/components/Icon';

const STEPS = [
  { path: '/onboarding/workspace',     label: 'Workspace' },
  { path: '/onboarding/connect-phone', label: 'Phone' },
  { path: '/onboarding/connect-crm',   label: 'CRM' },
  { path: '/onboarding/configure-ai',  label: 'AI' },
  { path: '/onboarding/test-lead',     label: 'Test' },
  { path: '/onboarding/go-live',       label: 'Live' },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const stepIdx = STEPS.findIndex(s => s.path === pathname);

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      {/* Background mesh */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 50% 0%, rgba(232,255,71,0.06) 0%, transparent 65%), radial-gradient(ellipse 60% 40% at 50% 100%, rgba(179,155,255,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        style={{
          padding: '24px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'relative',
          zIndex: 2,
        }}
      >
        <a
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'var(--text)' }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 8,
              background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0a0b',
              boxShadow: '0 6px 16px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
            }}
          >
            <Icon name="logo-mark" size={16} stroke={2} />
          </span>
          <span style={{ fontFamily: "'DM Serif Display', Georgia, serif", fontStyle: 'italic', fontSize: 18, letterSpacing: '-0.015em' }}>
            ConversionOps
          </span>
        </a>

        {/* Step progress */}
        {stepIdx >= 0 && (
          <div className="step-progress" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="eyebrow" style={{ color: 'var(--text-4)' }}>
              Step {stepIdx + 1} of {STEPS.length}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {STEPS.map((s, i) => {
                const isPast = i < stepIdx;
                const isCurrent = i === stepIdx;
                return (
                  <div
                    key={s.path}
                    style={{
                      width: isCurrent ? 28 : 6,
                      height: 6,
                      borderRadius: 100,
                      background: isPast ? 'var(--green)' : isCurrent ? 'var(--accent)' : 'var(--bg-4)',
                      boxShadow: isCurrent ? '0 0 8px var(--accent)' : isPast ? '0 0 6px var(--green)' : 'none',
                      transition: 'all 0.4s var(--ease-out-quart)',
                    }}
                  />
                );
              })}
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 24px 64px',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ width: '100%', maxWidth: 560 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <div className="grain" />

      <style>{`
        @media (max-width: 640px) { .step-progress { flex-direction: column-reverse; gap: 4px; align-items: flex-end; } }
      `}</style>
    </div>
  );
}
