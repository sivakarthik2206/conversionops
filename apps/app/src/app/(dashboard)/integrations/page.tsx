'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button, Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface Workspace {
  id: string;
  name: string;
  aiConfig: {
    followUpBossApiKey?: string;
    zapierWebhookUrl?: string;
    calComApiKey?: string;
    calComEventTypeId?: number;
  };
}

interface CalEventType { id: number; title: string; }

export default function IntegrationsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspace } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [fubKey, setFubKey] = useState('');
  const [calKey, setCalKey] = useState('');
  const [calEventTypeId, setCalEventTypeId] = useState<number | null>(null);
  const [calEventTypes] = useState<CalEventType[]>([]);
  const [testingFub, setTestingFub] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (workspace) {
      setFubKey(workspace.aiConfig.followUpBossApiKey ? '****' + workspace.aiConfig.followUpBossApiKey.slice(-4) : '');
      setCalKey(workspace.aiConfig.calComApiKey ? '****' + workspace.aiConfig.calComApiKey.slice(-4) : '');
      setCalEventTypeId(workspace.aiConfig.calComEventTypeId ?? null);
    }
  }, [workspace]);

  const testFub = async () => {
    setTestingFub(true);
    try { await apiClient.post('/workspaces/me/integrations/fub/test', {}); addToast('Follow Up Boss connected', 'success'); }
    catch { addToast('Connection failed — check your API key', 'error'); }
    finally { setTestingFub(false); }
  };

  const saveIntegrations = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me/ai-config', {
        ...(fubKey && !fubKey.startsWith('****') && { followUpBossApiKey: fubKey }),
        ...(calKey && !calKey.startsWith('****') && { calComApiKey: calKey }),
        ...(calEventTypeId && { calComEventTypeId: calEventTypeId }),
      });
      await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Integrations saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const zapierUrl = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1'}/webhooks/lead`;

  const copyZapierUrl = () => {
    void navigator.clipboard.writeText(zapierUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasFub = !!workspace?.aiConfig.followUpBossApiKey;
  const hasCal = !!workspace?.aiConfig.calComApiKey;

  return (
    <div style={{ maxWidth: 760 }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Connections</p>
        <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 6px', fontWeight: 400, letterSpacing: '-0.02em' }}>
          Integrations
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          Connect your CRM, calendar, and webhook tools.
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Follow Up Boss */}
        <IntegrationCard
          name="Follow Up Boss"
          icon="sync"
          accent="var(--blue)"
          connected={hasFub}
          description="Automatically sync qualified leads and conversation transcripts."
        >
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}>
              <Input label="API key" type="password" value={fubKey} onChange={e => setFubKey(e.target.value)} placeholder="fub_live_…" />
            </div>
            <Button variant="secondary" size="sm" onClick={testFub} loading={testingFub} style={{ height: 38, alignSelf: 'flex-end' }}>
              Test
            </Button>
          </div>
        </IntegrationCard>

        {/* Zapier */}
        <IntegrationCard
          name="Zapier · Universal webhook"
          icon="bolt"
          accent="var(--amber)"
          connected={false}
          description="Add this webhook URL to your Zap to receive lead data from ConversionOps."
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 14px',
              borderRadius: 10,
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
            }}
          >
            <code
              style={{
                flex: 1,
                fontSize: 12,
                color: 'var(--text-2)',
                fontFamily: "'JetBrains Mono', monospace",
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {zapierUrl}
            </code>
            <button
              onClick={copyZapierUrl}
              style={{
                width: 30,
                height: 30,
                borderRadius: 7,
                background: 'transparent',
                border: '1px solid var(--border)',
                color: copied ? 'var(--green)' : 'var(--text-3)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { if (!copied) e.currentTarget.style.borderColor = 'var(--border-light)'; }}
              onMouseLeave={e => { if (!copied) e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              <Icon name={copied ? 'check' : 'copy'} size={13} stroke={1.8} />
            </button>
          </div>
        </IntegrationCard>

        {/* Cal.com */}
        <IntegrationCard
          name="Cal.com"
          icon="calendar"
          accent="var(--purple)"
          connected={hasCal}
          description="Let leads book directly into your calendar after qualification."
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Input label="Cal.com API key" type="password" value={calKey} onChange={e => setCalKey(e.target.value)} placeholder="cal_live_…" />
            {calEventTypes.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Event type</label>
                <select
                  value={calEventTypeId ?? ''}
                  onChange={e => setCalEventTypeId(parseInt(e.target.value, 10) || null)}
                  style={{
                    height: 38,
                    padding: '0 12px',
                    fontSize: 13,
                    borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text)',
                    outline: 'none',
                  }}
                >
                  <option value="">Select event type</option>
                  {calEventTypes.map(et => <option key={et.id} value={et.id}>{et.title}</option>)}
                </select>
              </div>
            )}
            <a
              href="https://cal.com/settings/developer/api-keys"
              target="_blank"
              rel="noreferrer"
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                width: 'fit-content',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
              onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
            >
              Get your Cal.com API key
              <Icon name="external" size={10} stroke={1.8} />
            </a>
          </div>
        </IntegrationCard>

        <div style={{ paddingTop: 8 }}>
          <button onClick={saveIntegrations} disabled={saving} className="btn-primary">
            {saving ? (
              <>
                <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                Saving…
              </>
            ) : (
              <>Save integrations</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function IntegrationCard({
  name, icon, accent, connected, description, children,
}: {
  name: string;
  icon: Parameters<typeof Icon>[0]['name'];
  accent: string;
  connected: boolean;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="surface-card"
      style={{ padding: 22, position: 'relative', overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -50,
          right: -50,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${accent}14, transparent 70%)`,
          filter: 'blur(25px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', minWidth: 0 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: `${accent}14`,
              border: `1px solid ${accent}33`,
              color: accent,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name={icon} size={16} stroke={1.8} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
              {name}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.5 }}>
              {description}
            </p>
          </div>
        </div>

        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 100,
            background: connected ? 'rgba(77,255,165,0.10)' : 'var(--bg-4)',
            border: '1px solid',
            borderColor: connected ? 'rgba(77,255,165,0.25)' : 'var(--border)',
            color: connected ? 'var(--green)' : 'var(--text-3)',
            fontSize: 10,
            fontWeight: 700,
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            flexShrink: 0,
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: connected ? 'var(--green)' : 'var(--text-4)',
              boxShadow: connected ? '0 0 4px var(--green)' : 'none',
            }}
          />
          {connected ? 'Connected' : 'Not connected'}
        </span>
      </div>

      <div style={{ position: 'relative' }}>{children}</div>
    </div>
  );
}
