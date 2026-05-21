'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@conversionops/ui';
import { Icon } from '@/components/Icon';

const TONES = [
  { id: 'professional',  label: 'Professional',   desc: 'Formal, business-like.',          icon: 'building' as const, color: 'var(--blue)' },
  { id: 'friendly',      label: 'Friendly',       desc: 'Warm, approachable.',             icon: 'star' as const,     color: 'var(--accent)' },
  { id: 'conversational',label: 'Conversational', desc: 'Casual, natural.',                icon: 'message' as const,  color: 'var(--purple)' },
];

export default function ConfigureAIPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState('Alex');
  const [tone, setTone] = useState('friendly');

  const preview = `Hi! I'm ${agentName || 'Alex'}, reaching out about your real estate inquiry. Are you looking to buy or sell? I'd love to help.`;

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Step 4 · AI</p>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(32px, 4.5vw, 44px)',
          color: 'var(--text)',
          margin: '0 0 12px',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.025em',
        }}
      >
        Give your AI a{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          personality.
        </span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.55 }}>
        Name your AI agent and pick a tone. You can fine-tune later in settings.
      </p>

      <div className="surface-card" style={{ padding: 22, marginBottom: 12 }}>
        <Input
          label="Agent name"
          value={agentName}
          onChange={e => setAgentName(e.target.value)}
          placeholder="Alex"
          hint="The name your AI uses when greeting leads."
        />
      </div>

      <div className="surface-card" style={{ padding: 22, marginBottom: 12 }}>
        <div style={{ marginBottom: 14 }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Tone</h3>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {TONES.map(t => {
            const active = tone === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTone(t.id)}
                style={{
                  padding: 14,
                  borderRadius: 11,
                  background: active ? `${t.color}10` : 'var(--bg-3)',
                  border: '1px solid',
                  borderColor: active ? t.color : 'var(--border)',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    background: `${t.color}1a`,
                    border: `1px solid ${t.color}33`,
                    color: t.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 8,
                  }}
                >
                  <Icon name={t.icon} size={12} stroke={1.8} />
                </div>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: active ? t.color : 'var(--text)' }}>
                  {t.label}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 3, lineHeight: 1.4 }}>
                  {t.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Preview */}
      <div className="surface-card" style={{ padding: 18, marginBottom: 20, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: -40,
            right: -40,
            width: 140,
            height: 140,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(179,155,255,0.10), transparent 70%)',
            filter: 'blur(20px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
          <Icon name="sparkle" size={12} stroke={1.8} style={{ color: 'var(--purple)' }} />
          <span className="eyebrow" style={{ color: 'var(--purple)' }}>Preview</span>
        </div>
        <div style={{ display: 'flex', gap: 8, position: 'relative' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--purple), #8b6fff)',
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: 2,
            }}
          >
            <Icon name="bot" size={12} stroke={1.8} />
          </div>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '12px 12px 12px 4px',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              fontSize: 13.5,
              color: 'var(--text)',
              lineHeight: 1.55,
              flex: 1,
            }}
          >
            {preview}
          </div>
        </div>
      </div>

      <button onClick={() => router.push('/onboarding/test-lead')} className="btn-primary" style={{ width: '100%', height: 48 }}>
        Continue
        <Icon name="arrow-right" size={14} stroke={2.2} />
      </button>
    </div>
  );
}
