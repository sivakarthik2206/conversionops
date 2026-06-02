import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Book a Demo — ConversionOps',
  description: 'See ConversionOps respond to a live lead in real time. Book a 15-minute demo.',
};

export default function BookPage() {
  return (
    <main
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 24px',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: 40 }}>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(28px, 5vw, 48px)',
            fontWeight: 400,
            color: 'var(--text)',
            marginBottom: 12,
          }}
        >
          Book a{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--accent)' }}>Demo</span>
        </h1>
        <p style={{ fontSize: 16, color: 'var(--text-2)', maxWidth: 480, margin: '0 auto' }}>
          See ConversionOps respond to a live lead in real time. 15 minutes.
        </p>
      </div>

      <div
        style={{
          width: '100%',
          maxWidth: 900,
          borderRadius: 20,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          background: 'var(--bg-2)',
        }}
      >
        <iframe
          src="https://cal.com/siva-karthik-angarayan-olmzzm/conversionops-demo"
          width="100%"
          height="700"
          style={{ border: 'none', display: 'block' }}
          title="Book a ConversionOps Demo"
        />
      </div>
    </main>
  );
}
