'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';

interface Workspace { twilioNumber: string | null; }

const SMS_URL = 'https://api.conversionops.in/v1/webhooks/twilio/sms';
const VOICE_URL = 'https://api.conversionops.in/v1/webhooks/twilio/voice';
const E164_RE = /^\+[1-9]\d{10,14}$/;

function CopyBlock({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
      <code style={{ flex: 1, fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", overflowX: 'auto', whiteSpace: 'nowrap' }}>
        {url}
      </code>
      <button
        onClick={() => { void navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
        style={{ width: 28, height: 28, borderRadius: 6, background: 'transparent', border: '1px solid var(--border)', color: copied ? 'var(--green)' : 'var(--text-3)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all 0.15s' }}
      >
        <Icon name={copied ? 'check' : 'copy'} size={11} stroke={1.8} />
      </button>
    </div>
  );
}

export default function PhoneSettingsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspace, refetch } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });

  const [number, setNumber] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (workspace?.twilioNumber) setNumber(workspace.twilioNumber);
  }, [workspace]);

  const save = async () => {
    setError('');
    if (!E164_RE.test(number)) {
      setError('Must be E.164 format, e.g. +19125550550');
      return;
    }
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me', { twilioNumber: number });
      await Promise.all([refetch(), queryClient.invalidateQueries({ queryKey: ['workspace'] })]);
      addToast('Phone number saved', 'success');
      setSaved(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save phone number';
      addToast(msg, 'error');
    } finally { setSaving(false); }
  };

  const hasNumber = !!(workspace?.twilioNumber);

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · Phone</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Phone number
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
            Your Twilio number handles outbound SMS and missed call text-back.
          </p>
        </div>

        {/* Current number */}
        {hasNumber && (
          <div
            style={{
              marginBottom: 16,
              padding: '14px 18px',
              borderRadius: 12,
              background: 'rgba(71,255,142,0.06)',
              border: '1px solid rgba(71,255,142,0.20)',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 8px var(--green)', flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)' }}>Active</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>{workspace?.twilioNumber}</div>
            </div>
          </div>
        )}

        {/* Add / update number */}
        <div className="surface-card" style={{ padding: 22, marginBottom: 16 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>
            {hasNumber ? 'Update phone number' : 'Add phone number'}
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '0 0 16px' }}>
            Enter your Twilio phone number in E.164 format.
          </p>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input
                label="Phone number"
                value={number}
                onChange={e => { setNumber(e.target.value); setError(''); }}
                placeholder="+19125550550"
                error={error}
                hint="E.164 format: +1 followed by 10 digits"
              />
            </div>
            <button
              onClick={save}
              disabled={saving || !number.trim()}
              className="btn-primary"
              style={{ height: 38, padding: '0 20px', fontSize: 13, flexShrink: 0, marginBottom: error ? 22 : 0 }}
            >
              {saving ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>

        {/* Configuration instructions — shown after saving or if number already exists */}
        {(saved || hasNumber) && (
          <div className="surface-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Icon name="settings" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Configure your Twilio number</h2>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                { n: 1, text: 'Go to console.twilio.com' },
                { n: 2, text: 'Phone Numbers → Manage → Active Numbers → click your number' },
                { n: 3, text: 'Messaging Configuration → Webhook URL:', url: SMS_URL },
                { n: 4, text: 'Method: HTTP POST' },
                { n: 5, text: 'Voice Configuration → Webhook URL:', url: VOICE_URL },
                { n: 6, text: 'Click Save' },
              ].map(step => (
                <div key={step.n} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                  <span style={{
                    width: 22, height: 22, borderRadius: '50%', background: 'var(--accent-dim)',
                    border: '1px solid var(--border-focus)', color: 'var(--accent)',
                    fontSize: 10, fontWeight: 700, display: 'inline-flex', alignItems: 'center',
                    justifyContent: 'center', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace", marginTop: 1,
                  }}>{step.n}</span>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 8px', lineHeight: 1.5 }}>{step.text}</p>
                    {'url' in step && step.url && <CopyBlock url={step.url} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
