'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix'];

export default function WorkspaceOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    if (!name.trim()) return;
    setLoading(true);
    try { await apiClient.patch('/workspaces/me', { name, timezone }); router.push('/onboarding/connect-phone'); }
    catch { /* proceed anyway */ router.push('/onboarding/connect-phone'); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h1 className="font-display italic text-[40px] mb-2 leading-tight" style={{ color: 'var(--text)' }}>
        {"Let's set up"}<br />ConversionOps
      </h1>
      <p className="text-base mb-8" style={{ color: 'var(--text-2)' }}>Just a few quick steps to get your AI running.</p>
      <div className="flex flex-col gap-4 mb-8">
        <Input label="Workspace Name" placeholder="Miami Realty Group" value={name} onChange={e => setName(e.target.value)} autoFocus />
        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>Timezone</label>
          <select value={timezone} onChange={e => setTimezone(e.target.value)} className="h-9 px-3 text-sm rounded-lg" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
            {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </div>
      </div>
      <Button loading={loading} onClick={handleContinue} className="w-full">Continue ?</Button>
    </div>
  );
}
