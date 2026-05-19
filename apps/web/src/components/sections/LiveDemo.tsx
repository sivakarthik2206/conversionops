'use client';
import { useState, useRef } from 'react';

const CONVERSATION = [
  { role: 'human', text: 'Hi, I saw a listing on Zillow and wanted more info' },
  { role: 'ai', text: "Hi Maria! I'm Alex with Miami Realty. Great choice — that property just hit the market. Are you looking to buy in the next 30-90 days, or are you still exploring?" },
  { role: 'human', text: "We're pretty serious, hoping to move in 60-90 days" },
  { role: 'ai', text: "Perfect timing. Have you already been pre-approved for a mortgage, or are you still working on financing?" },
  { role: 'human', text: 'Pre-approved, $650k budget' },
  { role: 'ai', text: "Excellent — that opens up a lot of great options in that area. I'd love to set up a showing this week. What does your schedule look like on Thursday or Friday afternoon?" },
];

const SCORE_STEPS = [0, 22, 45, 68, 94];

export default function LiveDemo() {
  const [messages, setMessages] = useState<typeof CONVERSATION>([]);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState<'idle' | 'running' | 'done'>('idle');
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startDemo = () => {
    if (status !== 'idle') return;
    setStatus('running');
    setMessages([]);
    setScore(0);
    const start = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now()-start)/1000)), 100);

    CONVERSATION.forEach((msg, i) => {
      setTimeout(() => {
        setMessages(prev => [...prev, msg]);
        if (msg.role === 'ai') setScore(SCORE_STEPS[Math.ceil((i+1)/2)] ?? 0);
        if (i === CONVERSATION.length - 1) {
          if (timerRef.current) clearInterval(timerRef.current);
          setStatus('done');
        }
      }, (i * 1500) + (msg.role === 'ai' ? 800 : 0));
    });
  };

  return (
    <section id="demo" className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--text-3)' }}>Live Simulation</p>
          <h2 className="font-display italic text-[52px] leading-tight" style={{ color: 'var(--text)' }}>Watch it work in real time</h2>
        </div>

        <div className="rounded-[20px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          {/* Mac dots */}
          <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
            {['#ff5f57','#febc2e','#28c840'].map(c => <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />)}
            <div className="flex-1 mx-4 h-6 rounded-md text-center text-xs flex items-center justify-center" style={{ background: 'var(--bg-4)', color: 'var(--text-3)' }}>
              conversionops.io — AI Lead Demo
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-0">
            {/* Lead form */}
            <div className="p-8 border-r" style={{ borderColor: 'var(--border)' }}>
              <h3 className="text-base font-semibold mb-6" style={{ color: 'var(--text)' }}>Inbound Lead</h3>
              {[
                { label: 'Name', value: 'Maria Rodriguez' },
                { label: 'Phone', value: '+1 (305) 555-0142' },
                { label: 'Source', value: 'Zillow' },
                { label: 'Property', value: '1234 Brickell Ave, Miami' },
              ].map(field => (
                <div key={field.label} className="mb-4">
                  <label className="block text-[11px] uppercase tracking-widest mb-1.5 font-medium" style={{ color: 'var(--text-3)' }}>{field.label}</label>
                  <div className="px-3 py-2 rounded-lg text-sm" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>{field.value}</div>
                </div>
              ))}

              <div className="mt-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ background: status === 'idle' ? 'var(--text-4)' : status === 'running' ? 'var(--amber)' : 'var(--green)', transition: 'background 0.3s' }} />
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                    {status === 'idle' ? 'Waiting' : status === 'running' ? 'AI Active' : 'Appointment Booked'}
                  </span>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{elapsed}s</span>
              </div>

              {status === 'idle' && (
                <button onClick={startDemo}
                  className="mt-4 w-full h-10 rounded-lg text-sm font-medium transition-colors"
                  style={{ background: 'var(--accent)', color: 'var(--bg)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}>
                  Fire this lead ?
                </button>
              )}

              {/* Score */}
              <div className="mt-6">
                <div className="flex justify-between mb-1.5">
                  <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: 'var(--text-3)' }}>Lead Score</span>
                  <span className="text-sm font-display" style={{ color: 'var(--accent)', transition: 'all 0.3s' }}>{score}</span>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${score}%`, background: 'var(--accent)' }} />
                </div>
              </div>
            </div>

            {/* Conversation stream */}
            <div className="p-8 flex flex-col h-[480px]">
              <h3 className="text-base font-semibold mb-6" style={{ color: 'var(--text)' }}>AI Conversation</h3>
              <div className="flex-1 flex flex-col gap-3 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--text-4)' }}>
                    <p className="text-sm">Click &quot;Fire this lead&quot; to start the simulation</p>
                  </div>
                ) : messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === 'human' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                    <div className="max-w-[80%] px-4 py-2.5 rounded-[10px] text-sm"
                      style={{
                        background: msg.role === 'ai' ? 'var(--bg-3)' : 'var(--accent-dim)',
                        borderLeft: msg.role === 'ai' ? '2px solid var(--purple)' : 'none',
                        color: 'var(--text)',
                      }}>
                      {msg.text}
                    </div>
                  </div>
                ))}
              </div>
              {status === 'done' && (
                <div className="mt-4 text-center animate-fade-in">
                  <p className="text-sm font-medium" style={{ color: 'var(--accent)' }}>This just happened. Automatically.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
