import Navbar from '@/components/layout/Navbar';
import LiveDemo from '@/components/sections/LiveDemo';

export const metadata = {
  title: 'Live Demo — ConversionOps',
  description: 'See the AI respond to a real lead in real time. No signup required.',
};

export default function DemoPage() {
  return (
    <main style={{ background: 'var(--bg)', minHeight: '100vh' }}>
      <Navbar />

      {/* Page header */}
      <div
        style={{
          maxWidth: 900,
          margin: '0 auto',
          padding: '120px 24px 0',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '5px 14px',
            borderRadius: 100,
            border: '1px solid rgba(71,255,142,0.3)',
            background: 'var(--green-dim)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--green)',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 32,
          }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--green)',
              animation: 'pulseDot 2s ease-in-out infinite',
            }}
          />
          No signup required
        </div>
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            lineHeight: 1.1,
            letterSpacing: '-0.025em',
            color: 'var(--text)',
            margin: '0 0 16px',
          }}
        >
          This is the actual AI.
          <br />
          Not a recording.
        </h1>
        <p
          style={{
            fontSize: 18,
            color: 'var(--text-2)',
            maxWidth: 520,
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: 1.6,
          }}
        >
          Watch ConversionOps respond to an inbound Zillow lead in under 60 seconds — qualifying, scoring, and booking an appointment automatically.
        </p>
      </div>

      {/* Demo section plays automatically */}
      <LiveDemo />

      {/* CTA footer */}
      <div
        style={{
          padding: '64px 24px 80px',
          textAlign: 'center',
          borderTop: '1px solid var(--border)',
          background: 'var(--bg-2)',
        }}
      >
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontSize: 36,
            color: 'var(--text)',
            margin: '0 0 12px',
            letterSpacing: '-0.02em',
          }}
        >
          Ready to go live?
        </h2>
        <p style={{ fontSize: 16, color: 'var(--text-2)', marginBottom: 28 }}>
          Setup takes 10 minutes. First lead response in 60 seconds.
        </p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a
            href="/pricing"
            style={{
              height: 48,
              padding: '0 28px',
              borderRadius: 10,
              background: 'var(--accent)',
              color: '#000',
              fontSize: 15,
              fontWeight: 600,
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
            }}
          >
            View pricing →
          </a>
          <a
            href="/book"
            style={{
              height: 48,
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
            Book a demo call
          </a>
        </div>
      </div>
    </main>
  );
}
