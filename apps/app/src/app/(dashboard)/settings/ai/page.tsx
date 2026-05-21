'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';

const TONES = [
  { id: 'professional',  label: 'Professional',   desc: 'Formal, business-like. Best for commercial real estate.', icon: 'building' as const, color: 'var(--blue)' },
  { id: 'friendly',      label: 'Friendly',       desc: 'Warm, approachable. Great for residential buyers.',       icon: 'star' as const,     color: 'var(--accent)' },
  { id: 'conversational',label: 'Conversational', desc: 'Casual, natural. Works well for SMS leads.',              icon: 'message' as const,  color: 'var(--purple)' },
];

interface AiConfig { agentName?: string; tone?: string; customInstructions?: string; }
interface Workspace { aiConfig: AiConfig; name: string; }

export default function AiSettingsPage() {
  const { addToast } = useToast();
  const { data: workspace } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [agentName, setAgentName] = useState('Alex');
  const [tone, setTone] = useState('friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (workspace?.aiConfig) {
      setAgentName(workspace.aiConfig.agentName ?? 'Alex');
      setTone(workspace.aiConfig.tone ?? 'friendly');
      setCustomInstructions(workspace.aiConfig.customInstructions ?? '');
    }
  }, [workspace]);

  const previewMessage = `Hi! I'm ${agentName || 'Alex'} with ${workspace?.name ?? 'our team'}. I saw you were interested in a property — are you looking to buy or sell? I can help right now!`;

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me/ai-config', { agentName, tone, customInstructions });
      addToast('AI configuration saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · AI</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            AI configuration
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
            Calibrate how your AI agent speaks, what it asks, and when it escalates.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Agent name */}
          <div className="surface-card" style={{ padding: 22 }}>
            <Input
              label="Agent name"
              value={agentName}
              onChange={e => setAgentName(e.target.value)}
              placeholder="Alex"
              hint="The name your AI uses when signing messages."
            />
          </div>

          {/* Tone */}
          <div className="surface-card" style={{ padding: 22 }}>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Tone</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>How the AI sounds when it writes.</p>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {TONES.map(t => {
                const active = tone === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setTone(t.id)}
                    style={{
                      padding: 16,
                      borderRadius: 12,
                      background: active ? `${t.color}10` : 'var(--bg-3)',
                      border: '1px solid',
                      borderColor: active ? t.color : 'var(--border)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      transition: 'all 0.25s',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 8,
                        background: `${t.color}1a`,
                        border: `1px solid ${t.color}33`,
                        color: t.color,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 10,
                      }}
                    >
                      <Icon name={t.icon} size={13} stroke={1.8} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: active ? t.color : 'var(--text)', marginBottom: 4 }}>
                      {t.label}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', lineHeight: 1.5 }}>
                      {t.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom instructions */}
          <div className="surface-card" style={{ padding: 22 }}>
            <div style={{ marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Custom instructions</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>Free-form guidance the AI applies to every conversation.</p>
            </div>
            <textarea
              value={customInstructions}
              onChange={e => setCustomInstructions(e.target.value.slice(0, 500))}
              placeholder="e.g. Always mention our Coral Gables specialist for high-end inquiries."
              rows={4}
              style={{
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                fontFamily: 'inherit',
                lineHeight: 1.55,
                borderRadius: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                resize: 'none',
                outline: 'none',
                caretColor: 'var(--accent)',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
            <div
              style={{
                marginTop: 6,
                fontSize: 10,
                color: customInstructions.length > 450 ? 'var(--amber)' : 'var(--text-4)',
                textAlign: 'right',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {customInstructions.length}/500
            </div>
          </div>

          {/* Live preview */}
          <div className="surface-card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: -40,
                right: -40,
                width: 160,
                height: 160,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(179,155,255,0.10), transparent 70%)',
                filter: 'blur(20px)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, position: 'relative' }}>
              <Icon name="sparkle" size={13} stroke={1.8} style={{ color: 'var(--purple)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Live preview</h3>
            </div>
            <div
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: 14,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, var(--purple), #8b6fff)',
                    color: '#fff',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="bot" size={13} stroke={1.8} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{agentName || 'Alex'}</div>
                  <div className="eyebrow" style={{ color: 'var(--purple)', marginTop: 1, fontSize: 9 }}>AI · {tone}</div>
                </div>
              </div>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '12px 12px 12px 4px',
                  background: 'var(--bg-4)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  color: 'var(--text)',
                  lineHeight: 1.55,
                }}
              >
                {previewMessage}
              </div>
            </div>
          </div>

          <div style={{ paddingTop: 6 }}>
            <button onClick={save} disabled={saving} className="btn-primary">
              {saving ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
              {saving ? 'Saving…' : 'Save configuration'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
