'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Avatar, Badge } from '@conversionops/ui';
import { Icon } from '@/components/Icon';

type IconName = Parameters<typeof Icon>[0]['name'];

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
  roles: string[];
  badge?: string;
}

const NAV_PRIMARY: NavItem[] = [
  { href: '/',              icon: 'home',     label: 'Overview',      roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/conversations', icon: 'message',  label: 'Conversations', roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/leads',         icon: 'users',    label: 'Leads',         roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/appointments',  icon: 'calendar', label: 'Appointments',  roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/analytics',     icon: 'chart',    label: 'Analytics',     roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
];

const NAV_OPS: NavItem[] = [
  { href: '/routing',      icon: 'route',    label: 'Routing',      roles: ['OWNER','ADMIN'] },
  { href: '/agents',       icon: 'agent',    label: 'Agents',       roles: ['OWNER','ADMIN'] },
  { href: '/integrations', icon: 'plug',     label: 'Integrations', roles: ['OWNER','ADMIN'] },
];

const NAV_TOOLS: NavItem[] = [
  { href: '/notifications', icon: 'bell',    label: 'Notifications', roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/queue',         icon: 'cpu',     label: 'Queue',         roles: ['OWNER','ADMIN'] },
  { href: '/audit-log',     icon: 'shield',  label: 'Audit Log',     roles: ['OWNER','ADMIN'] },
  { href: '/ai-playground', icon: 'bot',     label: 'AI Playground', roles: ['OWNER','ADMIN'] },
];

const NAV_FOOTER: NavItem[] = [
  { href: '/settings/workspace', icon: 'settings', label: 'Settings', roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
];

interface SidebarProps {
  role?: string;
  workspaceName?: string;
  plan?: string;
  onSearchClick?: () => void;
}

export default function Sidebar({ role = 'OWNER', workspaceName = 'My Workspace', plan = 'SOLO', onSearchClick }: SidebarProps) {
  const pathname = usePathname();
  const planVariant = plan === 'ENTERPRISE' ? 'accent' : plan === 'BROKERAGE' ? 'info' : 'neutral';

  return (
    <aside
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        bottom: 0,
        width: 248,
        display: 'flex',
        flexDirection: 'column',
        zIndex: 40,
        background: 'linear-gradient(180deg, var(--bg-2) 0%, var(--bg) 100%)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-2) 100%)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#0a0a0b',
            boxShadow: '0 6px 16px rgba(232,255,71,0.30), inset 0 1px 0 rgba(255,255,255,0.45)',
            flexShrink: 0,
          }}
        >
          <Icon name="logo-mark" size={16} stroke={2} />
        </span>
        <span
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontStyle: 'italic',
            fontSize: 18,
            color: 'var(--text)',
            letterSpacing: '-0.015em',
          }}
        >
          ConversionOps
        </span>
      </div>

      {/* Search trigger */}
      <div style={{ padding: '0 12px 12px' }}>
        <button
          onClick={onSearchClick}
          style={{
            width: '100%',
            height: 32,
            padding: '0 10px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            borderRadius: 8,
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border)',
            color: 'var(--text-3)',
            fontSize: 12,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--border-light)';
            el.style.color = 'var(--text-2)';
          }}
          onMouseLeave={e => {
            const el = e.currentTarget;
            el.style.borderColor = 'var(--border)';
            el.style.color = 'var(--text-3)';
          }}
        >
          <Icon name="search" size={13} stroke={1.8} />
          <span style={{ flex: 1, textAlign: 'left' }}>Search</span>
          <kbd
            style={{
              padding: '2px 5px',
              background: 'var(--bg-4)',
              border: '1px solid var(--border)',
              borderRadius: 4,
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'var(--text-3)',
              lineHeight: 1,
            }}
          >
            ⌘K
          </kbd>
        </button>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: 'auto', padding: '0 10px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <NavGroup label="Workspace">
          {NAV_PRIMARY.filter(item => item.roles.includes(role)).map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>

        {NAV_OPS.some(item => item.roles.includes(role)) && (
          <NavGroup label="Operations">
            {NAV_OPS.filter(item => item.roles.includes(role)).map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </NavGroup>
        )}

        {NAV_TOOLS.some(item => item.roles.includes(role)) && (
          <NavGroup label="Tools">
            {NAV_TOOLS.filter(item => item.roles.includes(role)).map(item => (
              <NavLink key={item.href} item={item} pathname={pathname} />
            ))}
          </NavGroup>
        )}

        <div style={{ flex: 1 }} />

        <NavGroup label="Account">
          {NAV_FOOTER.map(item => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </NavGroup>
      </nav>

      {/* Workspace footer */}
      <div
        style={{
          padding: 10,
          margin: '0 8px 8px',
          borderRadius: 10,
          background: 'rgba(255,255,255,0.025)',
          border: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          cursor: 'pointer',
          transition: 'all 0.2s',
        }}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.05)';
          e.currentTarget.style.borderColor = 'var(--border-light)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
          e.currentTarget.style.borderColor = 'var(--border)';
        }}
      >
        <Avatar name={workspaceName} size="sm" />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {workspaceName}
          </div>
          <div style={{ marginTop: 2 }}>
            <Badge variant={planVariant as 'neutral' | 'info' | 'accent'} size="sm">{plan}</Badge>
          </div>
        </div>
        <Icon name="chevron-up" size={12} style={{ color: 'var(--text-4)' }} />
      </div>
    </aside>
  );
}

function NavGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="eyebrow"
        style={{
          padding: '4px 10px 6px',
          color: 'var(--text-4)',
          fontSize: 9.5,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {children}
      </div>
    </div>
  );
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
  return (
    <Link
      href={item.href}
      style={{
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
        position: 'relative',
      }}
      onMouseEnter={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
          e.currentTarget.style.color = 'var(--text)';
        }
      }}
      onMouseLeave={e => {
        if (!isActive) {
          e.currentTarget.style.background = 'transparent';
          e.currentTarget.style.color = 'var(--text-2)';
        }
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
        size={15}
        stroke={1.7}
        style={{ color: isActive ? 'var(--accent)' : 'var(--text-3)' }}
      />
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && (
        <Badge variant="accent" size="sm">{item.badge}</Badge>
      )}
    </Link>
  );
}
