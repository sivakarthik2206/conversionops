'use client';

import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

type IconName = Parameters<typeof Icon>[0]['name'];

interface Pain {
  num: string;
  icon: IconName;
  title: string;
  stat: string;
  statLabel: string;
  desc: string;
}

const PAINS: Pain[] = [
  {
    num: '01',
    icon: 'clock',
    title: 'The five-minute rule, broken every day',
    stat: '6×',
    statLabel: 'more qualified',
    desc: 'Leads are 6× more likely to qualify when contacted within five minutes. The median agent takes over five hours.',
  },
  {
    num: '02',
    icon: 'moon',
    title: 'The 3am Zillow lead nobody answers',
    stat: '40%',
    statLabel: 'arrive off-hours',
    desc: 'Four in ten inbound leads come in outside business hours. Zero agents awake. Zero follow-up. Zero deals.',
  },
  {
    num: '03',
    icon: 'phone-off',
    title: 'Missed calls become missed commissions',
    stat: '15hr',
    statLabel: 'avg callback',
    desc: 'The average agent takes more than 15 hours to return a missed call. The buyer is gone in 30 minutes.',
  },
  {
    num: '04',
    icon: 'runner',
    title: 'Your competitor responded first',
    stat: '89%',
    statLabel: 'pick the first',
    desc: '89% of buyers choose the first agent who responds. Your competitors already know this. Do you?',
  },
  {
    num: '05',
    icon: 'cash',
    title: 'Silent revenue, leaking 24/7',
    stat: '$47k',
    statLabel: 'lost / year',
    desc: 'Average annual commission lost to the agent who answered ten minutes faster than you did.',
  },
  {
    num: '06',
    icon: 'cpu',
    title: 'Your ISA salary doesn’t scale',
    stat: '$55k',
    statLabel: 'salary, with gaps',
    desc: '$55k a year for an ISA who still sleeps, takes weekends off, calls in sick, and quits in eighteen months.',
  },
];

export default function PainPoints() {
  return (
    <section
      style={{
        padding: 'clamp(80px, 12vw, 160px) 0',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top hairline */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '15%',
          right: '15%',
          height: 1,
          background: 'linear-gradient(90deg, transparent, var(--border-strong), transparent)',
        }}
      />

      {/* Subtle red wash */}
      <div
        style={{
          position: 'absolute',
          top: '20%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '70%',
          height: '50%',
          background: 'radial-gradient(ellipse, rgba(255,92,92,0.06) 0%, transparent 70%)',
          filter: 'blur(40px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        {/* Section header */}
        <Reveal>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, marginBottom: 80, textAlign: 'center' }}>
            <span
              className="eyebrow"
              style={{
                color: 'var(--red)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', boxShadow: '0 0 8px var(--red)' }} />
              The revenue leak
            </span>
            <h2
              className="serif t-h1"
              style={{
                color: 'var(--text)',
                margin: 0,
                maxWidth: 760,
                fontWeight: 400,
              }}
            >
              Your leads are quietly leaking{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--red)', fontFamily: "'Instrument Serif', serif" }}>
                revenue
              </span>
              .
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, margin: 0 }}>
              Six structural reasons real estate agents lose deals before they even start &mdash; and why throwing more humans at the problem stopped working in 2019.
            </p>
          </div>
        </Reveal>

        {/* Grid */}
        <div
          className="pain-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 1,
            background: 'var(--border)',
            border: '1px solid var(--border)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {PAINS.map((pain, i) => (
            <Reveal key={pain.num} delay={((i % 3) + 1) as 1 | 2 | 3}>
              <PainCard pain={pain} />
            </Reveal>
          ))}
        </div>

        {/* Bottom transition line */}
        <Reveal delay={2}>
          <div style={{ marginTop: 64, textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: 'var(--text-3)', margin: 0 }}>
              You can&apos;t out-hire this problem.{' '}
              <span style={{ color: 'var(--text)', fontWeight: 500 }}>You have to out-automate it.</span>
            </p>
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 900px) { .pain-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .pain-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </section>
  );
}

function PainCard({ pain }: { pain: Pain }) {
  return (
    <div
      className="pain-card"
      style={{
        background: 'var(--bg)',
        padding: '36px 32px',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: 18,
        minHeight: 280,
        transition: 'background 0.4s var(--ease-soft)',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'linear-gradient(180deg, var(--bg-2), var(--bg))';
        const num = el.querySelector<HTMLElement>('[data-num]');
        if (num) {
          num.style.color = 'rgba(255,92,92,0.30)';
          num.style.transform = 'translateY(-2px)';
        }
        const iconWrap = el.querySelector<HTMLElement>('[data-iconwrap]');
        if (iconWrap) {
          iconWrap.style.borderColor = 'rgba(255,92,92,0.35)';
          iconWrap.style.background = 'rgba(255,92,92,0.10)';
          iconWrap.style.color = 'var(--red)';
        }
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'var(--bg)';
        const num = el.querySelector<HTMLElement>('[data-num]');
        if (num) {
          num.style.color = 'rgba(255,255,255,0.06)';
          num.style.transform = 'translateY(0)';
        }
        const iconWrap = el.querySelector<HTMLElement>('[data-iconwrap]');
        if (iconWrap) {
          iconWrap.style.borderColor = 'var(--border)';
          iconWrap.style.background = 'var(--bg-3)';
          iconWrap.style.color = 'var(--text-3)';
        }
      }}
    >
      {/* Big number watermark */}
      <span
        data-num
        className="serif"
        style={{
          position: 'absolute',
          top: 16,
          right: 24,
          fontSize: 90,
          lineHeight: 0.9,
          color: 'rgba(255,255,255,0.06)',
          userSelect: 'none',
          transition: 'color 0.4s var(--ease-soft), transform 0.4s var(--ease-out-quart)',
          fontWeight: 400,
          letterSpacing: '-0.04em',
        }}
      >
        {pain.num}
      </span>

      {/* Icon */}
      <div
        data-iconwrap
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-3)',
          transition: 'all 0.4s var(--ease-soft)',
        }}
      >
        <Icon name={pain.icon} size={20} stroke={1.7} />
      </div>

      {/* Title */}
      <h3
        style={{
          fontSize: 18,
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
          lineHeight: 1.3,
          letterSpacing: '-0.01em',
        }}
      >
        {pain.title}
      </h3>

      {/* Stat row */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <span
          className="serif"
          style={{
            fontSize: 36,
            lineHeight: 1,
            color: 'var(--red)',
            fontWeight: 400,
          }}
        >
          {pain.stat}
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-4)',
            fontFamily: "'JetBrains Mono', monospace",
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
          }}
        >
          {pain.statLabel}
        </span>
      </div>

      {/* Description */}
      <p
        style={{
          fontSize: 14,
          color: 'var(--text-2)',
          lineHeight: 1.6,
          margin: 0,
          flex: 1,
        }}
      >
        {pain.desc}
      </p>
    </div>
  );
}
