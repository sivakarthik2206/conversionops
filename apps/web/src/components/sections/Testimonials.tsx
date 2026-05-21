'use client';

import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

interface Quote {
  body: string;
  name: string;
  role: string;
  market: string;
  highlight: string;
}

const QUOTES: Quote[] = [
  {
    body: "We were paying two ISAs $110k between them. Replaced both with ConversionOps and our contact rate doubled in the first month. The system never sleeps, never quits, never has a bad day.",
    name: 'Marcus Reyes',
    role: 'Broker · 28 agents',
    market: 'Miami, FL',
    highlight: '2× contact rate',
  },
  {
    body: "The 60-second response is the difference. Buyers tell us we're the only ones who replied — and that's already half the conversation won. Booked 14 appointments in the first week.",
    name: 'Jenna Park',
    role: 'Team Lead · KW',
    market: 'Orlando, FL',
    highlight: '14 appts / wk',
  },
  {
    body: "What sold me was the TCPA layer. Most AI tools hand-wave compliance. ConversionOps actually has a consent ledger, quiet-hour gating, and a real audit trail. Our legal team signed off in 20 minutes.",
    name: 'David Lin',
    role: 'CTO · Regional brokerage',
    market: 'Tampa, FL',
    highlight: 'Audit-ready',
  },
];

const MARKETS = ['Miami', 'Orlando', 'Tampa', 'San Diego', 'Austin', 'Phoenix', 'Charlotte', 'Atlanta'];

export default function Testimonials() {
  return (
    <section
      style={{
        padding: 'clamp(80px, 12vw, 160px) 0',
        background: 'var(--bg-2)',
        position: 'relative',
        overflow: 'hidden',
        borderTop: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      {/* Ambient */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '-10%',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(179,155,255,0.08) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        {/* Header */}
        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 18, marginBottom: 56 }}>
            <span className="eyebrow" style={{ color: 'var(--purple)' }}>The receipts</span>
            <h2 className="serif t-h1" style={{ color: 'var(--text)', margin: 0, fontWeight: 400, maxWidth: 720 }}>
              Operators who replaced their ISAs &mdash;{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--purple)', fontFamily: "'Instrument Serif', serif" }}>
                and never went back.
              </span>
            </h2>
          </div>
        </Reveal>

        {/* Quote grid */}
        <div
          className="testimonial-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
            marginBottom: 72,
          }}
        >
          {QUOTES.map((q, i) => (
            <Reveal key={q.name} delay={((i + 1) as 1 | 2 | 3)}>
              <QuoteCard q={q} featured={i === 1} />
            </Reveal>
          ))}
        </div>

        {/* Markets marquee */}
        <Reveal delay={2}>
          <div
            style={{
              position: 'relative',
              padding: '24px 0',
              borderTop: '1px solid var(--border)',
              borderBottom: '1px solid var(--border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 0,
                top: 0,
                bottom: 0,
                width: 120,
                background: 'linear-gradient(90deg, var(--bg-2), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: 0,
                bottom: 0,
                width: 120,
                background: 'linear-gradient(-90deg, var(--bg-2), transparent)',
                zIndex: 2,
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                display: 'flex',
                gap: 48,
                width: 'fit-content',
                animation: 'marquee 36s linear infinite',
              }}
            >
              {[...MARKETS, ...MARKETS].map((market, i) => (
                <div
                  key={`${market}-${i}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    flexShrink: 0,
                    fontSize: 14,
                    color: 'var(--text-3)',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.04em',
                  }}
                >
                  <span style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--accent)', boxShadow: '0 0 6px var(--accent)' }} />
                  {market.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 960px) { .testimonial-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function QuoteCard({ q, featured }: { q: Quote; featured?: boolean }) {
  return (
    <figure
      style={{
        background: featured
          ? 'linear-gradient(180deg, rgba(179,155,255,0.06) 0%, var(--bg) 80%)'
          : 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)',
        border: '1px solid',
        borderColor: featured ? 'rgba(179,155,255,0.25)' : 'var(--border)',
        borderRadius: 18,
        padding: 28,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        position: 'relative',
        boxShadow: featured ? '0 16px 48px rgba(179,155,255,0.10)' : 'var(--shadow-sm)',
        height: '100%',
        margin: 0,
        transition: 'transform 0.4s var(--ease-out-quart), border-color 0.4s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(-4px)';
        el.style.borderColor = featured ? 'rgba(179,155,255,0.45)' : 'var(--border-light)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.transform = 'translateY(0)';
        el.style.borderColor = featured ? 'rgba(179,155,255,0.25)' : 'var(--border)';
      }}
    >
      {/* Big quote mark */}
      <span
        className="serif"
        style={{
          position: 'absolute',
          top: 12,
          right: 22,
          fontSize: 80,
          lineHeight: 0.7,
          color: featured ? 'rgba(179,155,255,0.18)' : 'rgba(255,255,255,0.06)',
          userSelect: 'none',
          fontStyle: 'italic',
        }}
      >
        &ldquo;
      </span>

      {/* Highlight chip */}
      <span
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '4px 10px',
          borderRadius: 100,
          background: featured ? 'rgba(179,155,255,0.12)' : 'rgba(232,255,71,0.10)',
          border: '1px solid',
          borderColor: featured ? 'rgba(179,155,255,0.30)' : 'rgba(232,255,71,0.25)',
          fontSize: 11,
          fontWeight: 600,
          color: featured ? 'var(--purple)' : 'var(--accent)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
        }}
      >
        <Icon name="sparkle" size={10} stroke={2.4} />
        {q.highlight}
      </span>

      {/* Quote body */}
      <blockquote
        style={{
          margin: 0,
          fontFamily: "'Instrument Serif', 'DM Serif Display', serif",
          fontSize: featured ? 22 : 19,
          lineHeight: 1.4,
          color: 'var(--text)',
          letterSpacing: '-0.015em',
          fontStyle: 'italic',
        }}
      >
        {q.body}
      </blockquote>

      {/* Author */}
      <figcaption
        style={{
          marginTop: 'auto',
          paddingTop: 16,
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: featured
              ? 'linear-gradient(135deg, var(--purple), #7c5fff)'
              : 'linear-gradient(135deg, var(--bg-4), var(--bg-3))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: featured ? '#fff' : 'var(--text-2)',
            fontWeight: 700,
            fontSize: 13,
            border: '1px solid var(--border-light)',
            flexShrink: 0,
          }}
        >
          {q.name.split(' ').map(n => n[0]).join('')}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{q.name}</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
            {q.role} &middot; {q.market}
          </div>
        </div>
      </figcaption>
    </figure>
  );
}
