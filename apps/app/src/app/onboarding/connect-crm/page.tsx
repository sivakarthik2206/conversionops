'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@conversionops/ui';
import { Icon } from '@/components/Icon';

export default function ConnectCRMPage() {
  const router = useRouter();
  const [apiKey, setApiKey] = useState('');
  const [testing, setTesting] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleTest = () => {
    setTesting(true);
    setTimeout(() => { setTesting(false); setConnected(true); }, 1200);
  };

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Step 3 · CRM</p>
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
        Connect{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          Follow Up Boss.
        </span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.55 }}>
        Qualified leads and full conversation transcripts sync automatically — no manual data entry.
      </p>

      <div className="surface-card" style={{ padding: 22, marginBottom: 14, position: 'relative', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            top: -50,
            right: -50,
            width: 160,
            height: 160,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(90,163,255,0.10), transparent 70%)',
            filter: 'blur(25px)',
            pointerEvents: 'none',
          }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, position: 'relative' }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: 'rgba(90,163,255,0.14)',
              border: '1px solid rgba(90,163,255,0.30)',
              color: 'var(--blue)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="sync" size={16} stroke={1.8} />
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Follow Up Boss</h3>
            <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '2px 0 0' }}>Two-way sync · contacts, deals, notes</p>
          </div>
        </div>

        <Input
          label="API key"
          placeholder="fub_live_..."
          value={apiKey}
          onChange={e => setApiKey(e.target.value)}
          type="password"
        />

        {connected && (
          <div
            style={{
              marginTop: 14,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px',
              borderRadius: 100,
              background: 'rgba(77,255,165,0.10)',
              border: '1px solid rgba(77,255,165,0.30)',
              color: 'var(--green)',
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <Icon name="check" size={11} stroke={2.4} />
            Connected
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        {!connected && (
          <button
            onClick={handleTest}
            disabled={!apiKey || testing}
            className="btn-ghost"
            style={{ flex: 1, height: 48 }}
          >
            {testing ? <Icon name="loader" size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
            Test connection
          </button>
        )}
        <button
          onClick={() => router.push('/onboarding/configure-ai')}
          className="btn-primary"
          style={{ flex: 1, height: 48 }}
        >
          {connected ? 'Continue' : 'Skip for now'}
          <Icon name="arrow-right" size={14} stroke={2.2} />
        </button>
      </div>
    </div>
  );
}
