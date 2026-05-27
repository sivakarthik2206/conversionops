'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

const NAV_LINKS = [
  { href: '/#features', label: 'Platform' },
  { href: '/#demo', label: 'Live demo' },
  { href: '/pricing', label: 'Pricing' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 24);
    handler();
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <header
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 100,
          padding: scrolled ? '10px 16px' : '16px 16px',
          transition: 'padding 0.4s var(--ease-out-quart)',
          pointerEvents: 'none',
        }}
      >
        <nav
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            height: scrolled ? 56 : 64,
            padding: '0 20px 0 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderRadius: 100,
            background: scrolled
              ? 'rgba(11, 11, 14, 0.72)'
              : 'rgba(11, 11, 14, 0.35)',
            backdropFilter: 'blur(24px) saturate(160%)',
            WebkitBackdropFilter: 'blur(24px) saturate(160%)',
            border: '1px solid',
            borderColor: scrolled ? 'var(--border-light)' : 'var(--border)',
            boxShadow: scrolled ? 'var(--shadow-md)' : 'none',
            transition: 'all 0.4s var(--ease-out-quart)',
            pointerEvents: 'auto',
          }}
        >
          {/* Logo lockup */}
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
                width: 28,
                height: 28,
                borderRadius: 8,
                background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#0a0a0b',
                boxShadow: '0 6px 16px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              <Icon name="logo-mark" size={16} stroke={2} />
            </span>
            <span
              style={{
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 19,
                letterSpacing: '-0.015em',
              }}
            >
              ConversionOps
            </span>
          </Link>

          {/* Desktop links */}
          <div
            className="hidden-mobile"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              background: 'rgba(255,255,255,0.025)',
              padding: '4px 6px',
              borderRadius: 100,
              border: '1px solid var(--border)',
            }}
          >
            {NAV_LINKS.map(item => (
              <a
                key={item.href}
                href={item.href}
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'var(--text-2)',
                  textDecoration: 'none',
                  padding: '7px 14px',
                  borderRadius: 100,
                  transition: 'color 0.2s, background 0.2s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = 'var(--text)';
                  el.style.background = 'rgba(255,255,255,0.04)';
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLAnchorElement;
                  el.style.color = 'var(--text-2)';
                  el.style.background = 'transparent';
                }}
              >
                {item.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden-mobile" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link
              href="https://app.conversionops.in/login"
              style={{
                fontSize: 13,
                fontWeight: 500,
                color: 'var(--text-3)',
                textDecoration: 'none',
                padding: '8px 10px',
                transition: 'color 0.2s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-3)'; }}
            >
              Sign in
            </Link>
            <a
              href="https://calendar.app.google/qJw5n9evBZ8ciiuV9"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                height: 36,
                padding: '0 16px',
                fontSize: 13,
                fontWeight: 600,
                borderRadius: 100,
                background: 'linear-gradient(180deg, var(--accent-soft), var(--accent) 60%, var(--accent-2))',
                color: '#0a0a0b',
                textDecoration: 'none',
                border: '1px solid rgba(0,0,0,0.15)',
                boxShadow: '0 4px 14px rgba(232,255,71,0.25), inset 0 1px 0 rgba(255,255,255,0.45)',
                transition: 'transform 0.2s var(--ease-out-quart), box-shadow 0.2s',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translateY(-1px)';
                el.style.boxShadow = '0 8px 24px rgba(232,255,71,0.40), inset 0 1px 0 rgba(255,255,255,0.50)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLAnchorElement;
                el.style.transform = 'translateY(0)';
                el.style.boxShadow = '0 4px 14px rgba(232,255,71,0.25), inset 0 1px 0 rgba(255,255,255,0.45)';
              }}
            >
              Schedule
              <Icon name="arrow-right" size={14} stroke={2} />
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={menuOpen}
            className="show-mobile"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--border-light)',
              cursor: 'pointer',
              padding: 0,
              width: 38,
              height: 38,
              borderRadius: '50%',
              color: 'var(--text)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <span
              style={{
                display: 'block',
                width: 16,
                height: 1.5,
                background: 'currentColor',
                borderRadius: 1,
                transition: 'all 0.3s var(--ease-out-quart)',
                transform: menuOpen ? 'translateY(2.7px) rotate(45deg)' : 'none',
              }}
            />
            <span
              style={{
                display: 'block',
                width: 16,
                height: 1.5,
                background: 'currentColor',
                borderRadius: 1,
                transition: 'all 0.3s var(--ease-out-quart)',
                transform: menuOpen ? 'translateY(-2.8px) rotate(-45deg)' : 'none',
              }}
            />
          </button>
        </nav>
      </header>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="show-mobile animate-fade-in"
          style={{
            position: 'fixed',
            inset: 0,
            top: 80,
            zIndex: 99,
            background: 'rgba(7,7,10,0.96)',
            backdropFilter: 'blur(24px)',
            padding: '32px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {NAV_LINKS.map((item, i) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="animate-fade-up"
              style={{
                animationDelay: `${i * 60}ms`,
                fontFamily: "'DM Serif Display', Georgia, serif",
                fontStyle: 'italic',
                fontSize: 28,
                color: 'var(--text)',
                textDecoration: 'none',
                padding: '14px 0',
                borderBottom: '1px solid var(--border)',
                letterSpacing: '-0.02em',
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="https://app.conversionops.in/login"
            onClick={() => setMenuOpen(false)}
            className="animate-fade-up"
            style={{
              animationDelay: '200ms',
              fontSize: 15,
              color: 'var(--text-2)',
              textDecoration: 'none',
              padding: '14px 0',
              borderBottom: '1px solid var(--border)',
            }}
          >
            Sign in
          </Link>
          <a
            href="https://calendar.app.google/qJw5n9evBZ8ciiuV9"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMenuOpen(false)}
            className="btn-primary animate-fade-up"
            style={{
              animationDelay: '260ms',
              marginTop: 24,
              width: '100%',
              justifyContent: 'center',
              height: 56,
              fontSize: 16,
            }}
          >
            Schedule
            <Icon name="arrow-right" size={16} stroke={2} />
          </a>
        </div>
      )}

      <style>{`
        @media (min-width: 880px) { .show-mobile { display: none !important; } }
        @media (max-width: 879px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </>
  );
}
