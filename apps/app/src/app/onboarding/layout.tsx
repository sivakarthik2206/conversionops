'use client';
import { usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';

const STEPS = [
  '/onboarding/workspace',
  '/onboarding/connect-phone',
  '/onboarding/connect-crm',
  '/onboarding/configure-ai',
  '/onboarding/test-lead',
  '/onboarding/go-live',
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const stepIdx = STEPS.indexOf(pathname);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 py-12" style={{ background: 'var(--bg)' }}>
      {stepIdx >= 0 && (
        <div className="flex items-center gap-2 mb-10">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{
                width: i === stepIdx ? 24 : 8,
                height: 8,
                background: i < stepIdx ? 'var(--green)' : i === stepIdx ? 'var(--accent)' : 'var(--bg-4)',
              }} />
          ))}
        </div>
      )}
      <div className="w-full max-w-[520px]">
        <AnimatePresence mode="wait">
          <motion.div key={pathname}
            initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.2, ease: [0.16,1,0.3,1] }}>
            {children}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
