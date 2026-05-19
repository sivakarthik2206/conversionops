'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { clsx } from 'clsx';

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <header
      className={clsx('fixed top-0 left-0 right-0 z-50 transition-all duration-200', scrolled && 'border-b')}
      style={{
        backdropFilter: 'blur(20px)',
        background: 'rgba(10,10,11,0.8)',
        borderColor: scrolled ? 'var(--border)' : 'transparent',
      }}
    >
      <nav className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="font-display text-xl" style={{ color: 'var(--text)' }}>
          Conversion<span style={{ color: 'var(--accent)' }}>Ops</span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { href: '#features', label: 'Features' },
            { href: '#demo', label: 'Demo' },
            { href: '#pricing', label: 'Pricing' },
          ].map(item => (
            <a key={item.href} href={item.href} className="text-sm transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-2)' }}>
              {item.label}
            </a>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          <Link href="https://app.conversionops.io/login" className="text-sm transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-2)' }}>
            Sign in
          </Link>
          <Link href="/demo"
            className="h-9 px-4 text-sm font-medium rounded-lg inline-flex items-center transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent-hover)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--accent)'; }}>
            Get started ?
          </Link>
        </div>

        <button className="md:hidden p-2" onClick={() => setMenuOpen(o => !o)} style={{ color: 'var(--text-2)' }} aria-label="Toggle menu">
          <div className="space-y-1.5">
            <span className="block w-5 h-px" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-px" style={{ background: 'currentColor' }} />
            <span className="block w-5 h-px" style={{ background: 'currentColor' }} />
          </div>
        </button>
      </nav>

      {menuOpen && (
        <div className="md:hidden px-6 pb-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)' }}>
          <a href="#features" onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Features</a>
          <a href="#demo" onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Demo</a>
          <a href="#pricing" onClick={() => setMenuOpen(false)} className="text-sm py-2" style={{ color: 'var(--text-2)' }}>Pricing</a>
          <Link href="/demo" className="text-sm py-2 font-medium" style={{ color: 'var(--accent)' }}>Get started ?</Link>
        </div>
      )}
    </header>
  );
}
