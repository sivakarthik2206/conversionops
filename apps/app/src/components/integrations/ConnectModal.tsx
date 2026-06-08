'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/Icon';

interface Props {
  provider: string;
  name: string;
  workspaceId: string;
  onClose: () => void;
  onSuccess: () => void;
  onConnect: (provider: string, data: Record<string, string>) => Promise<{ success: boolean; error?: string }>;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button onClick={() => { void navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      style={{ padding: '4px 10px', borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--green)' : 'var(--text-3)', fontSize: 11, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <Icon name={copied ? 'check' : 'copy'} size={11} stroke={2} />
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 12 }}>
      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
        {n}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {children}
      </div>
    </div>
  );
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: '12px 14px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13, color: 'var(--text-3)', lineHeight: 1.6 }}>{children}</div>;
}

function UrlRow({ label, url }: { label: string; url: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <span style={{ fontSize: 12, color: 'var(--text-4)', minWidth: 80 }}>{label}</span>
      <code style={{ flex: 1, fontSize: 11, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{url}</code>
      <CopyButton text={url} />
    </div>
  );
}

const WEBHOOK_URL = 'https://api.conversionops.in/v1/webhooks/lead';

export function ConnectModal({ provider, name, workspaceId, onClose, onSuccess, onConnect }: Props) {
  const [data, setData] = useState<Record<string, string>>({});
  const [showPw, setShowPw] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (key: string, val: string) => setData(d => ({ ...d, [key]: val }));
  const togglePw = (key: string) => setShowPw(s => ({ ...s, [key]: !s[key] }));

  const submit = async () => {
    setError('');
    setLoading(true);
    try {
      const isMarkOnlyProvider = provider === 'zillow' || provider === 'realtor_com' || provider === 'website';
      const payload = isMarkOnlyProvider ? { ...data, configured: 'true' } : data;
      const result = await onConnect(provider, payload);
      if (result.success) { onSuccess(); }
      else { setError(result.error ?? 'Connection failed. Check your credentials and try again.'); }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const INPUT_STYLE: React.CSSProperties = {
    width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8,
    padding: '11px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box',
  };

  function Field({ label, fieldKey, placeholder, type = 'text' }: { label: string; fieldKey: string; placeholder?: string; type?: string }) {
    const isPassword = type === 'password';
    const visible = showPw[fieldKey];
    return (
      <div>
        <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 7 }}>{label}</label>
        <div style={{ position: 'relative' }}>
          <input type={isPassword && !visible ? 'password' : 'text'} value={data[fieldKey] ?? ''} onChange={e => set(fieldKey, e.target.value)} placeholder={placeholder}
            style={{ ...INPUT_STYLE, paddingRight: isPassword ? 44 : 14 }} />
          {isPassword && (
            <button type="button" onClick={() => togglePw(fieldKey)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-4)', display: 'flex', padding: 4 }}>
              <Icon name={visible ? 'eye-off' : 'eye'} size={15} stroke={1.6} />
            </button>
          )}
        </div>
      </div>
    );
  }

  function renderForm() {
    switch (provider) {
      case 'twilio':
        return (
          <>
            <Field label="Account SID" fieldKey="accountSid" placeholder="AC..." />
            <Field label="Auth Token" fieldKey="authToken" placeholder="••••••••" type="password" />
            <Field label="Phone Number" fieldKey="phoneNumber" placeholder="+1..." />
            <InfoBox>
              <strong style={{ color: 'var(--text-2)' }}>After connecting, add these URLs to your Twilio console:</strong>
              <UrlRow label="SMS webhook" url="https://api.conversionops.in/v1/webhooks/twilio/sms" />
              <UrlRow label="Voice webhook" url="https://api.conversionops.in/v1/webhooks/twilio/voice" />
              <div style={{ marginTop: 10 }}>
                <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none' }}>
                  How to find your Twilio credentials →
                </a>
              </div>
            </InfoBox>
          </>
        );

      case 'follow_up_boss':
        return (
          <>
            <Field label="API Key" fieldKey="apiKey" placeholder="••••••••" type="password" />
            <InfoBox>
              <strong style={{ color: 'var(--text-2)' }}>Where to find your API key:</strong><br />
              Follow Up Boss → Admin → API → API Key<br />
              <a href="https://app.followupboss.com/2/api" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
                Open Follow Up Boss →
              </a>
            </InfoBox>
          </>
        );

      case 'calcom':
        return (
          <>
            <Field label="Cal.com username" fieldKey="username" placeholder="your-name" />
            <Field label="API Key" fieldKey="apiKey" placeholder="••••••••" type="password" />
            {data['username'] && (
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                Your booking link will be:{' '}
                <span style={{ color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                  cal.com/{data['username']}
                </span>
              </p>
            )}
            <InfoBox>
              <strong style={{ color: 'var(--text-2)' }}>Where to find your API key:</strong><br />
              Cal.com → Settings → Developer → API Keys → New Key<br />
              <a href="https://app.cal.com/settings/developer/api-keys" target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: 'var(--accent)', textDecoration: 'none', marginTop: 6, display: 'inline-block' }}>
                Open Cal.com →
              </a>
            </InfoBox>
          </>
        );

      case 'zapier':
        return (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              Use Zapier to connect any CRM — kvCORE, BoomTown, Sierra, HubSpot, Salesforce, and 5,000+ other apps.
            </p>
            <Field label="Zapier Webhook URL" fieldKey="webhookUrl" placeholder="https://hooks.zapier.com/..." />
            <InfoBox>
              <strong style={{ color: 'var(--text-2)' }}>How to get your webhook URL:</strong>
              <ol style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
                <li>In Zapier → Create Zap</li>
                <li>Trigger: "Webhooks by Zapier → Catch Hook"</li>
                <li>Copy the webhook URL Zapier gives you</li>
                <li>Paste it above and click Connect</li>
              </ol>
            </InfoBox>
          </>
        );

      case 'zillow':
      case 'realtor_com': {
        const source = provider === 'zillow' ? 'zillow' : 'realtor_com';
        const triggerApp = provider === 'zillow' ? 'Zillow Premier Agent' : 'Realtor.com';
        const triggerEvent = provider === 'zillow' ? 'New Lead' : 'New Lead Inquiry';
        const workspaceWebhookUrl = `${WEBHOOK_URL}?workspaceId=${workspaceId}&source=${source}`;
        return (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              No API key needed — connect {triggerApp} leads through Zapier in about 5 minutes.
            </p>

            <Step n={1} title="Create your Zapier account">
              <a href="https://zapier.com" target="_blank" rel="noopener noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', fontSize: 13, fontWeight: 600, textDecoration: 'none', marginTop: 4 }}>
                Open Zapier <Icon name="arrow-right" size={13} stroke={2.5} />
              </a>
            </Step>

            <Step n={2} title="Create a new Zap">
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 6px' }}>
                In Zapier, click <strong style={{ color: 'var(--text-2)' }}>Create Zap</strong>. Set the trigger to:
              </p>
              <InfoBox>
                <strong style={{ color: 'var(--text-2)' }}>{triggerApp}</strong> → <strong style={{ color: 'var(--text-2)' }}>{triggerEvent}</strong>
              </InfoBox>
            </Step>

            <Step n={3} title="Set the action">
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 6px' }}>Add an action step:</p>
              <InfoBox>
                <strong style={{ color: 'var(--text-2)' }}>Webhooks by Zapier</strong> → <strong style={{ color: 'var(--text-2)' }}>POST</strong>
                <UrlRow label="URL" url={workspaceWebhookUrl} />
                <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-4)' }}>Payload Type: <strong style={{ color: 'var(--text-3)' }}>JSON</strong></div>
              </InfoBox>
            </Step>

            <Step n={4} title="Test and activate">
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>
                Turn on your Zap and send a test lead. Then click <strong style={{ color: 'var(--text-2)' }}>Mark as connected</strong> below.
              </p>
            </Step>
          </>
        );
      }

      case 'website': {
        const snippet = `<script>(function(w,d,s,l,i){w[l]=w[l]||[];var f=d.getElementsByTagName(s)[0],j=d.createElement(s);j.async=true;j.src='https://app.conversionops.in/widget.js?id='+i;f.parentNode.insertBefore(j,f);})(window,document,'script','_co','${workspaceId}');</script>`;
        return (
          <>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
              Add this snippet to your website's <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>&lt;head&gt;</code> tag to capture leads from any contact form.
            </p>
            <div style={{ position: 'relative' }}>
              <div style={{ padding: '14px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)', lineHeight: 1.6, wordBreak: 'break-all' }}>
                {snippet}
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8 }}>
                <CopyButton text={snippet} />
              </div>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>After installing, click "Mark as installed" below.</p>
          </>
        );
      }

      default:
        return <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No configuration required.</p>;
    }
  }

  const isMarkOnly = ['zillow', 'realtor_com', 'website'].includes(provider);
  const ctaLabel = isMarkOnly
    ? (provider === 'website' ? 'Mark as installed' : 'Mark as connected')
    : loading ? 'Connecting...' : 'Connect';

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{ width: '100%', maxWidth: 480, background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 16, boxShadow: 'var(--shadow-xl)', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Connect {name}</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', display: 'flex', padding: 4 }}>
              <Icon name="x" size={18} stroke={2} />
            </button>
          </div>

          {/* Form */}
          <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '65vh', overflowY: 'auto' }}>
            {renderForm()}
            {error && (
              <div style={{ padding: '10px 14px', background: 'rgba(255,71,71,0.08)', border: '1px solid rgba(255,71,71,0.25)', borderRadius: 8, fontSize: 13, color: 'var(--red)' }}>
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 13, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submit} disabled={loading} style={{ padding: '9px 24px', borderRadius: 9, background: 'var(--accent)', color: '#000', border: 'none', fontSize: 13, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.8 : 1 }}>
              {ctaLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
