import Navbar from '@/components/layout/Navbar';
import Hero from '@/components/sections/Hero';
import PainPoints from '@/components/sections/PainPoints';
import LiveDemo from '@/components/sections/LiveDemo';
import Features from '@/components/sections/Features';
import Pricing from '@/components/sections/Pricing';
import Footer from '@/components/layout/Footer';

export default function HomePage() {
  return (
    <main style={{ background: 'var(--bg)' }}>
      <Navbar />
      <Hero />
      <PainPoints />
      <LiveDemo />
      <Features />
      <Pricing />

      {/* CTA section */}
      <section
        style={{
          padding: '96px 24px',
          textAlign: 'center',
          background: 'radial-gradient(ellipse 70% 50% at 50% 50%, rgba(232,255,71,0.05) 0%, transparent 70%)',
          borderTop: '1px solid var(--border)',
        }}
      >
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 'clamp(32px, 5vw, 52px)',
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            color: 'var(--text)',
            margin: '0 0 16px',
          }}
        >
          Start converting leads today
        </h2>
        <p
          style={{
            fontSize: 17,
            color: 'var(--text-2)',
            marginBottom: 32,
            maxWidth: 440,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          Setup takes 10 minutes. No contract. Your AI is live the same day.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/demo"
            style={{
              height: 52,
              padding: '0 28px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#000',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: 'var(--shadow-accent)',
            }}
          >
            See it live
          </a>
          <a
            href="/pricing"
            style={{
              height: 52,
              padding: '0 28px',
              borderRadius: 10,
              background: 'transparent',
              color: 'var(--text-2)',
              fontSize: 15,
              fontWeight: 500,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              border: '1px solid var(--border-light)',
            }}
          >
            View pricing
          </a>
        </div>
      </section>

      <Footer />
    </main>
  );
}
