'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, MessageSquare, Users, Calendar, BarChart2,
  GitBranch, UserCog, Plug, Settings,
} from 'lucide-react';
import { Avatar, Badge } from '@conversionops/ui';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

const cn = (...i: Parameters<typeof clsx>) => twMerge(clsx(i));

const NAV_ITEMS = [
  { href: '/',              icon: LayoutDashboard, label: 'Overview',      roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/conversations', icon: MessageSquare,   label: 'Conversations', roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/leads',         icon: Users,           label: 'Leads',         roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/appointments',  icon: Calendar,        label: 'Appointments',  roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/analytics',     icon: BarChart2,       label: 'Analytics',     roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
  { href: '/routing',       icon: GitBranch,       label: 'Routing',       roles: ['OWNER','ADMIN'] },
  { href: '/agents',        icon: UserCog,         label: 'Agents',        roles: ['OWNER','ADMIN'] },
  { href: '/integrations',  icon: Plug,            label: 'Integrations',  roles: ['OWNER','ADMIN'] },
  { href: '/settings/workspace', icon: Settings,  label: 'Settings',      roles: ['OWNER','ADMIN','AGENT','VIEWER'] },
];

export default function Sidebar({ role = 'OWNER', workspaceName = 'My Workspace', plan = 'SOLO' }: {
  role?: string;
  workspaceName?: string;
  plan?: string;
}) {
  const pathname = usePathname();

  const planVariant = plan === 'ENTERPRISE' ? 'accent' : plan === 'BROKERAGE' ? 'info' : 'neutral';

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-[240px] flex flex-col z-40" style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}>
      {/* Logo */}
      <div className="px-5 h-[64px] flex items-center shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
        <span className="font-display text-[20px]" style={{ color: 'var(--text)' }}>
          Conversion<span style={{ color: 'var(--accent)' }}>Ops</span>
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV_ITEMS.filter(item => item.roles.includes(role)).map(item => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg mb-0.5 text-sm font-medium transition-colors duration-150',
                isActive
                  ? 'text-[var(--accent)] bg-[var(--accent-dim)] border-l-2 border-[var(--accent)] -ml-px pl-[11px]'
                  : 'text-[var(--text-2)] hover:text-[var(--text)] hover:bg-[var(--bg-4)]',
              )}
            >
              <Icon size={16} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom workspace info */}
      <div className="px-3 pb-4 pt-3 shrink-0" style={{ borderTop: '1px solid var(--border)' }}>
        <div className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-[var(--bg-3)] cursor-pointer transition-colors">
          <Avatar name={workspaceName} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{workspaceName}</p>
            <Badge variant={planVariant as 'neutral' | 'info' | 'accent'} size="sm">{plan}</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
