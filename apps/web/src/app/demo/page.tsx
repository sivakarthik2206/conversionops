import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import LiveDemo from '@/components/sections/LiveDemo';
import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

export const metadata = {
  title: 'Live Demo — ConversionOps',
  description: 'See the AI respond to a real lead in real time. No signup required.',
};

export default function DemoPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Hero */}
      <section
        style={{
          paddingTop: 'clamp(140px, 18vw, 200px)',
          paddingBottom: 'clamp(48px, 6vw, 80px)',
          position: 'relative',
          overflow: 'hidden',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '70%',
            height: '70%',
            background: 'radial-gradient(ellipse, rgba(77,255,165,0.08) 0%, transparent 65%)',
            filter: 'blur(70px)',
            pointerEvents: 'none',
          }}
        />
        <div className="container-page" style={{ position: 'relative', maxWidth: 900 }}>
          <Reveal>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 100,
                border: '1px solid rgba(77,255,165,0.30)',
                background: 'rgba(77,255,165,0.08)',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--green)',
                textTransform: 'uppercase',
                letterSpacing: '0.10em',
                marginBottom: 24,
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
                }}
              />
              Live · no signup required
            </div>
          </Reveal>

          <Reveal delay={1}>
            <h1
              className="serif"
              style={{
                fontSize: 'clamp(40px, 6.5vw, 80px)',
                lineHeight: 1.0,
                letterSpacing: '-0.03em',
                color: 'var(--text)',
                margin: '0 0 20px',
                fontWeight: 400,
              }}
            >
              This is the actual AI.{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif", display: 'inline-block' }}>
                Not a recording.
              </span>
            </h1>
          </Reveal>

          <Reveal delay={2}>
            <p style={{ fontSize: 18, color: 'var(--text-2)', maxWidth: 560, margin: '0 auto', lineHeight: 1.55 }}>
              Watch ConversionOps respond to an inbound Zillow lead in under 60 seconds &mdash; qualifying, scoring, and booking an appointment automatically.
            </p>
          </Reveal>
        </div>
      </section>

      <LiveDemo />

      {/* Bottom CTA */}
      <section
        style={{
          padding: 'clamp(64px, 10vw, 120px) 0',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(232,255,71,0.07) 0%, transparent 70%)',
            pointerEvents: 'none',
          }}
        />
        <div className="container-page" style={{ position: 'relative' }}>
          <Reveal>
            <h2 className="serif t-display" style={{ color: 'var(--text)', margin: '0 0 16px', fontWeight: 400, maxWidth: 700, marginLeft: 'auto', marginRight: 'auto' }}>
              Ready to{' '}
              <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
                go live?
              </span>
            </h2>
          </Reveal>
          <Reveal delay={1}>
            <p style={{ fontSize: 17, color: 'var(--text-2)', margin: '0 0 32px', maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
              Setup takes 10 minutes. First lead response in 60 seconds.
            </p>
          </Reveal>
          <Reveal delay={2}>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <a href="/book" className="btn-primary">
                Schedule
                <Icon name="arrow-right" size={14} stroke={2.2} />
              </a>
              <a href="/pricing" className="btn-ghost">
                View pricing
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <Footer />
    </main>
  );
}
