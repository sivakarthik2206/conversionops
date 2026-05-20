'use client';
import { useEffect, useRef } from 'react';

const PAINS = [
  {
    num: '01',
    icon: '⏱',
    title: '5-minute rule — broken',
    stat: '6×',
    desc: 'Leads are 6× more likely to qualify if contacted within 5 minutes. Most agents take 5 hours.',
  },
  {
    num: '02',
    icon: '🌙',
    title: '3am Zillow leads',
    stat: '40%',
    desc: '40% of inbound leads arrive outside business hours. Zero agents awake. Zero follow-up.',
  },
  {
    num: '03',
    icon: '📵',
    title: 'Missed calls → lost deals',
    stat: '15+hrs',
    desc: 'Average agent takes over 15 hours to respond to a missed call. The buyer is gone in 30 minutes.',
  },
  {
    num: '04',
    icon: '🏃',
    title: 'Competitor responded first',
    stat: '89%',
    desc: '89% of buyers choose the first agent who responds. Your competitors know this. Do you?',
  },
  {
    num: '05',
    icon: '💸',
    title: 'Revenue leaking silently',
    stat: '$47k',
    desc: 'Average commission lost per year to a competitor who answered 10 minutes faster.',
  },
  {
    num: '06',
    icon: '🤖',
    title: 'ISA salaries don\'t scale',
    stat: '$55k',
    desc: '$55k/year ISA salary — and they still sleep, take sick days, and miss leads on weekends.',
  },
];

export default function PainPoints() {
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).style.opacity = '1';
            (entry.target as HTMLElement).style.transform = 'translateY(0)';
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    const cards = grid.querySelectorAll<HTMLElement>('[data-pain]');
    cards.forEach(card => observer.observe(card));

    return () => observer.disconnect();
  }, []);

  return (
    <section
      style={{
        padding: '120px 24px',
        background: 'var(--bg)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Section header */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--red)',
              marginBottom: 16,
            }}
          >
            The Revenue Leak
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(36px, 5vw, 48px)',
              lineHeight: 1.1,
              color: 'var(--text)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            Your leads are leaking revenue
          </h2>
          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: 'var(--text-2)',
              maxWidth: 520,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6,
            }}
          >
            Real estate agents lose deals before they even start.
          </p>
        </div>

        {/* Grid */}
        <div
          ref={gridRef}
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: 16,
          }}
        >
          {PAINS.map((pain, i) => (
            <div
              key={pain.num}
              data-pain="true"
              style={{
                background: 'var(--bg-2)',
                border: '1px solid rgba(255,71,71,0.12)',
                borderRadius: 12,
                padding: 28,
                opacity: 0,
                transform: 'translateY(20px)',
                transition: `opacity 0.5s ease, transform 0.5s ease, border-color 0.2s ease, box-shadow 0.2s ease`,
                transitionDelay: `${i * 80}ms`,
                cursor: 'default',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,71,71,0.28)';
                el.style.transform = 'translateY(-4px)';
                el.style.boxShadow = '0 8px 24px rgba(255,71,71,0.08)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'rgba(255,71,71,0.12)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Number */}
              <div
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 48,
                  lineHeight: 1,
                  color: 'rgba(255,71,71,0.15)',
                  marginBottom: 12,
                  letterSpacing: '-0.02em',
                  userSelect: 'none',
                }}
              >
                {pain.num}
              </div>

              {/* Icon circle */}
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  background: 'var(--red-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  marginBottom: 16,
                }}
              >
                {pain.icon}
              </div>

              {/* Title */}
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: 'var(--text)',
                  margin: '0 0 8px',
                }}
              >
                {pain.title}
              </h3>

              {/* Stat */}
              <div
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 28,
                  lineHeight: 1,
                  color: 'var(--red)',
                  marginBottom: 10,
                  letterSpacing: '-0.01em',
                }}
              >
                {pain.stat}
              </div>

              {/* Description */}
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-2)',
                  lineHeight: 1.65,
                  margin: 0,
                }}
              >
                {pain.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
