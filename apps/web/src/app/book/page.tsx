import React from 'react';

export const metadata = {
  title: 'Book a Demo — ConversionOps',
  description: 'Schedule a personalized demo of ConversionOps AI lead conversion.',
};

export default function BookPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 16px' }}>
      <div style={{ maxWidth: 600, width: '100%', textAlign: 'center', marginBottom: 40 }}>
        <p style={{ color: 'var(--accent)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>
          Book a Demo
        </p>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontStyle: 'italic', fontSize: 40, color: 'var(--text)', margin: '0 0 16px' }}>
          See ConversionOps in action
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 16, lineHeight: 1.6 }}>
          We&apos;ll walk you through a live setup tailored to your market, team size, and lead sources.
          Most teams go live within 48 hours.
        </p>
      </div>

      {/* Cal.com embed placeholder */}
      <div
        style={{
          width: '100%',
          maxWidth: 700,
          minHeight: 600,
          background: 'var(--bg-2)',
          borderRadius: 16,
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ color: 'var(--text-3)', marginBottom: 16 }}>
            Booking calendar loads here.
          </p>
          <a
            href="mailto:hello@conversionops.io?subject=Demo Request"
            style={{
              display: 'inline-block',
              background: 'var(--accent)',
              color: 'var(--bg)',
              padding: '12px 24px',
              borderRadius: 8,
              fontWeight: 600,
              fontSize: 14,
              textDecoration: 'none',
            }}
          >
            Email us to book a demo →
          </a>
        </div>
      </div>
    </div>
  );
}
