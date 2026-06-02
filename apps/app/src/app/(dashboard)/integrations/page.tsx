'use client';
import { useState, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import Link from 'next/link';

interface Workspace {
  id: string;
  name: string;
  twilioNumber: string | null;
  aiConfig: {
    followUpBossApiKey?: string;
    calComUsername?: string;
    calComLink?: string;
  };
}

const WEBHOOK_URL = 'https://api.conversionops.in/v1/webhooks/lead';

function CopyButton({ text, size = 13 }: { text: string; size?: number }) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback(() => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);
  return (
    <button
      onClick={copy}
      style={{
        width: 30, height: 30, borderRadius: 7, background: 'transparent',
        border: '1px solid var(--border)', color: copied ? 'var(--green)' : 'var(--text-3)',
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.15s', flexShrink: 0,
      }}
      onMouseEnter={e => { if (!copied) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
      onMouseLeave={e => { if (!copied) e.currentTarget.style.borderColor = 'var(--border)'; }}
    >
      <Icon name={copied ? 'check' : 'copy'} size={size} stroke={1.8} />
    </button>
  );
}

function UrlDisplay({ url }: { url: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
      borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--border)',
    }}>
      <code style={{
        flex: 1, fontSize: 12, color: 'var(--text-2)',
        fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden',
        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>{url}</code>
      <CopyButton text={url} />
    </div>
  );
}

function StatusDot({ connected }: { connected: boolean }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px',
      borderRadius: 100, background: connected ? 'rgba(71,255,142,0.10)' : 'var(--bg-4)',
      border: `1px solid ${connected ? 'rgba(71,255,142,0.25)' : 'var(--border)'}`,
      color: connected ? 'var(--green)' : 'var(--text-3)',
      fontSize: 10, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace",
      letterSpacing: '0.04em', textTransform: 'uppercase', flexShrink: 0,
    }}>
      <span style={{
        width: 5, height: 5, borderRadius: '50%',
        background: connected ? 'var(--green)' : 'var(--text-4)',
        boxShadow: connected ? '0 0 4px var(--green)' : 'none',
      }} />
      {connected ? 'Connected' : 'Not connected'}
    </span>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 4px', letterSpacing: '-0.01em' }}>{title}</h2>
      <p style={{ fontSize: 12, color: 'var(--text-3)', margin: 0 }}>{description}</p>
    </div>
  );
}

interface ZapierModalProps {
  open: boolean;
  onClose: () => void;
  source: 'ZILLOW' | 'REALTOR_COM' | 'WEB_FORM';
  title: string;
  triggerLabel: string;
}

function ZapierModal({ open, onClose, source, title, triggerLabel }: ZapierModalProps) {
  const jsonBody = `{
  "source": "${source}",
  "name": "{{lead_name}}",
  "phone": "{{lead_phone}}",
  "email": "{{lead_email}}",
  "message": "{{lead_message}}",
  "apiKey": "YOUR_WORKSPACE_API_KEY"
}`;

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 28, maxWidth: 560, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
            Connect {title}
          </h3>
          <button
            onClick={onClose}
            style={{ width: 30, height: 30, borderRadius: '50%', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <Icon name="x" size={12} stroke={2} />
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {[
            { n: 1, text: 'Go to zapier.com and create a free account' },
            { n: 2, text: `Create a new Zap — Trigger: ${triggerLabel}` },
            { n: 3, text: 'Action: Webhooks by Zapier → POST' },
            { n: 4, text: 'URL field — paste your webhook URL:' },
            { n: 5, text: 'Body — paste this JSON:' },
            { n: 6, text: 'Test the Zap — a test lead will appear in your dashboard' },
          ].map(step => (
            <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%', background: 'var(--accent-dim)',
                border: '1px solid var(--border-focus)', color: 'var(--accent)',
                fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center',
                justifyContent: 'center', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace",
              }}>{step.n}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.5 }}>{step.text}</p>
                {step.n === 4 && <UrlDisplay url={WEBHOOK_URL} />}
                {step.n === 5 && (
                  <div style={{ position: 'relative' }}>
                    <pre style={{
                      background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10,
                      padding: '12px 14px', margin: 0, fontSize: 11.5,
                      fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)',
                      overflowX: 'auto', lineHeight: 1.6,
                    }}>{jsonBody}</pre>
                    <div style={{ position: 'absolute', top: 8, right: 8 }}>
                      <CopyButton text={jsonBody} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

interface WebsiteModalProps { open: boolean; onClose: () => void; }

function WebsiteModal({ open, onClose }: WebsiteModalProps) {
  const snippet = `fetch('${WEBHOOK_URL}', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    source: 'WEB_FORM',
    name: document.getElementById('name').value,
    phone: document.getElementById('phone').value,
    email: document.getElementById('email').value,
    message: document.getElementById('message').value,
    apiKey: 'YOUR_WORKSPACE_API_KEY'
  })
});`;

  if (!open) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.2 }}
        style={{
          background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 16,
          padding: 28, maxWidth: 560, width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Connect your website</h3>
          <button onClick={onClose} style={{ width: 30, height: 30, borderRadius: '50%', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="x" size={12} stroke={2} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 16px', lineHeight: 1.55 }}>
          Paste this into your contact form submit handler. Replace the field IDs with your form&apos;s actual input IDs.
        </p>
        <div style={{ position: 'relative' }}>
          <pre style={{
            background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 10,
            padding: '12px 14px', margin: '0 0 12px', fontSize: 11.5,
            fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-2)',
            overflowX: 'auto', lineHeight: 1.6,
          }}>{snippet}</pre>
          <div style={{ position: 'absolute', top: 8, right: 8 }}>
            <CopyButton text={snippet} />
          </div>
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>
          Note: Replace the field IDs with your form&apos;s actual input IDs.
        </p>
      </motion.div>
    </div>
  );
}

function IntCard({
  icon, title, accent, connected, description, children,
}: {
  icon: Parameters<typeof Icon>[0]['name'];
  title: string;
  accent: string;
  connected: boolean;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="surface-card" style={{ padding: 22, position: 'relative', overflow: 'hidden', borderRadius: 12 }}>
      <div style={{ position: 'absolute', top: -50, right: -50, width: 140, height: 140, borderRadius: '50%', background: `radial-gradient(circle, ${accent}14, transparent 70%)`, filter: 'blur(25px)', pointerEvents: 'none' }} />
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `${accent}14`, border: `1px solid ${accent}33`, color: accent, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Icon name={icon} size={16} stroke={1.8} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: '0 0 3px', letterSpacing: '-0.01em' }}>{title}</h3>
            <p style={{ fontSize: 11.5, color: 'var(--text-3)', margin: 0 }}>{description}</p>
          </div>
        </div>
        <StatusDot connected={connected} />
      </div>
      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}

export default function IntegrationsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspace } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });

  const [modal, setModal] = useState<'zillow' | 'realtor' | 'website' | null>(null);
  const [fubKey, setFubKey] = useState('');
  const [savingFub, setSavingFub] = useState(false);
  const [calUsername, setCalUsername] = useState('');
  const [savingCal, setSavingCal] = useState(false);

  const hasFub = !!(workspace?.aiConfig.followUpBossApiKey);
  const hasCal = !!(workspace?.aiConfig.calComUsername);
  const hasPhone = !!(workspace?.twilioNumber);

  const saveFub = async () => {
    if (!fubKey.trim()) return;
    setSavingFub(true);
    try {
      await apiClient.patch('/workspaces/me', { followUpBossApiKey: fubKey.trim() });
      await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Follow Up Boss connected', 'success');
      setFubKey('');
    } catch { addToast('Failed to save API key', 'error'); }
    finally { setSavingFub(false); }
  };

  const saveCal = async () => {
    if (!calUsername.trim()) return;
    setSavingCal(true);
    try {
      await apiClient.patch('/workspaces/me', { calComUsername: calUsername.trim() });
      await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Cal.com username saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSavingCal(false); }
  };

  return (
    <>
      <AnimatePresence>
        {modal === 'zillow' && <ZapierModal open onClose={() => setModal(null)} source="ZILLOW" title="Zillow Premier Agent" triggerLabel="Zillow Premier Agent → New Lead" />}
        {modal === 'realtor' && <ZapierModal open onClose={() => setModal(null)} source="REALTOR_COM" title="Realtor.com" triggerLabel="Realtor.com → New Lead Inquiry" />}
        {modal === 'website' && <WebsiteModal open onClose={() => setModal(null)} />}
      </AnimatePresence>

      <div style={{ maxWidth: 860 }}>
        <div style={{ marginBottom: 28 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Connections</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 6px', fontWeight: 400, letterSpacing: '-0.02em' }}>Integrations</h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Connect your lead sources, CRM, calendar, and phone number.</p>
        </div>

        {/* SECTION 1 — Lead Sources */}
        <SectionHeader title="Lead Sources" description="Where your leads come from. Each source routes into the AI response pipeline automatically." />
        <div className="int-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>

          {/* Zillow */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <IntCard icon="building" title="Zillow Premier Agent" accent="var(--accent)" connected={false} description="Route Zillow leads directly into ConversionOps via Zapier.">
              <button onClick={() => setModal('zillow')} className="btn-ghost" style={{ fontSize: 12, height: 34 }}>
                How to connect
                <Icon name="arrow-right" size={11} stroke={2} />
              </button>
            </IntCard>
          </motion.div>

          {/* Realtor.com */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <IntCard icon="building" title="Realtor.com" accent="var(--blue)" connected={false} description="Route Realtor.com leads into ConversionOps via Zapier.">
              <button onClick={() => setModal('realtor')} className="btn-ghost" style={{ fontSize: 12, height: 34 }}>
                How to connect
                <Icon name="arrow-right" size={11} stroke={2} />
              </button>
            </IntCard>
          </motion.div>

          {/* Personal Website */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <IntCard icon="globe" title="Personal Website" accent="var(--purple)" connected={false} description="Capture contact form leads from your website with a JavaScript snippet.">
              <button onClick={() => setModal('website')} className="btn-ghost" style={{ fontSize: 12, height: 34 }}>
                Get snippet
                <Icon name="arrow-right" size={11} stroke={2} />
              </button>
            </IntCard>
          </motion.div>

          {/* Missed Calls */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <IntCard icon="phone" title="Missed Call Text-Back" accent={hasPhone ? 'var(--green)' : 'var(--amber)'} connected={hasPhone} description="When someone calls and you miss it, AI texts them back within 8 seconds.">
              {hasPhone ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon name="phone" size={12} stroke={1.8} style={{ color: 'var(--green)' }} />
                  <span style={{ fontSize: 12, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>{workspace?.twilioNumber}</span>
                </div>
              ) : (
                <Link href="/settings/phone" className="btn-ghost" style={{ fontSize: 12, height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  Configure phone
                  <Icon name="arrow-right" size={11} stroke={2} />
                </Link>
              )}
            </IntCard>
          </motion.div>
        </div>

        {/* SECTION 2 — CRM Sync */}
        <SectionHeader title="CRM Sync" description="Push qualified leads and transcripts to your CRM automatically." />
        <div className="int-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12, marginBottom: 32 }}>

          {/* Follow Up Boss */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <IntCard icon="sync" title="Follow Up Boss" accent="var(--blue)" connected={hasFub} description="Sync qualified leads and conversation transcripts automatically.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Input
                  label="FUB API Key"
                  type="password"
                  value={fubKey}
                  onChange={e => setFubKey(e.target.value)}
                  placeholder={hasFub ? '••••••••' : 'fub_live_…'}
                />
                <button onClick={saveFub} disabled={savingFub || !fubKey.trim()} className="btn-primary" style={{ fontSize: 12, height: 34, alignSelf: 'flex-start' }}>
                  {savingFub ? <Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                  {savingFub ? 'Saving…' : 'Save'}
                </button>
                <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>Find your API key in Follow Up Boss → Admin → API</p>
              </div>
            </IntCard>
          </motion.div>

          {/* Zapier Universal */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <IntCard icon="bolt" title="Zapier (Universal)" accent="var(--amber)" connected={false} description="Works with kvCORE, BoomTown, Sierra Interactive, and any CRM with Zapier.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <UrlDisplay url={WEBHOOK_URL} />
                <p style={{ fontSize: 11, color: 'var(--text-4)', margin: 0 }}>Use this URL as the webhook destination in any Zapier workflow.</p>
              </div>
            </IntCard>
          </motion.div>
        </div>

        {/* SECTION 3 — Calendar */}
        <SectionHeader title="Calendar" description="Let leads book appointments directly after qualifying." />
        <div style={{ marginBottom: 32 }}>
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <IntCard icon="calendar" title="Cal.com Booking" accent="var(--purple)" connected={hasCal} description="The AI sends your Cal.com link when a lead is ready to schedule.">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Input
                  label="Your Cal.com username"
                  value={calUsername || (workspace?.aiConfig.calComUsername ?? '')}
                  onChange={e => setCalUsername(e.target.value)}
                  placeholder="john-smith"
                  hint="e.g. john-smith → cal.com/john-smith"
                />
                {(calUsername || workspace?.aiConfig.calComUsername) && (
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                    AI will send: https://cal.com/{calUsername || workspace?.aiConfig.calComUsername}
                  </p>
                )}
                <button onClick={saveCal} disabled={savingCal || !(calUsername.trim() || workspace?.aiConfig.calComUsername)} className="btn-primary" style={{ fontSize: 12, height: 34, alignSelf: 'flex-start' }}>
                  {savingCal ? <Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                  {savingCal ? 'Saving…' : 'Save'}
                </button>
              </div>
            </IntCard>
          </motion.div>
        </div>

        {/* SECTION 4 — Phone Number */}
        <SectionHeader title="Phone Number" description="Your Twilio number for SMS lead response and missed call text-back." />
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <IntCard icon="phone" title="Twilio Phone Number" accent={hasPhone ? 'var(--green)' : 'var(--text-3)'} connected={hasPhone} description="Outbound SMS and missed call text-back require a Twilio number.">
            {hasPhone ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 13, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>{workspace?.twilioNumber}</span>
                <Link href="/settings/phone" style={{ fontSize: 11, color: 'var(--text-3)', textDecoration: 'none' }}>Configure →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12, color: 'var(--text-4)' }}>No phone number configured</span>
                <Link href="/settings/phone" className="btn-ghost" style={{ fontSize: 12, height: 32, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
                  Configure phone number
                  <Icon name="arrow-right" size={11} stroke={2} />
                </Link>
              </div>
            )}
          </IntCard>
        </motion.div>
      </div>

      <style>{`
        @media (max-width: 768px) { .int-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </>
  );
}
