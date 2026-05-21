'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Avatar } from '@conversionops/ui';
import { Icon } from '@/components/Icon';

const PAGE_META: Record<string, { title: string; eyebrow?: string }> = {
  '/':                       { title: 'Overview',           eyebrow: 'Dashboard' },
  '/conversations':          { title: 'Conversations',       eyebrow: 'Inbox' },
  '/leads':                  { title: 'Leads',               eyebrow: 'Pipeline' },
  '/appointments':           { title: 'Appointments',        eyebrow: 'Calendar' },
  '/analytics':              { title: 'Analytics',           eyebrow: 'Performance' },
  '/routing':                { title: 'Routing Rules',       eyebrow: 'Operations' },
  '/agents':                 { title: 'Agents',              eyebrow: 'Team' },
  '/integrations':           { title: 'Integrations',        eyebrow: 'Connections' },
  '/settings/workspace':     { title: 'Workspace',           eyebrow: 'Settings' },
  '/settings/ai':            { title: 'AI Configuration',    eyebrow: 'Settings' },
  '/settings/billing':       { title: 'Billing & Usage',     eyebrow: 'Settings' },
  '/settings/notifications': { title: 'Notifications',       eyebrow: 'Settings' },
};

interface Props {
  userName?: string;
  aiPaused?: boolean;
  aiQuotaWarning?: boolean;
}

export default function Topbar({ userName = '', aiPaused = false, aiQuotaWarning = false }: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }));
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, []);

  const meta =
    PAGE_META[pathname] ??
    PAGE_META[Object.keys(PAGE_META).find(k => k !== '/' && pathname.startsWith(k)) ?? '/'] ??
    { title: 'ConversionOps' };

  const aiStatus = aiPaused ? 'paused' : aiQuotaWarning ? 'warning' : 'active';
  const aiTone =
    aiStatus === 'active' ? { color: 'var(--green)',  bg: 'rgba(77,255,165,0.10)',  border: 'rgba(77,255,165,0.22)' } :
    aiStatus === 'warning'? { color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)',  border: 'rgba(255,181,71,0.22)' } :
                            { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)',   border: 'rgba(255,92,92,0.22)' };
  const aiLabel = aiStatus === 'active' ? 'AI Active' : aiStatus === 'warning' ? 'Quota warning' : 'AI Paused';

  const signOut = () => {
    if (typeof window !== 'undefined') localStorage.removeItem('auth_token');
    router.push('/login');
  };

  return (
    <header
      style={{
        position: 'fixed',
        top: 0,
        left: 248,
        right: 0,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        zIndex: 30,
        background: 'rgba(7, 7, 10, 0.65)',
        backdropFilter: 'blur(20px) saturate(150%)',
        WebkitBackdropFilter: 'blur(20px) saturate(150%)',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {meta.eyebrow && (
          <span className="eyebrow" style={{ color: 'var(--text-4)', fontSize: 9 }}>
            {meta.eyebrow}
          </span>
        )}
        <h1 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
          {meta.title}
        </h1>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* Local time */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 11,
            color: 'var(--text-4)',
            fontFamily: "'JetBrains Mono', monospace",
            padding: '0 8px',
          }}
        >
          <Icon name="clock" size={11} stroke={1.6} />
          {now}
        </div>

        <span style={{ width: 1, height: 16, background: 'var(--border)' }} />

        {/* AI status */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px 4px 8px',
            borderRadius: 100,
            background: aiTone.bg,
            border: `1px solid ${aiTone.border}`,
            fontSize: 11,
            fontWeight: 600,
            color: aiTone.color,
          }}
        >
          <span style={{ position: 'relative', width: 6, height: 6 }}>
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: aiTone.color,
                animation: aiStatus === 'active' ? 'pulseRing 2s ease-out infinite' : 'none',
                opacity: 0.5,
              }}
            />
            <span
              style={{
                position: 'absolute',
                inset: 0,
                borderRadius: '50%',
                background: aiTone.color,
                boxShadow: `0 0 6px ${aiTone.color}`,
              }}
            />
          </span>
          {aiLabel}
        </div>

        {/* Notifications */}
        <button
          aria-label="Notifications"
          style={{
            position: 'relative',
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.025)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <Icon name="bell" size={14} />
          <span
            style={{
              position: 'absolute',
              top: 8,
              right: 8,
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: 'var(--accent)',
              boxShadow: '0 0 6px var(--accent), 0 0 0 2px var(--bg)',
            }}
          />
        </button>

        {/* User dropdown */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setOpen(o => !o)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 8px 4px 4px',
              borderRadius: 100,
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid var(--border)',
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <Avatar name={userName || 'U'} size="sm" />
            <Icon name="chevron-down" size={12} style={{ color: 'var(--text-3)' }} />
          </button>

          {open && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 50 }}
                onClick={() => setOpen(false)}
              />
              <div
                className="animate-slide-down"
                style={{
                  position: 'absolute',
                  top: 'calc(100% + 8px)',
                  right: 0,
                  width: 220,
                  background: 'linear-gradient(180deg, var(--bg-3), var(--bg-2))',
                  border: '1px solid var(--border-light)',
                  borderRadius: 12,
                  boxShadow: 'var(--shadow-lg)',
                  padding: 6,
                  zIndex: 60,
                }}
              >
                <div
                  style={{
                    padding: '10px 12px 12px',
                    borderBottom: '1px solid var(--border)',
                    marginBottom: 4,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{userName || 'Your account'}</div>
                  <div className="eyebrow" style={{ color: 'var(--text-4)', marginTop: 2 }}>signed in</div>
                </div>
                {[
                  { icon: 'user' as const, label: 'Profile',  href: '/settings/workspace' },
                  { icon: 'settings' as const, label: 'Settings', href: '/settings/workspace' },
                  { icon: 'bell' as const, label: 'Notifications', href: '/settings/notifications' },
                ].map(item => (
                  <button
                    key={item.label}
                    onClick={() => { router.push(item.href); setOpen(false); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 8,
                      background: 'transparent',
                      border: 'none',
                      fontSize: 13,
                      color: 'var(--text-2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--text)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-2)'; }}
                  >
                    <Icon name={item.icon} size={13} stroke={1.6} style={{ color: 'var(--text-3)' }} />
                    {item.label}
                  </button>
                ))}
                <div style={{ height: 1, background: 'var(--border)', margin: '6px 4px' }} />
                <button
                  onClick={signOut}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    width: '100%',
                    padding: '8px 10px',
                    borderRadius: 8,
                    background: 'transparent',
                    border: 'none',
                    fontSize: 13,
                    color: 'var(--red)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,92,92,0.08)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Icon name="logout" size={13} stroke={1.6} />
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
