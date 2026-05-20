import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'ConversionOps Admin',
  description: 'Internal ops console for ConversionOps',
};

const NAV_LINKS = [
  { href: '/',                      label: 'Home' },
  { href: '/ops/health',            label: 'Health' },
  { href: '/ops/queues',            label: 'Queues' },
  { href: '/ops/dead-letters',      label: 'Dead Letters' },
  { href: '/ops/ai-debug',          label: 'AI Debug' },
  { href: '/ops/ai-debug/evals',    label: 'Evals' },
  { href: '/workspaces',            label: 'Workspaces' },
] as const;

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <nav style={{
          background: 'var(--bg-2)',
          borderBottom: '1px solid var(--border)',
          padding: '0 24px',
          height: 52,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}>
          <span style={{ fontWeight: 700, color: 'var(--accent)', marginRight: 8 }}>
            ConversionOps Admin
          </span>
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{ color: 'var(--text-2)', fontSize: 13, textDecoration: 'none' }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <main style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
