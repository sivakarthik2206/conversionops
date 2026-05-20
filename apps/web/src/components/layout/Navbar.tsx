'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/demo', label: 'Demo' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 100);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 60,
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        background: scrolled ? 'rgba(10,10,11,0.95)' : 'rgba(10,10,11,0.6)',
        borderBottom: `1px solid ${scrolled ? 'var(--border)' : 'transparent'}`,
        transition: 'background 0.3s ease, border-color 0.3s ease',
      }}
    >
      <nav
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 20,
            color: 'var(--text)',
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 3,
            letterSpacing: '-0.01em',
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
              marginLeft: 2,
              boxShadow: '0 0 8px var(--accent)',
            }}
          />
        </Link>

        {/* Desktop nav links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 32,
          }}
          className="hidden-mobile"
        >
          {NAV_LINKS.map(item => (
            <a
              key={item.href}
              href={item.href}
              style={{
                fontSize: 14,
                color: 'var(--text-2)',
                textDecoration: 'none',
                transition: 'color 0.15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-2)'; }}
            >
              {item.label}
            </a>
          ))}
        </div>

        {/* Desktop CTA */}
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 16 }}
          className="hidden-mobile"
        >
          <Link
            href="https://app.conversionops.in/login"
            style={{
              fontSize: 14,
              color: 'var(--text-3)',
              textDecoration: 'none',
              transition: 'color 0.15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--text-3)'; }}
          >
            Sign in
          </Link>
          <Link
            href="/book"
            style={{
              height: 36,
              padding: '0 18px',
              fontSize: 14,
              fontWeight: 600,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#000',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              transition: 'background 0.15s, transform 0.15s',
            }}
            onMouseEnter={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = 'var(--accent-hover)';
              el.style.transform = 'scale(1.02)';
            }}
            onMouseLeave={e => {
              const el = e.currentTarget as HTMLAnchorElement;
              el.style.background = 'var(--accent)';
              el.style.transform = 'scale(1)';
            }}
          >
            Get Started
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen(o => !o)}
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          className="show-mobile"
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            color: 'var(--text-2)',
            display: 'flex',
            flexDirection: 'column',
            gap: 5,
          }}
        >
          <span
            style={{
              display: 'block',
              width: 20,
              height: 1.5,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: menuOpen ? 'translateY(6.5px) rotate(45deg)' : 'none',
            }}
          />
          <span
            style={{
              display: 'block',
              width: 20,
              height: 1.5,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'opacity 0.2s',
              opacity: menuOpen ? 0 : 1,
            }}
          />
          <span
            style={{
              display: 'block',
              width: 20,
              height: 1.5,
              background: 'currentColor',
              borderRadius: 1,
              transition: 'transform 0.2s, opacity 0.2s',
              transform: menuOpen ? 'translateY(-6.5px) rotate(-45deg)' : 'none',
            }}
          />
        </button>
      </nav>

      {/* Mobile drawer */}
      {menuOpen && (
        <div
          className="animate-slide-down"
          style={{
            borderTop: '1px solid var(--border)',
            background: 'rgba(10,10,11,0.97)',
            padding: '16px 24px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 4,
          }}
        >
          {NAV_LINKS.map(item => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              style={{
                fontSize: 16,
                color: 'var(--text-2)',
                textDecoration: 'none',
                padding: '12px 0',
                borderBottom: '1px solid var(--border)',
              }}
            >
              {item.label}
            </a>
          ))}
          <Link
            href="/book"
            onClick={() => setMenuOpen(false)}
            style={{
              marginTop: 16,
              height: 44,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#000',
              fontWeight: 600,
              fontSize: 15,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            Get Started
          </Link>
        </div>
      )}

      <style>{`
        @media (min-width: 768px) { .show-mobile { display: none !important; } }
        @media (max-width: 767px) { .hidden-mobile { display: none !important; } }
      `}</style>
    </header>
  );
}
