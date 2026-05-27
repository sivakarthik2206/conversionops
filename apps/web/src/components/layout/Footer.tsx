'use client';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

const COLUMNS = [
  {
    title: 'Product',
    items: [
      { label: 'Features',    href: '/#features' },
      { label: 'Live demo',   href: '/#demo' },
      { label: 'Pricing',     href: '/pricing' },
      { label: 'Book a demo', href: '/book' },
    ],
  },
  {
    title: 'Company',
    items: [
      { label: 'Book a demo',  href: '/book' },
      { label: 'Contact us',   href: '/book' },
      { label: 'Sign in',      href: 'https://app.conversionops.in/login' },
    ],
  },
  {
    title: 'Legal',
    items: [
      { label: 'Privacy Policy',   href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'TCPA Compliance',  href: '/legal/privacy#tcpa' },
      { label: 'Fair Housing',     href: '/legal/privacy#fair-housing' },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Watermark wordmark */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          bottom: -32,
          transform: 'translateX(-50%)',
          fontFamily: "'DM Serif Display', Georgia, serif",
          fontStyle: 'italic',
          fontSize: 'clamp(120px, 18vw, 240px)',
          fontWeight: 400,
          letterSpacing: '-0.04em',
          lineHeight: 0.9,
          color: 'transparent',
          WebkitTextStroke: '1px rgba(255,255,255,0.04)',
          pointerEvents: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        ConversionOps
      </div>

      <div className="container-page" style={{ position: 'relative', paddingTop: 80, paddingBottom: 200 }}>
        {/* Top section */}
        <div
          className="footer-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 64,
          }}
        >
          {/* Brand column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <Link
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'var(--text)',
                textDecoration: 'none',
              }}
            >
              <span
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#0a0a0b',
                  boxShadow: '0 8px 20px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
                }}
              >
                <Icon name="logo-mark" size={18} stroke={2} />
              </span>
              <span
                style={{
                  fontFamily: "'DM Serif Display', Georgia, serif",
                  fontStyle: 'italic',
                  fontSize: 22,
                  letterSpacing: '-0.015em',
                }}
              >
                ConversionOps
              </span>
            </Link>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-3)',
                lineHeight: 1.65,
                maxWidth: 320,
                margin: 0,
              }}
            >
              The operating system for real estate conversion. Every lead answered. Every deal captured. Every market.
            </p>

            {/* Social */}
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {[
                { label: 'X / Twitter', href: 'https://x.com/conversionops' },
                { label: 'LinkedIn',    href: 'https://linkedin.com/company/conversionops' },
                { label: 'GitHub',      href: 'https://github.com/conversionops' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-3)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none',
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'all 0.2s var(--ease-soft)',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.color = 'var(--text)';
                    el.style.borderColor = 'var(--border-strong)';
                    el.style.background = 'var(--accent-dim)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.color = 'var(--text-3)';
                    el.style.borderColor = 'var(--border)';
                    el.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {s.label[0]}
                </a>
              ))}
            </div>

            {/* Status pill */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 12px',
                borderRadius: 100,
                background: 'rgba(77,255,165,0.08)',
                border: '1px solid rgba(77,255,165,0.20)',
                fontSize: 12,
                color: 'var(--green)',
                alignSelf: 'flex-start',
                fontFamily: "'JetBrains Mono', monospace",
                marginTop: 8,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulseDot 2s ease-in-out infinite' }} />
              All systems operational
            </div>
          </div>

          {/* Link columns */}
          {COLUMNS.map(col => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div className="eyebrow" style={{ color: 'var(--text-2)', marginBottom: 4 }}>{col.title}</div>
              {col.items.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    fontSize: 14,
                    color: 'var(--text-3)',
                    textDecoration: 'none',
                    transition: 'color 0.2s, transform 0.2s var(--ease-out-quart)',
                    display: 'inline-block',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget;
                    el.style.color = 'var(--text)';
                    el.style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget;
                    el.style.color = 'var(--text-3)';
                    el.style.transform = 'translateX(0)';
                  }}
                >
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div
          style={{
            paddingTop: 28,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
              © 2026 ConversionOps, Inc. &middot; Built for real estate.
            </p>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: 'var(--text-5)' }} />
            <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
              Made with care in Hyderabad &amp; Miami.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <a
              href="mailto:hello@conversionops.in"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                fontSize: 12,
                color: 'var(--text-3)',
                textDecoration: 'none',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              <Icon name="mail" size={12} stroke={1.6} />
              hello@conversionops.in
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 880px) { .footer-grid { grid-template-columns: 1fr 1fr !important; } }
        @media (max-width: 520px) { .footer-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </footer>
  );
}
