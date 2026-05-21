'use client';

import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

export default function Features() {
  return (
    <section
      id="features"
      style={{
        padding: 'clamp(80px, 12vw, 160px) 0',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div className="container-page">
        {/* Header */}
        <Reveal>
          <div style={{ textAlign: 'center', marginBottom: 64, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
            <span className="eyebrow" style={{ color: 'var(--accent)' }}>The Platform</span>
            <h2 className="serif t-h1" style={{ color: 'var(--text)', margin: 0, fontWeight: 400, maxWidth: 820 }}>
              Everything an ISA does.{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
                Automated.
              </span>{' '}
              At infrastructure scale.
            </h2>
            <p style={{ fontSize: 17, color: 'var(--text-2)', maxWidth: 540, lineHeight: 1.55, margin: 0 }}>
              The full lead-to-appointment stack &mdash; built for the way real estate actually works.
            </p>
          </div>
        </Reveal>

        {/* Bento grid */}
        <div
          className="bento"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(6, 1fr)',
            gridAutoRows: 'minmax(200px, auto)',
            gap: 16,
          }}
        >
          {/* 1. 60-second response — large hero card */}
          <Reveal delay={1} className="bento-hero">
            <Card
              accent="lime"
              span="col-span-4 row-span-2"
              icon="bolt"
              eyebrow="Speed"
              title="60-second AI response"
              desc="Every lead is greeted before your competitor's notification finishes loading. Personalized to the property they viewed, in the tone you set."
              decoration={<SpeedDecoration />}
              large
            />
          </Reveal>

          {/* 2. Missed call */}
          <Reveal delay={2}>
            <Card
              accent="amber"
              span="col-span-2 row-span-1"
              icon="phone"
              eyebrow="Recovery"
              title="Missed-call SMS"
              desc="Texts back within 8 seconds of a missed call. No voicemail purgatory."
            />
          </Reveal>

          {/* 3. CRM sync */}
          <Reveal delay={3}>
            <Card
              accent="blue"
              span="col-span-2 row-span-1"
              icon="sync"
              eyebrow="Integrations"
              title="Two-way CRM sync"
              desc="Follow Up Boss, every conversation pushed in real time."
              decoration={<CrmDecoration />}
            />
          </Reveal>

          {/* 4. Qualification */}
          <Reveal delay={1}>
            <Card
              accent="purple"
              span="col-span-2 row-span-1"
              icon="target"
              eyebrow="Intelligence"
              title="7-point scoring"
              desc="Scores leads 0–100. Hot leads routed first, dormant ones revived."
              decoration={<ScoreDecoration />}
            />
          </Reveal>

          {/* 5. Calendar booking */}
          <Reveal delay={2}>
            <Card
              accent="green"
              span="col-span-2 row-span-1"
              icon="calendar"
              eyebrow="Booking"
              title="Auto appointment"
              desc="Cal.com links, time-zone aware, syncs to your calendar."
            />
          </Reveal>

          {/* 6. Compliance */}
          <Reveal delay={3}>
            <Card
              accent="lime"
              span="col-span-2 row-span-1"
              icon="shield"
              eyebrow="Compliance"
              title="TCPA, by default"
              desc="Quiet hours, opt-out, consent ledger. Never an audit risk."
              decoration={<ShieldDecoration />}
            />
          </Reveal>

          {/* 7. Dead-lead revival */}
          <Reveal delay={1}>
            <Card
              accent="pink"
              span="col-span-3 row-span-1"
              icon="message"
              eyebrow="Dormant"
              title="Dead-lead revival"
              desc="Re-engages cold CRM leads with messages referencing their original search. Pulls value out of pipelines you'd written off."
            />
          </Reveal>

          {/* 8. Analytics */}
          <Reveal delay={2}>
            <Card
              accent="blue"
              span="col-span-3 row-span-1"
              icon="chart"
              eyebrow="Brokerage view"
              title="Real-time funnel"
              desc="See exactly where leads drop off, who's converting, and which sources are paying for themselves."
              decoration={<ChartDecoration />}
            />
          </Reveal>
        </div>
      </div>

      <style>{`
        .bento > div { display: flex; }
        .bento > div > div { width: 100%; }
        .bento .col-span-4 { grid-column: span 4; }
        .bento .col-span-3 { grid-column: span 3; }
        .bento .col-span-2 { grid-column: span 2; }
        .bento .col-span-1 { grid-column: span 1; }
        .bento .row-span-2 { grid-row: span 2; }
        .bento .row-span-1 { grid-row: span 1; }

        @media (max-width: 960px) {
          .bento { grid-template-columns: repeat(4, 1fr) !important; }
          .bento .col-span-4 { grid-column: span 4; }
          .bento .col-span-3 { grid-column: span 4; }
          .bento .col-span-2 { grid-column: span 2; }
          .bento .row-span-2 { grid-row: auto; }
        }
        @media (max-width: 600px) {
          .bento { grid-template-columns: 1fr !important; }
          .bento [class*="col-span"] { grid-column: span 1 !important; }
        }
      `}</style>
    </section>
  );
}

type Accent = 'lime' | 'amber' | 'blue' | 'purple' | 'green' | 'pink';

const ACCENT_MAP: Record<Accent, { color: string; bg: string; glow: string }> = {
  lime:   { color: 'var(--accent)', bg: 'var(--accent-dim)', glow: 'rgba(232,255,71,0.18)' },
  amber:  { color: 'var(--amber)',  bg: 'var(--amber-dim)',  glow: 'rgba(255,181,71,0.16)' },
  blue:   { color: 'var(--blue)',   bg: 'var(--blue-dim)',   glow: 'rgba(90,163,255,0.16)' },
  purple: { color: 'var(--purple)', bg: 'var(--purple-dim)', glow: 'rgba(179,155,255,0.16)' },
  green:  { color: 'var(--green)',  bg: 'var(--green-dim)',  glow: 'rgba(77,255,165,0.16)' },
  pink:   { color: 'var(--pink)',   bg: 'var(--pink-dim)',   glow: 'rgba(255,122,184,0.16)' },
};

function Card({
  accent,
  span,
  icon,
  eyebrow,
  title,
  desc,
  decoration,
  large,
}: {
  accent: Accent;
  span: string;
  icon: Parameters<typeof Icon>[0]['name'];
  eyebrow: string;
  title: string;
  desc: string;
  decoration?: React.ReactNode;
  large?: boolean;
}) {
  const a = ACCENT_MAP[accent];
  return (
    <div
      className={span}
      style={{
        background: 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)',
        border: '1px solid var(--border)',
        borderRadius: 18,
        padding: large ? '32px 32px 24px' : '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.4s var(--ease-soft), transform 0.4s var(--ease-out-quart), box-shadow 0.4s var(--ease-soft)',
        cursor: 'default',
        minHeight: large ? 280 : 200,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget;
        el.style.borderColor = a.color;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = `0 12px 40px ${a.glow}, var(--shadow-md)`;
      }}
      onMouseLeave={e => {
        const el = e.currentTarget;
        el.style.borderColor = 'var(--border)';
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: 'absolute',
          top: -60,
          right: -60,
          width: 180,
          height: 180,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${a.glow} 0%, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      {/* Icon */}
      <div
        style={{
          width: large ? 52 : 40,
          height: large ? 52 : 40,
          borderRadius: 12,
          background: a.bg,
          border: `1px solid ${a.color}33`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: a.color,
          boxShadow: `inset 0 1px 0 rgba(255,255,255,0.05), 0 0 24px ${a.glow}`,
          flexShrink: 0,
          marginBottom: large ? 8 : 4,
        }}
      >
        <Icon name={icon} size={large ? 22 : 18} stroke={1.8} />
      </div>

      {/* Eyebrow */}
      <div className="eyebrow" style={{ color: a.color, opacity: 0.85 }}>{eyebrow}</div>

      {/* Title */}
      <h3
        style={{
          fontSize: large ? 24 : 17,
          fontWeight: 600,
          color: 'var(--text)',
          margin: 0,
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
        }}
      >
        {title}
      </h3>

      {/* Description */}
      <p
        style={{
          fontSize: large ? 15 : 13.5,
          color: 'var(--text-2)',
          lineHeight: 1.6,
          margin: 0,
          maxWidth: large ? 460 : '100%',
        }}
      >
        {desc}
      </p>

      {/* Optional decoration */}
      {decoration && (
        <div
          style={{
            marginTop: 'auto',
            paddingTop: 16,
            position: 'relative',
            zIndex: 1,
          }}
        >
          {decoration}
        </div>
      )}
    </div>
  );
}

/* ──────── Decorations ──────── */

function SpeedDecoration() {
  return (
    <div
      style={{
        marginTop: 'auto',
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <span className="eyebrow" style={{ color: 'var(--text-3)' }}>Response time</span>
        <span style={{ fontSize: 11, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>↓ 99%</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <BarRow label="Avg agent" pct={100} value="5h 12m" color="var(--red)" muted />
        <BarRow label="Top 10%"    pct={42}  value="2h 08m" color="var(--amber)" muted />
        <BarRow label="ConversionOps" pct={1.5}  value="00:47" color="var(--accent)" highlight />
      </div>
    </div>
  );
}

function BarRow({
  label, pct, value, color, muted, highlight,
}: { label: string; pct: number; value: string; color: string; muted?: boolean; highlight?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 92, fontSize: 11, color: highlight ? 'var(--text)' : 'var(--text-3)', fontWeight: highlight ? 600 : 400 }}>{label}</span>
      <div style={{ flex: 1, height: 6, borderRadius: 100, background: 'var(--bg-4)', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: color,
            opacity: muted ? 0.5 : 1,
            boxShadow: highlight ? `0 0 12px ${color}` : 'none',
            borderRadius: 100,
            transition: 'width 0.8s var(--ease-out-quart)',
          }}
        />
      </div>
      <span
        style={{
          width: 56,
          textAlign: 'right',
          fontSize: 11,
          fontFamily: "'JetBrains Mono', monospace",
          color: highlight ? color : 'var(--text-3)',
          fontWeight: highlight ? 600 : 400,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function CrmDecoration() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 'auto', flexWrap: 'wrap' }}>
      {['Follow Up Boss', 'Twilio', 'Cal.com', 'Stripe'].map(label => (
        <span
          key={label}
          style={{
            padding: '4px 9px',
            borderRadius: 100,
            border: '1px solid var(--border)',
            background: 'var(--bg-3)',
            fontSize: 10,
            color: 'var(--text-3)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          {label}
        </span>
      ))}
    </div>
  );
}

function ScoreDecoration() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto' }}>
      <div
        style={{
          flex: 1,
          height: 6,
          borderRadius: 100,
          background: 'var(--bg-4)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '74%',
            background: 'linear-gradient(90deg, var(--green) 0%, var(--accent) 50%, var(--red) 100%)',
            borderRadius: 100,
            boxShadow: '0 0 12px rgba(232,255,71,0.4)',
          }}
        />
      </div>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
        74<span style={{ color: 'var(--text-4)', fontSize: 11 }}>/100</span>
      </span>
    </div>
  );
}

function ShieldDecoration() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 'auto', fontSize: 11 }}>
      {['STOP', 'UNSUBSCRIBE', 'CANCEL'].map(k => (
        <span
          key={k}
          style={{
            padding: '3px 8px',
            borderRadius: 4,
            background: 'rgba(255,92,92,0.10)',
            border: '1px solid rgba(255,92,92,0.20)',
            color: 'var(--red)',
            fontFamily: "'JetBrains Mono', monospace",
            letterSpacing: '0.04em',
          }}
        >
          {k}
        </span>
      ))}
    </div>
  );
}

function ChartDecoration() {
  // Tiny sparkline-style svg
  return (
    <div
      style={{
        marginTop: 'auto',
        background: 'var(--bg-3)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 12,
        display: 'flex',
        alignItems: 'flex-end',
        gap: 4,
        height: 64,
      }}
    >
      {[35, 45, 28, 52, 48, 65, 58, 72, 68, 85, 78, 92].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            background: i >= 9 ? 'var(--blue)' : 'var(--bg-5)',
            borderRadius: 2,
            transition: 'all 0.4s',
            boxShadow: i >= 9 ? '0 0 8px rgba(90,163,255,0.4)' : 'none',
          }}
        />
      ))}
    </div>
  );
}
