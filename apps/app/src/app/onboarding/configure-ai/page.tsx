'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Input } from '@conversionops/ui';

const TONES = [
  { id: 'professional', label: 'Professional', desc: 'Formal and business-focused' },
  { id: 'friendly', label: 'Friendly', desc: 'Warm and approachable' },
  { id: 'conversational', label: 'Conversational', desc: 'Casual and natural' },
];

export default function ConfigureAIPage() {
  const router = useRouter();
  const [agentName, setAgentName] = useState('Alex');
  const [tone, setTone] = useState('friendly');

  const preview = `Hi! I'm ${agentName || 'Alex'}, reaching out about your real estate inquiry. Are you looking to buy or sell a property? I'd love to help!`;

  return (
    <div>
      <h1 className="font-display text-[32px] mb-2" style={{ color: 'var(--text)' }}>Configure your AI agent</h1>
      <p className="text-sm mb-8" style={{ color: 'var(--text-2)' }}>Give your AI a personality that matches your brand.</p>
      <div className="flex flex-col gap-6 mb-8">
        <Input label="Agent Name" value={agentName} onChange={e => setAgentName(e.target.value)} placeholder="Alex" />
        <div>
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>Tone</p>
          <div className="grid grid-cols-3 gap-3">
            {TONES.map(t => (
              <button key={t.id} onClick={() => setTone(t.id)} className="p-3 rounded-[10px] border text-left transition-colors"
                style={{ borderColor: tone === t.id ? 'var(--accent)' : 'var(--border)', background: tone === t.id ? 'var(--accent-dim)' : 'var(--bg-3)' }}>
                <p className="text-sm font-medium" style={{ color: tone === t.id ? 'var(--accent)' : 'var(--text)' }}>{t.label}</p>
                <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{t.desc}</p>
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-[10px] p-4" style={{ background: 'var(--bg-3)' }}>
          <p className="text-[11px] uppercase tracking-wide mb-2 font-medium" style={{ color: 'var(--text-3)' }}>Preview</p>
          <div className="px-4 py-3 rounded-lg text-sm" style={{ background: 'var(--bg-4)', borderLeft: '2px solid var(--purple)', color: 'var(--text)' }}>{preview}</div>
        </div>
      </div>
      <Button onClick={() => router.push('/onboarding/test-lead')} className="w-full">Continue ?</Button>
    </div>
  );
}
