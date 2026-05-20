'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button, Input } from '@conversionops/ui';

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
      <h1 className="font-display text-[32px] mb-2" style={{ color: 'var(--text)' }}>Connect Follow Up Boss</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>Sync qualified leads and conversation transcripts to your CRM automatically.</p>
      <div className="flex flex-col gap-4 mb-6">
        <Input label="Follow Up Boss API Key" placeholder="fub_live_" value={apiKey} onChange={e => setApiKey(e.target.value)} type="password" />
        {connected && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg" style={{ background: 'var(--green-dim)' }}>
            <Check size={14} style={{ color: 'var(--green)' }} />
            <span className="text-sm" style={{ color: 'var(--green)' }}>Connected successfully</span>
          </div>
        )}
      </div>
      <div className="flex gap-3">
        {!connected && <Button variant="secondary" onClick={handleTest} loading={testing} disabled={!apiKey}>Test Connection</Button>}
        <Button onClick={() => router.push('/onboarding/configure-ai')}>{connected ? 'Continue ?' : 'Skip for now'}</Button>
      </div>
    </div>
  );
}
