'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { Icon } from '@/components/Icon';

type IconName = Parameters<typeof Icon>[0]['name'];

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
}

const PRIMARY: NavItem[] = [
  { href: '/',                   icon: 'home',     label: 'Overview' },
  { href: '/ops/health',         icon: 'activity', label: 'Health' },
  { href: '/ops/queues',         icon: 'queue',    label: 'Queues' },
  { href: '/ops/dead-letters',   icon: 'inbox',    label: 'Dead letters' },
];

const AI_NAV: NavItem[] = [
  { href: '/ops/ai-debug',       icon: 'flask',    label: 'AI playground' },
  { href: '/ops/ai-debug/evals', icon: 'sliders',  label: 'Eval browser' },
  { href: '/ops/workflow-trace', icon: 'layers',   label: 'Workflow trace' },
];

const RESOURCES: NavItem[] = [
  { href: '/workspaces',         icon: 'building', label: 'Workspaces' },
];

export function AdminShell({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 240, minWidth: 0 }}>
        <Topbar />
        <main style={{ paddingTop: 64, minHeight: '100vh' }}>
          <div style={{ padding: '32px 32px 64px', maxWidth: 1440, margin: '0 auto' }}>
            {children}
          </div>
        </main>
      </div>
      <div className="grain" />
    </div>
  );
}

function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 240,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        background: 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
            color: '#0a0a0b',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 16px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
            flexShrink: 0,
          }}
        >
          <Icon name="logo-mark" size={16} stroke={2} />
        </span>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "'DM Serif Display', Georgia, serif",
              fontStyle: 'italic',
              fontSize: 17,
              color: 'var(--text)',
              letterSpacing: '-0.015em',
              lineHeight: 1,
            }}
          >
            ConversionOps
          </div>
          <div
            style={{
              fontSize: 9,
              color: 'var(--accent)',
              fontFamily: "'JetBrains Mono', monospace",
              textTransform: 'uppercase',
              letterSpacing: '0.14em',
              marginTop: 4,
            }}
          >
            Admin · Ops
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '4px 10px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <NavGroup label="Platform" items={PRIMARY} />
        <NavGroup label="AI" items={AI_NAV} />
        <NavGroup label="Resources" items={RESOURCES} />
      </nav>

      {/* Footer */}
      <div
        style={{
          padding: '12px 14px',
          margin: '0 8px 10px',
          borderRadius: 10,
          background: 'rgba(255,92,92,0.06)',
          border: '1px solid rgba(255,92,92,0.16)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <Icon name="shield" size={12} stroke={1.8} style={{ color: 'var(--red)', flexShrink: 0 }} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--red)' }}>Internal only</div>
          <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 1 }}>VPN / IP allowlist</div>
        </div>
      </div>
    </aside>
  );
}

function NavGroup({ label, items }: { label: string; items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div>
      <div className="eyebrow" style={{ color: 'var(--text-4)', padding: '4px 10px 6px', fontSize: 9.5 }}>
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {items.map(item => {
          const isActive =
            pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: 'none',
                color: isActive ? 'var(--text)' : 'var(--text-2)',
                background: isActive ? 'rgba(232,255,71,0.08)' : 'transparent',
                border: '1px solid',
                borderColor: isActive ? 'rgba(232,255,71,0.18)' : 'transparent',
                transition: 'all 0.2s var(--ease-soft)',
              }}
            >
              {isActive && (
                <span
                  style={{
                    position: 'absolute',
                    left: -10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 3,
                    height: 18,
                    background: 'var(--accent)',
                    borderRadius: '0 2px 2px 0',
                    boxShadow: '0 0 12px var(--accent)',
                  }}
                />
              )}
              <Icon
                name={item.icon}
                size={14}
                stroke={1.7}
                style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)' }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function Topbar() {
  const pathname = usePathname();

  const META: Record<string, { title: string; eyebrow: string }> = {
    '/':                       { title: 'Operations console',  eyebrow: 'Overview' },
    '/ops/health':             { title: 'Platform health',      eyebrow: 'Status' },
    '/ops/queues':             { title: 'Queue inspector',      eyebrow: 'BullMQ' },
    '/ops/dead-letters':       { title: 'Dead letters',         eyebrow: 'Failures' },
    '/ops/ai-debug':           { title: 'AI playground',        eyebrow: 'Prompt testing' },
    '/ops/ai-debug/evals':     { title: 'AI eval browser',      eyebrow: 'Quality' },
    '/ops/workflow-trace':     { title: 'Workflow trace',       eyebrow: 'Debug' },
    '/workspaces':             { title: 'Workspaces',           eyebrow: 'Tenants' },
  };

  const meta =
    META[pathname] ??
    META[Object.keys(META).find(k => k !== '/' && pathname.startsWith(k)) ?? '/'] ??
    { title: 'Admin', eyebrow: '' };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 240,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 32px',
        zIndex: 30,
        background: 'rgba(7,7,10,0.65)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {meta.eyebrow && (
          <span className="eyebrow" style={{ color: 'var(--text-4)', fontSize: 9 }}>{meta.eyebrow}</span>
        )}
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
          {meta.title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 100,
            background: 'rgba(77,255,165,0.10)',
            border: '1px solid rgba(77,255,165,0.22)',
            fontSize: 11,
            fontWeight: 600,
            color: 'var(--green)',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <span style={{ position: 'relative', width: 6, height: 6 }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: 'var(--green)',
                animation: 'pulseRing 2s ease-out infinite',
                opacity: 0.5,
              }}
            />
            <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          </span>
          ALL SYSTEMS UP
        </div>
      </div>
    </header>
  );
}
