import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t py-12" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
      <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
        <Link href="/" className="font-display text-lg" style={{ color: 'var(--text)' }}>
          Conversion<span style={{ color: 'var(--accent)' }}>Ops</span>
        </Link>
        <nav className="flex flex-wrap justify-center gap-6">
          {[
            { href: '#features', label: 'Features' },
            { href: '#pricing', label: 'Pricing' },
            { href: '/legal/privacy', label: 'Privacy' },
            { href: '/legal/terms', label: 'Terms' },
          ].map(item => (
            <Link key={item.href} href={item.href} className="text-sm transition-colors hover:text-[var(--text)]" style={{ color: 'var(--text-3)' }}>
              {item.label}
            </Link>
          ))}
        </nav>
        <p className="text-xs" style={{ color: 'var(--text-4)' }}>© 2025 ConversionOps. All rights reserved.</p>
      </div>
    </footer>
  );
}
