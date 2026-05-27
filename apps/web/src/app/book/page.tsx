import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';
import { CalEmbed } from '@/components/CalEmbed';

const CAL_LINK = process.env['NEXT_PUBLIC_CALCOM_LINK'] ?? '';

export const metadata = {
  title: 'Book a Demo — ConversionOps',
  description: 'Schedule a personalized demo of ConversionOps AI lead conversion.',
};

const PROOF = [
  { v: '00:47', l: 'avg response time' },
  { v: '94%',   l: 'lead contact rate' },
  { v: '3.2×',  l: 'appts vs ISA' },
];

const AGENDA = [
  { num: '01', t: 'Your lead sources', d: 'Zillow, Realtor, missed calls, web forms — we map every channel.' },
  { num: '02', t: 'Your AI agent persona', d: 'Tone, qualification criteria, escalation rules — calibrated to your market.' },
  { num: '03', t: 'A live test lead', d: 'You submit a number, the AI responds in under 60 seconds. You decide if it ships.' },
  { num: '04', t: 'Pricing + go-live', d: 'Transparent numbers, same-day setup if you want to start tonight.' },
];

export default function BookPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Navbar />

      <section
        style={{
          paddingTop: 'clamp(140px, 18vw, 200px)',
          paddingBottom: 80,
          position: 'relative',
        }}
      >
        {/* Ambient */}
        <div
          style={{
            position: 'absolute',
            top: '10%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(ellipse, rgba(232,255,71,0.08) 0%, transparent 65%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }}
        />

        <div className="container-page" style={{ position: 'relative' }}>
          <div
            className="book-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 56,
              alignItems: 'start',
            }}
          >
            {/* LEFT: copy */}
            <Reveal>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <span className="eyebrow" style={{ color: 'var(--accent)' }}>Book a 20-min demo</span>

                <h1
                  className="serif"
                  style={{
                    fontSize: 'clamp(40px, 5.5vw, 64px)',
                    lineHeight: 1.0,
                    letterSpacing: '-0.03em',
                    color: 'var(--text)',
                    margin: 0,
                    fontWeight: 400,
                  }}
                >
                  See it answer{' '}
                  <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
                    your
                  </span>{' '}
                  lead.
                </h1>

                <p style={{ fontSize: 17, color: 'var(--text-2)', lineHeight: 1.55, margin: 0, maxWidth: 480 }}>
                  Twenty minutes, no slides. We&apos;ll plug your market into a sandbox and let you watch the AI handle a real inbound lead end-to-end.
                </p>

                {/* Proof strip */}
                <div
                  style={{
                    display: 'flex',
                    gap: 0,
                    padding: '20px 0',
                    borderTop: '1px solid var(--border)',
                    borderBottom: '1px solid var(--border)',
                    marginTop: 8,
                  }}
                >
                  {PROOF.map((p, i) => (
                    <div
                      key={p.l}
                      style={{
                        flex: 1,
                        textAlign: 'center',
                        borderRight: i < PROOF.length - 1 ? '1px solid var(--border)' : 'none',
                      }}
                    >
                      <div
                        className="serif"
                        style={{
                          fontSize: 28,
                          color: 'var(--accent)',
                          lineHeight: 1,
                          marginBottom: 6,
                          fontWeight: 400,
                        }}
                      >
                        {p.v}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: 'var(--text-4)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.10em',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        {p.l}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Agenda */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
                  <div className="eyebrow" style={{ color: 'var(--text-3)' }}>What we&apos;ll cover</div>
                  {AGENDA.map(item => (
                    <div key={item.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                      <span
                        className="serif"
                        style={{
                          fontSize: 18,
                          color: 'var(--text-4)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontWeight: 500,
                          marginTop: 1,
                          minWidth: 28,
                        }}
                      >
                        {item.num}
                      </span>
                      <div>
                        <div style={{ fontSize: 14.5, fontWeight: 600, color: 'var(--text)' }}>{item.t}</div>
                        <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4, lineHeight: 1.55 }}>{item.d}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* RIGHT: booking card */}
            <Reveal delay={1}>
              <div
                style={{
                  background: 'linear-gradient(180deg, var(--bg-2), var(--bg))',
                  border: '1px solid var(--border-light)',
                  borderRadius: 20,
                  padding: 28,
                  boxShadow: 'var(--shadow-lg)',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Halo */}
                <div
                  style={{
                    position: 'absolute',
                    top: -100,
                    right: -100,
                    width: 280,
                    height: 280,
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(232,255,71,0.12), transparent 70%)',
                    filter: 'blur(30px)',
                    pointerEvents: 'none',
                  }}
                />

                <div style={{ position: 'relative' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <Icon name="calendar" size={16} stroke={2} style={{ color: 'var(--accent)' }} />
                    <span className="eyebrow" style={{ color: 'var(--accent)' }}>Pick a time</span>
                  </div>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: '4px 0 8px',
                      letterSpacing: '-0.01em',
                    }}
                  >
                    20-minute setup walkthrough
                  </h2>
                  <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 24px', lineHeight: 1.55 }}>
                    Times available in your timezone. Most teams ship the same day.
                  </p>

                  {/* Live Cal.com embed when configured; direct-link fallback otherwise */}
                  <CalEmbed
                    fallback={
                      <div
                        style={{
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          borderRadius: 14,
                          padding: 32,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 16,
                          textAlign: 'center',
                        }}
                      >
                        <Icon name="calendar" size={28} stroke={1.6} style={{ color: 'var(--accent)', opacity: 0.8 }} />
                        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0, lineHeight: 1.6, maxWidth: 320 }}>
                          Pick a time that works for you — no forms, no friction. You&apos;ll get a calendar invite instantly.
                        </p>
                        <a
                          href={CAL_LINK ? `https://cal.com/${CAL_LINK}` : 'https://cal.com'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn-primary"
                          style={{ textDecoration: 'none' }}
                        >
                          <Icon name="calendar" size={14} stroke={2} />
                          Schedule on Cal.com
                          <Icon name="arrow-right" size={14} stroke={2.2} />
                        </a>
                        <p
                          style={{
                            fontSize: 11,
                            color: 'var(--text-4)',
                            margin: 0,
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.04em',
                          }}
                        >
                          opens in a new tab · no account needed
                        </p>
                      </div>
                    }
                  />
                </div>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

      <Footer />

      <style>{`
        @media (max-width: 880px) { .book-grid { grid-template-columns: 1fr !important; gap: 48px !important; } }
      `}</style>
    </main>
  );
}
