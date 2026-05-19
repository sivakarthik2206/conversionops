'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Card, PageHeader, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and business-like. Best for commercial real estate.' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm and approachable. Great for residential buyers.' },
  { id: 'conversational', label: 'Conversational', desc: 'Casual and natural. Works well for SMS leads.' },
];

interface AiConfig { agentName?: string; tone?: string; customInstructions?: string; }
interface Workspace { aiConfig: AiConfig; name: string; }

export default function AiSettingsPage() {
  const { addToast } = useToast();
  const { data: workspace } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [agentName, setAgentName] = useState('');
  const [tone, setTone] = useState('professional');
  const [customInstructions, setCustomInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.aiConfig) {
      setAgentName(workspace.aiConfig.agentName ?? 'Alex');
      setTone(workspace.aiConfig.tone ?? 'professional');
      setCustomInstructions(workspace.aiConfig.customInstructions ?? '');
    }
  }, [workspace]);

  const previewMessage = `Hi! I'm ${agentName || 'Alex'} with ${workspace?.name ?? 'our team'}. I saw you were interested in a property — are you looking to buy or sell? I can help right now!`;

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me/ai-config', { agentName, tone, customInstructions });
      addToast('AI configuration saved', 'success');
    } catch {
      addToast('Failed to save', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[640px]">
      <PageHeader title="AI Configuration" subtitle="Personalise how your AI agent communicates" />

      <div className="flex flex-col gap-6">
        <Card>
          <Input label="Agent Name" value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Alex" hint="The name your AI uses when signing messages" />
        </Card>

        <Card>
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>Tone</p>
          <div className="grid grid-cols-3 gap-3">
            {TONES.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)}
                className="p-4 rounded-[10px] border text-left transition-colors"
                style={{
                  background: tone === t.id ? 'var(--accent-dim)' : 'var(--bg-3)',
                  borderColor: tone === t.id ? 'var(--accent)' : 'var(--border)',
                }}>
                <p className="text-sm font-semibold mb-1" style={{ color: tone === t.id ? 'var(--accent)' : 'var(--text)' }}>{t.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <div>
            <p className="text-[11px] uppercase tracking-widest font-medium mb-1" style={{ color: 'var(--text-3)' }}>Custom Instructions</p>
            <textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value.slice(0, 500))}
              placeholder="Add any specific instructions for your AI agent…"
              rows={4}
              className="w-full px-3 py-2 text-sm rounded-lg resize-none focus:outline-none focus:ring-1"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', caretColor: 'var(--accent)' }} />
            <p className="text-[11px] mt-1 text-right" style={{ color: 'var(--text-3)' }}>{customInstructions.length}/500</p>
          </div>
        </Card>

        {/* Live Preview */}
        <Card>
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>Live Preview</p>
          <div className="rounded-lg p-4" style={{ background: 'var(--bg-3)' }}>
            <div className="inline-block px-4 py-2.5 rounded-[10px] text-sm" style={{ background: 'var(--bg-4)', borderLeft: '2px solid var(--purple)', color: 'var(--text)' }}>
              {previewMessage}
            </div>
          </div>
        </Card>

        <Button loading={saving} onClick={save} className="self-start">Save Configuration</Button>
      </div>
    </div>
  );
}
