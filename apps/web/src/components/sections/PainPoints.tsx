'use client';
import { useEffect, useRef } from 'react';
import { clsx } from 'clsx';

const PAINS = [
  { stat: '78%', text: 'of real estate leads never get a response within the first hour — and go cold forever.' },
  { stat: '$47k', text: 'average deal lost to a competitor who responded 10 minutes faster than you.' },
  { stat: '3am', text: 'Zillow does not care about your sleep schedule. Leads arrive at all hours.' },
  { stat: '6×', text: 'more likely to qualify a lead when you respond in under 60 seconds vs 60 minutes.' },
  { stat: '89%', text: 'of buyers work with the first agent who responds. Are you that agent right now?' },
  { stat: '$0', text: "What your missed leads cost you while you're showing properties, sleeping, or on vacation." },
];

export default function PainPoints() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.opacity = '1';
          (entry.target as HTMLElement).style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });
    const cards = ref.current.querySelectorAll('[data-animate]');
    cards.forEach(card => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-16">
          <p className="text-[11px] uppercase tracking-widest font-medium mb-3" style={{ color: 'var(--red)' }}>The Revenue Leak You Do Not See</p>
          <h2 className="font-display italic text-[52px] leading-tight" style={{ color: 'var(--text)' }}>
            Your Zillow spend is working.<br />Your follow-up {"isn't."}{' '}
          </h2>
        </div>

        <div ref={ref} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PAINS.map((pain, i) => (
            <div
              key={i}
              data-animate="true"
              className="rounded-[10px] border p-6 transition-all duration-500"
              style={{
                background: 'var(--bg-2)',
                borderColor: 'rgba(255,71,71,0.12)',
                opacity: 0,
                transform: 'translateY(16px)',
                transitionDelay: `${i * 80}ms`,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,71,71,0.3)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,71,71,0.12)'; }}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4" style={{ background: 'var(--red-dim)' }}>
                <span className="text-lg font-display" style={{ color: 'var(--red)' }}>!</span>
              </div>
              <p className="font-display text-[28px] mb-2 leading-none" style={{ color: 'var(--red)' }}>{pain.stat}</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-2)' }}>{pain.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
