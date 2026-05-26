'use client';

import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

type IconName = Parameters<typeof Icon>[0]['name'];

const ISA_ROWS: { label: string; icon: IconName; isa: string; ops: string; isaWin: boolean }[] = [
  {
    label: 'First response',
    icon: 'clock',
    isa: '3 – 8 hours avg',
    ops: '< 60 seconds, every time',
    isaWin: false,
  },
  {
    label: 'Coverage',
    icon: 'bolt',
    isa: 'Business hours only',
    ops: '24 / 7 / 365 — including holidays',
    isaWin: false,
  },
  {
    label: 'Annual cost',
    icon: 'chart',
    isa: '$45k – $65k salary + benefits',
    ops: 'From $9k/yr all-in',
    isaWin: false,
  },
  {
    label: 'Simultaneous leads',
    icon: 'message',
    isa: '1 at a time',
    ops: 'Unlimited parallel conversations',
    isaWin: false,
  },
  {
    label: 'TCPA compliance',
    icon: 'shield',
    isa: 'Manual — error-prone',
    ops: 'Automated ledger + quiet-hour gating',
    isaWin: false,
  },
  {
    label: 'Consistency',
    icon: 'target',
    isa: 'Varies by mood, tenure, season',
    ops: 'Identical quality on every message',
    isaWin: false,
  },
];

const PROOF_STATS = [
  { v: '00:47', l: 'avg first response', sub: 'measured across all inbound channels' },
  { v: '24 / 7', l: 'always on', sub: 'no holidays, no sick days, no handoffs' },
  { v: '< 1 day', l: 'to go live', sub: 'from signed agreement to first AI response' },
];

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
          background: 'radial-gradient(circle, rgba(179,155,255,0.06) 0%, transparent 70%)',
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        {/* Header */}
        <Reveal>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 18,
              marginBottom: 64,
            }}
          >
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>The math, unfiltered</span>
            <h2
              className="serif t-h1"
              style={{ color: 'var(--text)', margin: 0, fontWeight: 400, maxWidth: 720 }}
            >
              Why agents replace their ISAs —{' '}
              <span
                style={{
                  fontStyle: 'italic',
                  color: 'var(--accent)',
                  fontFamily: "'Instrument Serif', serif",
                }}
              >
                and don&apos;t look back.
              </span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: 'var(--text-3)',
                maxWidth: 520,
                lineHeight: 1.6,
                margin: 0,
              }}
            >
              Not a testimonial. A direct comparison of what you&apos;re paying for versus what you&apos;re getting.
            </p>
          </div>
        </Reveal>

        {/* Comparison table */}
        <Reveal delay={1}>
          <div
            className="comparison-wrap"
            style={{
              background: 'linear-gradient(180deg, var(--bg) 0%, var(--bg-2) 100%)',
              border: '1px solid var(--border)',
              borderRadius: 20,
              overflow: 'hidden',
              marginBottom: 48,
              boxShadow: 'var(--shadow-md)',
            }}
          >
            {/* Column headers */}
            <div
              className="comp-row comp-header"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                borderBottom: '1px solid var(--border)',
              }}
            >
              <div
                style={{
                  padding: '16px 24px',
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-4)',
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                Factor
              </div>
              <div
                style={{
                  padding: '16px 24px',
                  borderLeft: '1px solid var(--border)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--text-4)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  Human ISA
                </span>
              </div>
              <div
                style={{
                  padding: '16px 24px',
                  borderLeft: '1px solid var(--border)',
                  background: 'rgba(232,255,71,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0a0a0b',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="logo-mark" size={9} stroke={2} />
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: 'var(--accent)',
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  ConversionOps
                </span>
              </div>
            </div>

            {/* Rows */}
            {ISA_ROWS.map((row, i) => (
              <div
                key={row.label}
                className="comp-row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  borderBottom: i < ISA_ROWS.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                {/* Label */}
                <div
                  style={{
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}
                >
                  <Icon name={row.icon} size={13} stroke={1.7} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{row.label}</span>
                </div>

                {/* ISA */}
                <div
                  style={{
                    padding: '16px 24px',
                    borderLeft: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="minus" size={12} stroke={2.4} style={{ color: 'var(--red)', opacity: 0.7, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text-3)', lineHeight: 1.4 }}>{row.isa}</span>
                </div>

                {/* ConversionOps */}
                <div
                  style={{
                    padding: '16px 24px',
                    borderLeft: '1px solid var(--border)',
                    background: 'rgba(232,255,71,0.025)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="check" size={12} stroke={2.8} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, lineHeight: 1.4 }}>{row.ops}</span>
                </div>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Proof stat strip */}
        <Reveal delay={2}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 16,
            }}
            className="proof-grid"
          >
            {PROOF_STATS.map((s) => (
              <div
                key={s.l}
                style={{
                  padding: '24px 28px',
                  borderRadius: 16,
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div
                  className="serif"
                  style={{
                    fontSize: 36,
                    lineHeight: 1,
                    color: 'var(--accent)',
                    fontWeight: 400,
                    fontFamily: "'Instrument Serif', 'DM Serif Display', serif",
                    fontStyle: 'italic',
                  }}
                >
                  {s.v}
                </div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.l}</div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-4)',
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.02em',
                    lineHeight: 1.5,
                  }}
                >
                  {s.sub}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <style>{`
        @media (max-width: 960px) {
          .comp-row { grid-template-columns: 1fr !important; }
          .comp-header { display: none !important; }
          .comp-row > div { border-left: none !important; border-top: 1px solid var(--border); }
          .comp-row > div:first-child { border-top: none; background: var(--bg-3); }
          .proof-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 640px) {
          .proof-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </section>
  );
}
