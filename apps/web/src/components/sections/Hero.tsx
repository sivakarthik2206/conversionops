'use client';

const STATS = [
  { value: '60s', label: 'First response' },
  { value: '3×', label: 'More appointments' },
  { value: '78%', label: 'Lead contact rate' },
  { value: '$0', label: 'Extra staff needed' },
];

export default function Hero() {
  return (
    <section
      style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '100px 24px 80px',
        overflow: 'hidden',
      }}
    >
      {/* Background radial gradient */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 90% 60% at 50% 0%, rgba(232,255,71,0.05) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Noise texture */}
      <div className="noise-overlay" />

      {/* Floating blobs */}
      <div
        style={{
          position: 'absolute',
          top: '10%',
          left: '5%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,255,71,0.06) 0%, transparent 70%)',
          filter: 'blur(60px)',
          animation: 'float 18s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '30%',
          right: '5%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)',
          filter: 'blur(80px)',
          animation: 'floatSlow 22s ease-in-out infinite',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '15%',
          left: '20%',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(71,150,255,0.04) 0%, transparent 70%)',
          filter: 'blur(70px)',
          animation: 'float 25s ease-in-out infinite reverse',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: 900,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
          textAlign: 'center',
        }}
      >
        {/* Badge */}
        <div
          className="animate-fade-up"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '6px 14px',
            borderRadius: 100,
            border: '1px solid var(--border-light)',
            background: 'var(--bg-2)',
            fontSize: 12,
            fontWeight: 500,
            color: 'var(--text-2)',
            letterSpacing: '0.02em',
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--green)',
              boxShadow: '0 0 8px var(--green)',
              animation: 'pulseDot 2s ease-in-out infinite',
              flexShrink: 0,
            }}
          />
          Now live in Miami · Orlando · Tampa · San Diego
        </div>

        {/* Headline */}
        <h1
          className="animate-fade-up delay-100"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 'clamp(48px, 8.5vw, 80px)',
            lineHeight: 1.05,
            letterSpacing: '-0.03em',
            color: 'var(--text)',
            margin: 0,
          }}
        >
          Every lead answered.<br />
          Every deal{' '}
          <span
            style={{
              color: 'var(--accent)',
              textDecorationLine: 'underline',
              textDecorationColor: 'rgba(232,255,71,0.4)',
              textDecorationThickness: 3,
              textUnderlineOffset: 6,
            }}
          >
            captured.
          </span>
        </h1>

        {/* Subheadline */}
        <p
          className="animate-fade-up delay-200"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 20,
            fontWeight: 400,
            color: 'var(--text-2)',
            lineHeight: 1.6,
            maxWidth: 560,
            margin: 0,
          }}
        >
          AI responds to every inbound lead in 60 seconds. Qualifies, books, syncs to CRM — while your agents focus on closings.
        </p>

        {/* CTA row */}
        <div
          className="animate-fade-up delay-300"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <a
            href="/demo"
            style={{
              height: 52,
              padding: '0 28px',
              fontSize: 15,
              fontWeight: 600,
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#000',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              transition: 'transform 0.15s, filter 0.15s',
              boxShadow: 'var(--shadow-accent)',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = 'scale(1.02)';
              el.style.filter = 'brightness(1.05)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.transform = 'scale(1)';
              el.style.filter = 'brightness(1)';
            }}
          >
            See it work →
          </a>
          <a
            href="/pricing"
            style={{
              height: 52,
              padding: '0 28px',
              fontSize: 15,
              fontWeight: 500,
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--text-2)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border-light)',
              transition: 'color 0.15s, border-color 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = 'var(--text)';
              el.style.borderColor = 'var(--border-focus)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.color = 'var(--text-2)';
              el.style.borderColor = 'var(--border-light)';
            }}
          >
            View pricing
          </a>
        </div>

        {/* Stats bar */}
        <div
          className="animate-fade-up delay-400"
          style={{
            marginTop: 40,
            width: '100%',
            maxWidth: 800,
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0,
            borderTop: '1px solid var(--border)',
            paddingTop: 32,
          }}
        >
          {STATS.map((stat, i) => (
            <div
              key={stat.label}
              style={{
                textAlign: 'center',
                padding: '0 16px',
                borderRight: i < 3 ? '1px solid var(--border)' : 'none',
              }}
            >
              <div
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontSize: 32,
                  lineHeight: 1,
                  color: 'var(--accent)',
                  marginBottom: 6,
                  letterSpacing: '-0.02em',
                }}
              >
                {stat.value}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: 'var(--text-3)',
                  margin: 0,
                  fontWeight: 400,
                }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div
        className="animate-fade-up delay-600"
        style={{
          position: 'absolute',
          bottom: 32,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 4,
          opacity: 0.5,
        }}
      >
        <span style={{ fontSize: 11, color: 'var(--text-4)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>Scroll</span>
        <svg
          width="16"
          height="10"
          viewBox="0 0 16 10"
          fill="none"
          style={{ animation: 'bounce 1.5s ease-in-out infinite', color: 'var(--text-4)' }}
        >
          <path d="M1 1L8 8L15 1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>

      <style>{`
        @media (max-width: 640px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
        }
      `}</style>
    </section>
  );
}
