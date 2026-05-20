import Link from 'next/link';

const COLUMNS = [
  {
    title: null,
    isLogo: true,
    items: [],
  },
  {
    title: 'Product',
    isLogo: false,
    items: [
      { label: 'Features', href: '#features' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Demo', href: '/demo' },
      { label: 'Integrations', href: '#features' },
    ],
  },
  {
    title: 'Legal',
    isLogo: false,
    items: [
      { label: 'Privacy Policy', href: '/legal/privacy' },
      { label: 'Terms of Service', href: '/legal/terms' },
      { label: 'TCPA Compliance', href: '/legal/privacy#tcpa' },
    ],
  },
  {
    title: 'Contact',
    isLogo: false,
    items: [
      { label: 'hello@conversionops.in', href: 'mailto:hello@conversionops.in' },
      { label: 'Book a demo', href: '/book' },
    ],
  },
];

export default function Footer() {
  return (
    <footer
      style={{
        background: 'var(--bg-2)',
        borderTop: '1px solid var(--border)',
        padding: '64px 24px 32px',
      }}
    >
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* 4-column grid */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: 48,
            marginBottom: 48,
          }}
        >
          {/* Col 1: Logo + tagline + social */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <Link
              href="/"
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 22,
                color: 'var(--text)',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              ConversionOps
              <span
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: 'var(--accent)',
                  display: 'inline-block',
                  marginLeft: 3,
                }}
              />
            </Link>
            <p
              style={{
                fontSize: 14,
                color: 'var(--text-3)',
                lineHeight: 1.65,
                maxWidth: 280,
                margin: 0,
              }}
            >
              The operating system for real estate conversion. Every lead answered. Every deal captured.
            </p>
            {/* Social links */}
            <div style={{ display: 'flex', gap: 12, marginTop: 4 }}>
              {[
                { label: 'X', href: 'https://x.com/conversionops' },
                { label: 'LinkedIn', href: 'https://linkedin.com/company/conversionops' },
              ].map(s => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontSize: 12,
                    color: 'var(--text-4)',
                    textDecoration: 'none',
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1px solid var(--border)',
                    transition: 'color 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = 'var(--text-2)';
                    el.style.borderColor = 'var(--border-light)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLAnchorElement;
                    el.style.color = 'var(--text-4)';
                    el.style.borderColor = 'var(--border)';
                  }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {/* Cols 2-4 */}
          {COLUMNS.slice(1).map(col => (
            <div key={col.title} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: 'var(--text)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.08em',
                  marginBottom: 2,
                }}
              >
                {col.title}
              </div>
              {col.items.map(item => (
                <a
                  key={item.label}
                  href={item.href}
                  style={{
                    fontSize: 14,
                    color: 'var(--text-3)',
                    textDecoration: 'none',
                    transition: 'color 0.15s',
                    lineHeight: 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-3)'; }}
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
            borderTop: '1px solid var(--border)',
            paddingTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0 }}>
            © 2025 ConversionOps. Built for real estate agents who close deals.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { label: 'Privacy', href: '/legal/privacy' },
              { label: 'Terms', href: '/legal/terms' },
            ].map(item => (
              <Link
                key={item.href}
                href={item.href}
                style={{ fontSize: 12, color: 'var(--text-4)', textDecoration: 'none' }}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
