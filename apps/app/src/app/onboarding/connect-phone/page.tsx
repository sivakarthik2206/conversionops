'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check } from 'lucide-react';
import { Button, Input, Spinner } from '@conversionops/ui';

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

  return (
    <div>
      <h1 className="font-display text-[32px] mb-2" style={{ color: 'var(--text)' }}>Get your AI phone number</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>Pick a local number for your area. Leads will text this number.</p>

      {done ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: 'var(--green-dim)' }}>
            <Check size={28} style={{ color: 'var(--green)' }} />
          </div>
          <h2 className="font-display text-[24px] mb-2" style={{ color: 'var(--text)' }}>Number provisioned!</h2>
          <p className="text-sm mb-6 font-mono" style={{ color: 'var(--accent)' }}>{selected}</p>
          <Button onClick={() => router.push('/onboarding/connect-crm')}>Continue ?</Button>
        </div>
      ) : (
        <>
          <div className="flex gap-3 mb-6">
            <Input placeholder="Area code, e.g. 305" value={areaCode} onChange={e => setAreaCode(e.target.value)} className="flex-1" />
            <Button variant="secondary" onClick={handleSearch} loading={searching}>Find numbers</Button>
          </div>
          {numbers.length > 0 && (
            <div className="flex flex-col gap-3 mb-6">
              {numbers.map(n => (
                <button key={n} onClick={() => setSelected(n)} className="p-4 rounded-[10px] border text-left transition-colors font-mono text-sm"
                  style={{ borderColor: selected === n ? 'var(--accent)' : 'var(--border)', background: selected === n ? 'var(--accent-dim)' : 'var(--bg-3)', color: 'var(--text)' }}>
                  {n}
                </button>
              ))}
            </div>
          )}
          <div className="flex gap-3">
            <Button onClick={handleProvision} disabled={!selected} loading={provisioning}>Provision this number</Button>
            <Button variant="ghost" onClick={() => router.push('/onboarding/connect-crm')}>Skip for now</Button>
          </div>
        </>
      )}
    </div>
  );
}
