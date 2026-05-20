'use client';
import React, { useEffect, useRef } from 'react';

const DEMO_STEPS = [
  { delay: 500, type: 'lead', content: 'Hi, I\'m interested in buying a home in Miami. Budget around $450k.' },
  { delay: 2000, type: 'status', content: 'Lead received — AI qualifying in progress…' },
  { delay: 3200, type: 'ai', content: 'Hi! I\'m Alex, a real estate assistant. Great timing — Miami is moving fast! Are you looking to buy in the next 30-90 days, or just starting to explore?' },
  { delay: 5500, type: 'score', content: '38' },
  { delay: 6200, type: 'lead', content: 'Within 60 days ideally. We\'re pre-approved for $500k.' },
  { delay: 8000, type: 'ai', content: 'That\'s fantastic — pre-approved buyers move fast here! Are you looking for a single-family home, condo, or townhouse?' },
  { delay: 10000, type: 'score', content: '74' },
  { delay: 10500, type: 'lead', content: 'Single family, preferably 3 beds.' },
  { delay: 12200, type: 'ai', content: 'Perfect. I have several 3-bed listings in your range. Want me to send you a link to book a quick call with our team?' },
  { delay: 14000, type: 'score', content: '91' },
  { delay: 14500, type: 'status', content: '🔥 HOT lead — booking link sent' },
];

export default function LiveDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const messagesEl = container.querySelector<HTMLDivElement>('[data-messages]');
    const scoreEl = container.querySelector<HTMLSpanElement>('[data-score]');
    const timerEl = container.querySelector<HTMLSpanElement>('[data-timer]');
    const statusEl = container.querySelector<HTMLDivElement>('[data-status]');
    if (!messagesEl || !scoreEl || !timerEl || !statusEl) return;

    // Clear previous
    messagesEl.innerHTML = '';
    scoreEl.textContent = '0';
    statusEl.textContent = 'Waiting for inbound lead…';

    const startTime = Date.now();
    const timers: ReturnType<typeof setTimeout>[] = [];

    // Timer tick
    const tick = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      timerEl.textContent = elapsed + 's';
    }, 100);

    DEMO_STEPS.forEach((step) => {
      const t = setTimeout(() => {
        if (step.type === 'score') {
          const target = parseInt(step.content, 10);
          scoreEl.textContent = step.content;
          const color = target >= 80 ? '#47ff8e' : target >= 30 ? '#ffb347' : '#ff4747';
          scoreEl.style.color = color;
        } else if (step.type === 'status') {
          statusEl.textContent = step.content;
        } else {
          const div = document.createElement('div');
          div.style.cssText = `
            display: flex;
            justify-content: ${step.type === 'lead' ? 'flex-end' : 'flex-start'};
            margin-bottom: 12px;
            animation: fadeInUp 0.3s ease;
          `;
          const bubble = document.createElement('div');
          bubble.style.cssText = `
            max-width: 80%;
            padding: 10px 14px;
            border-radius: 10px;
            font-size: 13px;
            line-height: 1.5;
            color: #f4f4f5;
            background: ${step.type === 'lead' ? 'rgba(232,255,71,0.12)' : 'rgba(255,255,255,0.06)'};
            border-${step.type === 'lead' ? 'right' : 'left'}: 2px solid ${step.type === 'lead' ? '#e8ff47' : '#a78bfa'};
          `;
          if (step.type === 'ai') {
            const label = document.createElement('div');
            label.style.cssText = 'font-size: 10px; color: #a78bfa; font-weight: 600; margin-bottom: 4px;';
            label.textContent = 'AI · Alex';
            bubble.appendChild(label);
          }
          const text = document.createElement('span');
          text.textContent = step.content;
          bubble.appendChild(text);
          div.appendChild(bubble);
          messagesEl.appendChild(div);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        }
      }, step.delay);
      timers.push(t);
    });

    // Restart after full cycle
    const restart = setTimeout(() => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
      // Re-run by triggering effect cleanup/restart
    }, DEMO_STEPS[DEMO_STEPS.length - 1]!.delay + 4000);

    timers.push(restart);

    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section id="demo" className="py-24 px-4" style={{ background: 'var(--bg-2)' }}>
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-xs uppercase tracking-widest mb-4" style={{ color: 'var(--accent)' }}>Live Demo</p>
          <h2 className="text-4xl mb-4" style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', color: 'var(--text)' }}>
            Watch it qualify a lead
          </h2>
          <p className="text-base" style={{ color: 'var(--text-2)' }}>No signup. Real AI. Real qualification flow.</p>
        </div>

        <div ref={containerRef} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Lead form panel */}
          <div className="rounded-[16px] p-6" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Inbound Lead</div>
                <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>John Smith · Miami, FL</div>
              </div>
              <div className="text-right">
                <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Response time</div>
                <div className="font-mono text-sm" style={{ color: 'var(--accent)' }}>
                  <span data-timer>0.0</span>
                </div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[
                { label: 'Budget', value: '$450–500k' },
                { label: 'Timeline', value: '30–60 days' },
                { label: 'Financing', value: 'Pre-approved' },
                { label: 'Type', value: 'Single family, 3bd' },
                { label: 'Area', value: 'Miami metro' },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ background: 'var(--bg-4)' }}>
                  <span className="text-xs" style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{value}</span>
                </div>
              ))}
            </div>

            <div className="rounded-lg p-4 text-center" style={{ background: 'var(--bg-4)' }}>
              <div className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Lead Score</div>
              <div className="text-4xl font-bold font-mono" style={{ fontFamily: "'DM Serif Display', serif" }}>
                <span data-score style={{ color: 'var(--green)' }}>0</span>
                <span style={{ color: 'var(--text-4)', fontSize: '20px' }}>/100</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg px-3 py-2 text-xs text-center" data-status style={{ background: 'var(--accent-dim-2)', color: 'var(--accent)' }}>
              Waiting for inbound lead…
            </div>
          </div>

          {/* Conversation panel */}
          <div className="rounded-[16px] flex flex-col" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="text-sm font-medium" style={{ color: 'var(--text)' }}>AI Conversation</div>
              <div className="text-xs" style={{ color: 'var(--text-3)' }}>Powered by Gemini 1.5 Flash</div>
            </div>
            <div
              data-messages
              className="flex-1 overflow-y-auto p-4"
              style={{ minHeight: 280, maxHeight: 380 }}
            />
          </div>
        </div>

        <style>{`
          @keyframes fadeInUp {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    </section>
  );
}
