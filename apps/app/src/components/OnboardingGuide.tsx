'use client';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

interface Integration { provider: string; status: string; }

interface Step {
  id: string;
  title: string;
  body: string;
  modal: string;
  checkProviders: string[];
  optional?: boolean;
}

const STEPS: Step[] = [
  {
    id: 'twilio',
    title: 'Connect your Twilio number',
    body: 'Your Twilio number is how leads text you and how AI replies on your behalf.',
    modal: 'twilio',
    checkProviders: ['twilio'],
  },
  {
    id: 'calcom',
    title: 'Connect your booking calendar',
    body: 'Cal.com lets the AI send a booking link when a lead is ready to meet.',
    modal: 'calcom',
    checkProviders: ['calcom'],
  },
  {
    id: 'crm',
    title: 'Connect your CRM',
    body: 'Sync qualified leads to Follow Up Boss or any CRM via Zapier.',
    modal: 'follow_up_boss',
    checkProviders: ['follow_up_boss', 'zapier'],
    optional: true,
  },
  {
    id: 'sources',
    title: 'Add lead sources',
    body: 'Tell us where your leads come from — Zillow, your website, or missed calls.',
    modal: 'zillow',
    checkProviders: ['zillow', 'realtor_com', 'website'],
  },
];

export function OnboardingGuide({ integrations }: { integrations: Integration[] }) {
  const isConnected = (step: Step) =>
    step.checkProviders.some(p => integrations.find(i => i.provider === p)?.status === 'connected');

  const allDone = STEPS.filter(s => !s.optional).every(s => isConnected(s));

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: '24px 0' }}>
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1 className="serif" style={{ fontSize: 36, fontWeight: 400, color: 'var(--text)', margin: '0 0 10px', letterSpacing: '-0.02em' }}>
          Let&apos;s get ConversionOps set up
        </h1>
        <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>
          Complete these steps to start capturing and converting leads.
        </p>
      </div>

      {allDone ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          style={{ textAlign: 'center', padding: '48px 24px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16 }}>
          <div style={{ width: 60, height: 60, background: 'rgba(71,255,142,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <Icon name="check-circle" size={28} stroke={2} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="serif" style={{ fontSize: 26, fontWeight: 400, color: 'var(--text)', margin: '0 0 10px' }}>You&apos;re all set!</h2>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 24px' }}>ConversionOps is live. Leads will start flowing in.</p>
          <button onClick={() => window.location.reload()} style={{ padding: '11px 28px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            View your dashboard →
          </button>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {STEPS.map((step, i) => {
            const done = isConnected(step);
            return (
              <motion.div key={step.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                className="surface-card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                {/* Step indicator */}
                <div style={{ width: 32, height: 32, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: done ? 'rgba(71,255,142,0.12)' : 'var(--bg-3)', border: `1.5px solid ${done ? 'var(--green)' : 'var(--border)'}`, color: done ? 'var(--green)' : 'var(--text-4)', fontSize: 13, fontWeight: 700 }}>
                  {done ? <Icon name="check" size={15} stroke={2.5} /> : i + 1}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: done ? 'var(--text-3)' : 'var(--text)', textDecoration: done ? 'line-through' : 'none' }}>
                      {step.title}
                    </span>
                    {step.optional && <span style={{ fontSize: 10, color: 'var(--text-4)', padding: '1px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>optional</span>}
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>{step.body}</p>
                </div>

                {!done ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                    <Link href={`/integrations?modal=${step.modal}`}
                      style={{ padding: '7px 16px', borderRadius: 8, background: 'var(--accent)', color: '#000', fontSize: 13, fontWeight: 600, textDecoration: 'none', display: 'inline-block', whiteSpace: 'nowrap' }}>
                      Connect →
                    </Link>
                    {step.optional && (
                      <button style={{ fontSize: 12, color: 'var(--text-4)', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'right' }}>Skip</button>
                    )}
                  </div>
                ) : (
                  <span style={{ fontSize: 12, color: 'var(--green)', fontWeight: 600, flexShrink: 0 }}>Done ✓</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
