'use client';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

export function LegalShell({
  eyebrow,
  title,
  updated,
  sections,
}: {
  eyebrow: string;
  title: string;
  updated: string;
  sections: { id: string; title: string; body: string }[];
}) {
  return (
    <>
      {/* Header */}
      <section
        style={{
          paddingTop: 'clamp(140px, 18vw, 200px)',
          paddingBottom: 48,
          borderBottom: '1px solid var(--border)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '60%',
            height: '60%',
            background: 'radial-gradient(ellipse, rgba(232,255,71,0.04) 0%, transparent 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <div className="container-page" style={{ maxWidth: 880, position: 'relative' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: 13,
              color: 'var(--text-3)',
              textDecoration: 'none',
              marginBottom: 32,
              fontFamily: "'JetBrains Mono', monospace",
              transition: 'color 0.2s',
            }}
          >
            <Icon name="arrow-right" size={12} stroke={2} style={{ transform: 'rotate(180deg)' }} />
            Back home
          </Link>

          <span className="eyebrow" style={{ color: 'var(--accent)' }}>{eyebrow}</span>
          <h1
            className="serif"
            style={{
              fontSize: 'clamp(40px, 6vw, 64px)',
              lineHeight: 1.0,
              color: 'var(--text)',
              margin: '14px 0 14px',
              fontWeight: 400,
              letterSpacing: '-0.03em',
            }}
          >
            {title}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
            Last updated · {updated}
          </p>
        </div>
      </section>

      {/* TOC + body */}
      <section style={{ padding: '64px 0 96px' }}>
        <div className="container-page legal-grid" style={{ maxWidth: 1080, display: 'grid', gridTemplateColumns: '240px 1fr', gap: 64 }}>
          {/* TOC */}
          <aside
            className="legal-toc"
            style={{
              position: 'sticky',
              top: 100,
              alignSelf: 'flex-start',
              display: 'flex',
              flexDirection: 'column',
              gap: 6,
              maxHeight: 'calc(100vh - 120px)',
              overflowY: 'auto',
              paddingBottom: 16,
            }}
          >
            <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>
              Contents
            </div>
            {sections.map((s, i) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                style={{
                  fontSize: 13,
                  color: 'var(--text-3)',
                  textDecoration: 'none',
                  padding: '7px 10px',
                  borderRadius: 6,
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  lineHeight: 1.4,
                }}
              >
                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: 'var(--text-5)', minWidth: 18 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                {s.title}
              </a>
            ))}
          </aside>

          {/* Body */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>
            {sections.map((section, i) => (
              <article key={section.id} id={section.id}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, marginBottom: 14 }}>
                  <span
                    style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 11,
                      color: 'var(--text-4)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <h2
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: 'var(--text)',
                      margin: 0,
                      letterSpacing: '-0.015em',
                    }}
                  >
                    {section.title}
                  </h2>
                </div>
                <p
                  style={{
                    fontSize: 15.5,
                    color: 'var(--text-2)',
                    lineHeight: 1.75,
                    margin: 0,
                    fontFamily: "'DM Sans', sans-serif",
                  }}
                >
                  {section.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 880px) {
          .legal-grid { grid-template-columns: 1fr !important; gap: 32px !important; }
          .legal-toc { position: static !important; max-height: none !important; overflow: visible !important; }
        }
      `}</style>
    </>
  );
}
