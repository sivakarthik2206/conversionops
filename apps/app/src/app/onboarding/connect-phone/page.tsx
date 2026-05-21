'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@conversionops/ui';
import { Icon } from '@/components/Icon';

export default function ConnectPhonePage() {
  const router = useRouter();
  const [areaCode, setAreaCode] = useState('');
  const [numbers] = useState<string[]>(['+1 (305) 555-0142', '+1 (305) 555-0187', '+1 (305) 555-0219']);
  const [selected, setSelected] = useState('');
  const [searching, setSearching] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [done, setDone] = useState(false);

  const handleSearch = () => { setSearching(true); setTimeout(() => setSearching(false), 1000); };
  const handleProvision = () => {
    if (!selected) return;
    setProvisioning(true);
    setTimeout(() => { setProvisioning(false); setDone(true); }, 1500);
  };

  if (done) {
    return (
      <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 80, height: 80, borderRadius: '50%', background: 'radial-gradient(circle, rgba(77,255,165,0.20), transparent 70%)', marginBottom: 24, position: 'relative' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--green), #2bd886)',
              color: '#0a0a0b',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(77,255,165,0.4)',
            }}
          >
            <Icon name="check" size={26} stroke={2.4} />
          </div>
        </div>

        <p className="eyebrow" style={{ color: 'var(--green)', marginBottom: 10 }}>Number provisioned</p>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(28px, 4vw, 40px)',
            color: 'var(--text)',
            margin: '0 0 12px',
            fontWeight: 400,
            letterSpacing: '-0.03em',
          }}
        >
          You&apos;ve got a number.
        </h1>
        <div
          style={{
            display: 'inline-block',
            padding: '10px 20px',
            borderRadius: 12,
            background: 'rgba(232,255,71,0.08)',
            border: '1px solid var(--border-focus)',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 18,
            color: 'var(--accent)',
            marginBottom: 28,
            textShadow: '0 0 16px rgba(232,255,71,0.30)',
          }}
        >
          {selected}
        </div>
        <button
          onClick={() => router.push('/onboarding/connect-crm')}
          className="btn-primary"
          style={{ width: '100%', height: 48 }}
        >
          Continue
          <Icon name="arrow-right" size={14} stroke={2.2} />
        </button>
      </div>
    );
  }

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Step 2 · Phone</p>
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
        Pick your AI&apos;s{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          phone number.
        </span>
      </h1>
      <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.55 }}>
        Choose a local number for your market. Leads will SMS or call this number — your AI handles it.
      </p>

      <div className="surface-card" style={{ padding: 22, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <Input
              label="Area code"
              placeholder="e.g. 305"
              value={areaCode}
              onChange={e => setAreaCode(e.target.value)}
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={searching}
            className="btn-ghost"
            style={{ height: 38, alignSelf: 'flex-end' }}
          >
            {searching ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Icon name="search" size={13} stroke={1.8} />}
            Find
          </button>
        </div>
      </div>

      {numbers.length > 0 && (
        <div className="surface-card" style={{ padding: 14, marginBottom: 20 }}>
          <div className="eyebrow" style={{ color: 'var(--text-3)', padding: '4px 10px 10px' }}>Available numbers</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {numbers.map(n => {
              const active = selected === n;
              return (
                <button
                  key={n}
                  onClick={() => setSelected(n)}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    background: active ? 'rgba(232,255,71,0.08)' : 'var(--bg-3)',
                    border: '1px solid',
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 14,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    transition: 'all 0.2s',
                    textAlign: 'left',
                  }}
                >
                  <Icon name="phone" size={14} stroke={1.8} style={{ color: active ? 'var(--accent)' : 'var(--text-3)' }} />
                  <span style={{ flex: 1 }}>{n}</span>
                  {active && <Icon name="check" size={14} stroke={2.4} />}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={handleProvision} disabled={!selected || provisioning} className="btn-primary" style={{ flex: 1, height: 48 }}>
          {provisioning ? <Icon name="loader" size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          {provisioning ? 'Provisioning…' : 'Provision number'}
          {!provisioning && <Icon name="arrow-right" size={14} stroke={2.2} />}
        </button>
        <button onClick={() => router.push('/onboarding/connect-crm')} className="btn-ghost" style={{ height: 48 }}>
          Skip
        </button>
      </div>
    </div>
  );
}
