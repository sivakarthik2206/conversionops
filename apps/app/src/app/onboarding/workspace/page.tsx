'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix'];

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await apiClient.patch('/workspaces/me', { name, timezone });
      router.push('/onboarding/connect-phone');
    } catch {
      router.push('/onboarding/connect-phone');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Welcome aboard</p>
      <h1
        className="serif"
        style={{
          fontSize: 'clamp(36px, 5vw, 52px)',
          color: 'var(--text)',
          margin: '0 0 12px',
          fontWeight: 400,
          lineHeight: 1.05,
          letterSpacing: '-0.03em',
        }}
      >
        Let&apos;s set up{' '}
        <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
          your workspace.
        </span>
      </h1>
      <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 32px', lineHeight: 1.55 }}>
        Six quick steps. Most teams finish in under ten minutes.
      </p>

      <div className="surface-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
        <Input
          label="Workspace name"
          placeholder="Miami Realty Group"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Timezone</label>
          <select
            value={timezone}
            onChange={e => setTimezone(e.target.value)}
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
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>

      <div style={{ marginTop: 20 }}>
        <button onClick={handleContinue} disabled={!name.trim() || loading} className="btn-primary" style={{ width: '100%', height: 48 }}>
          {loading ? <Icon name="loader" size={14} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
          Continue
          <Icon name="arrow-right" size={14} stroke={2.2} />
        </button>
      </div>
    </div>
  );
}
