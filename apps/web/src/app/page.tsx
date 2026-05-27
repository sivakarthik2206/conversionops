import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/sections/Hero';
import PainPoints from '@/components/sections/PainPoints';
import LiveDemo from '@/components/sections/LiveDemo';
import Features from '@/components/sections/Features';
import Testimonials from '@/components/sections/Testimonials';
import Pricing from '@/components/sections/Pricing';
import Footer from '@/components/layout/Footer';
import { Reveal } from '@/components/Reveal';
import { Icon } from '@/components/Icon';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg)', position: 'relative', overflow: 'hidden' }}>
      <Navbar />
      <Hero />
      <PainPoints />
      <LiveDemo />
      <Features />
      <Testimonials />
      <Pricing />
      <FinalCTA />
      <Footer />
    </main>
  );
}

function FinalCTA() {
  return (
    <section
      style={{
        padding: 'clamp(80px, 14vw, 180px) 0',
        background: 'var(--bg)',
        position: 'relative',
        overflow: 'hidden',
        textAlign: 'center',
      }}
    >
      {/* Massive accent glow */}
      <div
        style={{
          position: 'absolute',
          top: '40%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85%',
          height: '120%',
          background: 'radial-gradient(ellipse at center, rgba(232,255,71,0.10) 0%, transparent 60%)',
          filter: 'blur(60px)',
          pointerEvents: 'none',
        }}
      />
      {/* Grid texture */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
          maskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, black 0%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 50% at 50% 50%, black 0%, transparent 75%)',
          pointerEvents: 'none',
        }}
      />

      <div className="container-page" style={{ position: 'relative' }}>
        <Reveal>
          <div
            className="chip"
            style={{
              display: 'inline-flex',
              marginBottom: 28,
              borderColor: 'var(--accent-glow)',
              background: 'rgba(232,255,71,0.06)',
            }}
          >
            <Icon name="sparkle" size={12} stroke={2.2} style={{ color: 'var(--accent)' }} />
            <span style={{ color: 'var(--accent)' }}>Ready when you are</span>
          </div>
        </Reveal>

        <Reveal delay={1}>
          <h2
            className="serif t-display"
            style={{
              color: 'var(--text)',
              margin: '0 auto 24px',
              fontWeight: 400,
              maxWidth: 880,
            }}
          >
            Start converting{' '}
            <span style={{ fontStyle: 'italic', color: 'var(--accent)', fontFamily: "'Instrument Serif', serif" }}>
              tonight.
            </span>
          </h2>
        </Reveal>

        <Reveal delay={2}>
          <p
            style={{
              fontSize: 'clamp(16px, 1.4vw, 19px)',
              color: 'var(--text-2)',
              lineHeight: 1.55,
              maxWidth: 540,
              margin: '0 auto 36px',
            }}
          >
            Ten-minute setup. No contract. Your AI agent is live, qualifying leads, and booking appointments the same day.
          </p>
        </Reveal>

        <Reveal delay={3}>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="https://calendar.app.google/qJw5n9evBZ8ciiuV9" target="_blank" rel="noopener noreferrer" className="btn-primary">
              Schedule
              <Icon name="arrow-right" size={16} stroke={2.2} />
            </a>
            <a href="/pricing" className="btn-ghost">
              View pricing
            </a>
          </div>
        </Reveal>

        {/* Stat ribbon */}
        <Reveal delay={4}>
          <div
            style={{
              marginTop: 64,
              display: 'flex',
              justifyContent: 'center',
              gap: 56,
              flexWrap: 'wrap',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {[
              { v: '00:47', l: 'avg first response' },
              { v: '+312%', l: 'contact rate' },
              { v: '$47k',  l: 'leak per agent / yr' },
              { v: '24/7',  l: 'always answering' },
            ].map(s => (
              <div key={s.l} style={{ textAlign: 'center' }}>
                <div
                  className="serif"
                  style={{
                    fontSize: 28,
                    lineHeight: 1,
                    color: 'var(--accent)',
                    fontWeight: 400,
                    marginBottom: 6,
                    textShadow: '0 0 24px rgba(232,255,71,0.25)',
                  }}
                >
                  {s.v}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-4)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
