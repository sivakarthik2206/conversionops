'use client';
import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Bell, ChevronDown, Settings, LogOut, User } from 'lucide-react';
import { Avatar, Badge } from '@conversionops/ui';

const PAGE_TITLES: Record<string, string> = {
  '/':                    'Overview',
  '/conversations':       'Conversations',
  '/leads':               'Leads',
  '/appointments':        'Appointments',
  '/analytics':           'Analytics',
  '/routing':             'Routing Rules',
  '/agents':              'Agents',
  '/integrations':        'Integrations',
  '/settings/workspace':  'Workspace Settings',
  '/settings/ai':         'AI Configuration',
  '/settings/billing':    'Billing',
};

export default function Topbar({ userName = '', aiPaused = false, aiQuotaWarning = false }: {
  userName?: string;
  aiPaused?: boolean;
  aiQuotaWarning?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const pageTitle = PAGE_TITLES[pathname] ?? PAGE_TITLES[Object.keys(PAGE_TITLES).find(k => k !== '/' && pathname.startsWith(k)) ?? '/'] ?? 'ConversionOps';

  const aiStatus = aiPaused ? 'paused' : aiQuotaWarning ? 'warning' : 'active';
  const aiDotColor = aiStatus === 'active' ? 'var(--green)' : aiStatus === 'warning' ? 'var(--amber)' : 'var(--red)';
  const aiLabel = aiStatus === 'active' ? 'AI Active' : aiStatus === 'warning' ? 'Quota Warning' : 'AI Paused';

  const signOut = () => {
    localStorage.removeItem('auth_token');
    router.push('/login');
  };

  return (
    <header className="fixed top-0 left-[240px] right-0 h-[64px] flex items-center justify-between px-6 z-50"
      style={{ backdropFilter: 'blur(20px)', background: 'rgba(0,0,0,0.4)', borderBottom: '1px solid var(--border)' }}>
      <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{pageTitle}</h1>

      <div className="flex items-center gap-4">
        {/* AI status */}
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ background: aiDotColor, boxShadow: `0 0 6px ${aiDotColor}` }} />
          <span className="text-xs font-medium hidden sm:block" style={{ color: aiStatus === 'active' ? 'var(--green)' : aiStatus === 'warning' ? 'var(--amber)' : 'var(--red)' }}>
            {aiLabel}
          </span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-[var(--bg-3)] transition-colors" style={{ color: 'var(--text-2)' }}>
          <Bell size={18} />
        </button>

        {/* User dropdown */}
        <div className="relative">
          <button onClick={() => setDropdownOpen(o => !o)} className="flex items-center gap-2 p-1 rounded-lg hover:bg-[var(--bg-3)] transition-colors">
            <Avatar name={userName} size="sm" />
            <ChevronDown size={14} style={{ color: 'var(--text-3)' }} />
          </button>
          {dropdownOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setDropdownOpen(false)} />
              <div className="absolute right-0 top-full mt-2 w-48 rounded-[10px] py-1 z-20"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-md)' }}>
                <div className="px-3 py-2 text-xs font-medium border-b" style={{ color: 'var(--text-3)', borderColor: 'var(--border)' }}>
                  {userName || 'Account'}
                </div>
                {[
                  { icon: User, label: 'Profile', href: '/settings/workspace' },
                  { icon: Settings, label: 'Settings', href: '/settings/workspace' },
                ].map(item => (
                  <button key={item.label} onClick={() => { router.push(item.href); setDropdownOpen(false); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-4)] transition-colors"
                    style={{ color: 'var(--text)' }}>
                    <item.icon size={14} style={{ color: 'var(--text-3)' }} />
                    {item.label}
                  </button>
                ))}
                <div className="h-px mx-3 my-1" style={{ background: 'var(--border)' }} />
                <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-[var(--bg-4)] transition-colors" style={{ color: 'var(--red)' }}>
                  <LogOut size={14} />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
