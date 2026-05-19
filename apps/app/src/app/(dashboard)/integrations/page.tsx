'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, Copy, ExternalLink } from 'lucide-react';
import { Button, Input, Card, PageHeader, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

interface Workspace {
  id: string; name: string;
  aiConfig: { followUpBossApiKey?: string; zapierWebhookUrl?: string; calComApiKey?: string; calComEventTypeId?: number };
}

interface CalEventType { id: number; title: string; }

export default function IntegrationsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const { data: workspace } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [fubKey, setFubKey] = useState('');
  const [calKey, setCalKey] = useState('');
  const [calEventTypeId, setCalEventTypeId] = useState<number | null>(null);
  const [calEventTypes, setCalEventTypes] = useState<CalEventType[]>([]);
  const [testingFub, setTestingFub] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (workspace) {
      setFubKey(workspace.aiConfig.followUpBossApiKey ? '••••' + workspace.aiConfig.followUpBossApiKey.slice(-4) : '');
      setCalKey(workspace.aiConfig.calComApiKey ? '••••' + workspace.aiConfig.calComApiKey.slice(-4) : '');
      setCalEventTypeId(workspace.aiConfig.calComEventTypeId ?? null);
    }
  }, [workspace]);

  const testFub = async () => {
    setTestingFub(true);
    try { await apiClient.post('/workspaces/me/integrations/fub/test', {}); addToast('Follow Up Boss connected!', 'success'); }
    catch { addToast('Connection failed — check your API key', 'error'); }
    finally { setTestingFub(false); }
  };

  const saveIntegrations = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me/ai-config', {
        ...(fubKey && !fubKey.startsWith('••••') && { followUpBossApiKey: fubKey }),
        ...(calKey && !calKey.startsWith('••••') && { calComApiKey: calKey }),
        ...(calEventTypeId && { calComEventTypeId: calEventTypeId }),
      });
      await queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Integrations saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const copyZapierUrl = () => {
    const url = `${process.env['NEXT_PUBLIC_API_URL'] ?? 'https://api.conversionops.io/v1'}/webhooks/lead`;
    void navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasFub = !!workspace?.aiConfig.followUpBossApiKey;
  const hasCal = !!workspace?.aiConfig.calComApiKey;

  return (
    <div className="max-w-[720px]">
      <PageHeader title="Integrations" subtitle="Connect your CRM and booking tools" />
      <div className="flex flex-col gap-6">
        {/* Follow Up Boss */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Follow Up Boss</h2>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Automatically sync qualified leads and conversation transcripts.</p>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wide ${hasFub ? 'text-[var(--green)]' : 'text-[var(--text-3)]'}`} style={{ background: hasFub ? 'var(--green-dim)' : 'var(--bg-4)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasFub ? 'var(--green)' : 'var(--text-4)' }} />
              {hasFub ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <Input label="API Key" type="password" value={fubKey} onChange={e => setFubKey(e.target.value)} placeholder="fub_live_..." />
            </div>
            <div className="pt-6">
              <Button variant="secondary" size="sm" onClick={testFub} loading={testingFub}>Test</Button>
            </div>
          </div>
        </Card>

        {/* Zapier */}
        <Card>
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Zapier Universal Webhook</h2>
          <p className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>Add this webhook URL to your Zap to receive lead data from ConversionOps.</p>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            <code className="text-xs flex-1 truncate" style={{ color: 'var(--text-2)' }}>
              {process.env['NEXT_PUBLIC_API_URL'] ?? 'https://api.conversionops.io/v1'}/webhooks/lead
            </code>
            <button onClick={copyZapierUrl} className="shrink-0 p-1 rounded hover:bg-[var(--bg-4)] transition-colors" style={{ color: copied ? 'var(--green)' : 'var(--text-3)' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
          </div>
        </Card>

        {/* Cal.com */}
        <Card>
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--text)' }}>Cal.com</h2>
              <p className="text-sm" style={{ color: 'var(--text-2)' }}>Let leads book directly into your calendar after qualification.</p>
            </div>
            <span className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full uppercase tracking-wide ${hasCal ? 'text-[var(--green)]' : 'text-[var(--text-3)]'}`} style={{ background: hasCal ? 'var(--green-dim)' : 'var(--bg-4)' }}>
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: hasCal ? 'var(--green)' : 'var(--text-4)' }} />
              {hasCal ? 'Connected' : 'Not connected'}
            </span>
          </div>
          <div className="flex flex-col gap-3">
            <Input label="Cal.com API Key" type="password" value={calKey} onChange={e => setCalKey(e.target.value)} placeholder="cal_live_..." />
            {calEventTypes.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>Event Type</label>
                <select value={calEventTypeId ?? ''} onChange={e => setCalEventTypeId(parseInt(e.target.value, 10) || null)}
                  className="h-9 px-3 text-sm rounded-lg focus:outline-none"
                  style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                  <option value="">Select event type</option>
                  {calEventTypes.map(et => <option key={et.id} value={et.id}>{et.title}</option>)}
                </select>
              </div>
            )}
            <a href="https://cal.com/settings/developer/api-keys" target="_blank" rel="noreferrer" className="text-xs flex items-center gap-1 w-fit hover:underline" style={{ color: 'var(--text-3)' }}>
              Get your Cal.com API key <ExternalLink size={11} />
            </a>
          </div>
        </Card>

        <Button loading={saving} onClick={saveIntegrations} className="self-start">Save Integrations</Button>
      </div>
    </div>
  );
}
