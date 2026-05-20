'use client';

const FEATURES = [
  {
    num: '01',
    icon: '⚡',
    title: '60-Second Response',
    desc: 'Every lead gets a personalised AI response before your competitor even reads the notification.',
  },
  {
    num: '02',
    icon: '📞',
    title: 'Missed Call Recovery',
    desc: 'Texts back within 8 seconds of a missed call. Never lose a lead to voicemail again.',
  },
  {
    num: '03',
    icon: '🎯',
    title: 'Smart Qualification',
    desc: '7-point qualification flow. Scores leads 0-100. Routes high-scores first.',
  },
  {
    num: '04',
    icon: '📅',
    title: 'Auto Appointment Booking',
    desc: 'Sends Cal.com links, confirms bookings, syncs to your calendar automatically.',
  },
  {
    num: '05',
    icon: '🔄',
    title: 'CRM Sync',
    desc: 'Every conversation, qualification, and appointment pushed to Follow Up Boss in real time.',
  },
  {
    num: '06',
    icon: '💬',
    title: 'Dead Lead Revival',
    desc: 'Re-engages dormant CRM leads with personalised messages referencing their original search.',
  },
  {
    num: '07',
    icon: '📊',
    title: 'Brokerage Analytics',
    desc: 'Real-time funnel visibility. See exactly where leads drop off and which agents convert.',
  },
];

export default function Features() {
  return (
    <section
      id="features"
      style={{
        padding: '120px 24px',
        background: 'var(--bg-2)',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 72 }}>
          <p
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: 'var(--text-3)',
              marginBottom: 16,
            }}
          >
            Platform Features
          </p>
          <h2
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontSize: 'clamp(32px, 5vw, 48px)',
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: 'var(--text)',
              margin: 0,
            }}
          >
            Everything your ISA does.{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Automatically.</span>
          </h2>
          <p
            style={{
              marginTop: 16,
              fontSize: 18,
              color: 'var(--text-2)',
              maxWidth: 540,
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.6,
            }}
          >
            The complete AI stack for real estate lead conversion — from first touch to booked appointment.
          </p>
        </div>

        {/* Asymmetric grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 16,
          }}
        >
          {FEATURES.map((feat, i) => (
            <div
              key={feat.num}
              style={{
                gridColumn: i === 0 ? 'span 2' : 'span 1',
                background: 'var(--bg)',
                border: '1px solid var(--border)',
                borderRadius: 12,
                padding: 28,
                display: 'flex',
                flexDirection: 'column',
                gap: 16,
                transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
                cursor: 'default',
                position: 'relative',
                overflow: 'hidden',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--border-light)';
                el.style.transform = 'translateY(-2px)';
                el.style.boxShadow = 'var(--shadow-md)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.borderColor = 'var(--border)';
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = 'none';
              }}
            >
              {/* Card number watermark */}
              <div
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 20,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  color: 'var(--text-4)',
                  userSelect: 'none',
                }}
              >
                {feat.num}
              </div>

              {/* Icon */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'var(--accent-dim)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  flexShrink: 0,
                }}
              >
                {feat.icon}
              </div>

              {/* Content */}
              <div>
                <h3
                  style={{
                    fontSize: 18,
                    fontWeight: 600,
                    color: 'var(--text)',
                    margin: '0 0 8px',
                    letterSpacing: '-0.01em',
                  }}
                >
                  {feat.title}
                </h3>
                <p
                  style={{
                    fontSize: 14,
                    color: 'var(--text-2)',
                    lineHeight: 1.65,
                    margin: 0,
                  }}
                >
                  {feat.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
