'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Icon } from '@/components/Icon';

const ITEMS = [
  { href: '/settings/workspace',     icon: 'building' as const, label: 'Workspace',       desc: 'Name, timezone, AI controls' },
  { href: '/settings/ai',            icon: 'bot' as const,      label: 'AI configuration', desc: 'Persona, tone, instructions' },
  { href: '/settings/notifications', icon: 'bell' as const,     label: 'Notifications',    desc: 'Email and SMS alerts' },
  { href: '/settings/billing',       icon: 'star' as const,     label: 'Billing & usage',  desc: 'Plan, tokens, invoices' },
];

export function SettingsNav() {
  const pathname = usePathname();
  return (
    <aside
      style={{
        flex: '0 0 240px',
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        position: 'sticky',
        top: 96,
        alignSelf: 'flex-start',
      }}
    >
      <div className="eyebrow" style={{ color: 'var(--text-4)', padding: '0 10px 8px' }}>
        Settings
      </div>
      {ITEMS.map(item => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 9,
              background: active ? 'rgba(232,255,71,0.06)' : 'transparent',
              border: '1px solid',
              borderColor: active ? 'rgba(232,255,71,0.18)' : 'transparent',
              color: active ? 'var(--text)' : 'var(--text-2)',
              textDecoration: 'none',
              transition: 'all 0.2s',
              position: 'relative',
            }}
            onMouseEnter={e => {
              if (!active) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                e.currentTarget.style.color = 'var(--text)';
              }
            }}
            onMouseLeave={e => {
              if (!active) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-2)';
              }
            }}
          >
            <Icon
              name={item.icon}
              size={14}
              stroke={1.8}
              style={{ color: active ? 'var(--accent)' : 'var(--text-3)', marginTop: 1, flexShrink: 0 }}
            />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500 }}>{item.label}</div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2 }}>{item.desc}</div>
            </div>
          </Link>
        );
      })}
    </aside>
  );
}
