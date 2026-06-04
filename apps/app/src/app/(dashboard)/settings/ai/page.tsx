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

interface AiConfig {
  agentName?: string;
  tone?: string;
  customInstructions?: string;
  replyImmediately?: boolean;
  greetingTemplate?: string;
}
interface Workspace { aiConfig: AiConfig; name: string; aiPaused?: boolean; }

const DEFAULT_GREETING = "Hi {leadName}! I'm {agentName}, {agentFirstName}'s assistant. I saw you were interested in {area} — are you looking to buy, sell, or both?";

export default function AiSettingsPage() {
  const { addToast } = useToast();
  const { data: workspace, refetch } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [agentName, setAgentName] = useState('Alex');
  const [tone, setTone] = useState('friendly');
  const [customInstructions, setCustomInstructions] = useState('');
  const [replyImmediately, setReplyImmediately] = useState(false);
  const [greetingTemplate, setGreetingTemplate] = useState(DEFAULT_GREETING);
  const [saving, setSaving] = useState(false);
  const [pausing, setPausing] = useState(false);

  useEffect(() => {
    if (workspace?.aiConfig) {
      setAgentName(workspace.aiConfig.agentName ?? 'Alex');
      setTone(workspace.aiConfig.tone ?? 'friendly');
      setCustomInstructions(workspace.aiConfig.customInstructions ?? '');
      setReplyImmediately(workspace.aiConfig.replyImmediately ?? false);
      setGreetingTemplate(workspace.aiConfig.greetingTemplate ?? DEFAULT_GREETING);
    }
  }, [workspace]);

  const previewMessage = greetingTemplate
    .replace('{leadName}', 'Sarah')
    .replace('{agentName}', agentName || 'Alex')
    .replace('{agentFirstName}', (agentName || 'Alex').split(' ')[0] ?? 'Alex')
    .replace('{area}', 'Coral Gables')
    .replace('{source}', 'Zillow');

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.patch('/workspaces/me/ai-config', { agentName, tone, customInstructions, replyImmediately, greetingTemplate });
      addToast('AI settings saved', 'success');
    } catch { addToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const togglePause = async () => {
    setPausing(true);
    try {
      if (workspace?.aiPaused) {
        await apiClient.post('/workspaces/me/ai/resume', {});
        addToast('AI responses resumed', 'success');
      } else {
        await apiClient.post('/workspaces/me/ai/pause', { reason: 'Manual pause from settings' });
        addToast('AI responses paused', 'success');
      }
      void refetch();
    } catch { addToast('Failed to update AI status', 'error'); }
    finally { setPausing(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · AI</p>
            <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
              AI configuration
            </h1>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
              Calibrate how your AI agent speaks, what it asks, and when it escalates.
            </p>
          </div>
          <button onClick={togglePause} disabled={pausing}
            style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 9, border: `1px solid ${workspace?.aiPaused ? 'rgba(71,255,142,0.35)' : 'rgba(255,92,92,0.35)'}`, background: workspace?.aiPaused ? 'rgba(71,255,142,0.08)' : 'rgba(255,92,92,0.08)', color: workspace?.aiPaused ? 'var(--green)' : 'var(--red)', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginTop: 16 }}>
            <Icon name={workspace?.aiPaused ? 'play' : 'pause'} size={13} stroke={2} />
            {pausing ? 'Updating...' : workspace?.aiPaused ? 'Resume AI' : 'Pause AI'}
          </button>
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

          {/* Response speed */}
          <div className="surface-card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Response speed</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>
                  {replyImmediately ? 'Replies immediately — fastest response time.' : 'Waits 30–60 seconds — feels more natural.'}
                </p>
              </div>
              <button onClick={() => setReplyImmediately(v => !v)}
                style={{ width: 44, height: 24, borderRadius: 12, background: replyImmediately ? 'var(--accent)' : 'var(--bg-4)', border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
                <span style={{ position: 'absolute', top: 2, left: replyImmediately ? 22 : 2, width: 20, height: 20, borderRadius: '50%', background: replyImmediately ? '#000' : 'var(--text-4)', transition: 'left 0.2s' }} />
              </button>
            </div>
          </div>

          {/* Greeting template */}
          <div className="surface-card" style={{ padding: 22 }}>
            <div style={{ marginBottom: 10 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Greeting template</h3>
              <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>
                Variables: <code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{'{leadName} {agentName} {agentFirstName} {area} {source}'}</code>
              </p>
            </div>
            <textarea
              value={greetingTemplate}
              onChange={e => setGreetingTemplate(e.target.value)}
              rows={3}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', lineHeight: 1.55, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', resize: 'none', outline: 'none', caretColor: 'var(--accent)', boxSizing: 'border-box' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
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
