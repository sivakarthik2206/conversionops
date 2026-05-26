'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  status: string;
  score: number;
  tier: string;
}

interface Conversation {
  id: string;
  status: string;
  aiActive: boolean;
  lead: { id: string; name: string | null; phone: string | null };
}

interface SearchResults {
  leads: Lead[];
  conversations: Conversation[];
}

type ResultItem =
  | { kind: 'lead'; id: string; label: string; sub: string; href: string; icon: string; color: string }
  | { kind: 'conversation'; id: string; label: string; sub: string; href: string; icon: string; color: string }
  | { kind: 'nav'; id: string; label: string; sub: string; href: string; icon: string; color: string };

const NAV_SHORTCUTS: ResultItem[] = [
  { kind: 'nav', id: 'nav-/', label: 'Overview', sub: 'Dashboard home', href: '/', icon: 'home', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-conv', label: 'Conversations', sub: 'Inbox', href: '/conversations', icon: 'message', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-leads', label: 'Leads', sub: 'Pipeline', href: '/leads', icon: 'users', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-appt', label: 'Appointments', sub: 'Calendar', href: '/appointments', icon: 'calendar', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-analytics', label: 'Analytics', sub: 'Performance', href: '/analytics', icon: 'chart', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-notif', label: 'Notifications', sub: 'Alerts & events', href: '/notifications', icon: 'bell', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-routing', label: 'Routing', sub: 'Assignment rules', href: '/routing', icon: 'route', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-agents', label: 'Agents', sub: 'Team management', href: '/agents', icon: 'agent', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-queue', label: 'Queue Inspector', sub: 'Job queue health', href: '/queue', icon: 'cpu', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-audit', label: 'Audit Log', sub: 'Activity trail', href: '/audit-log', icon: 'shield', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-ai', label: 'AI Playground', sub: 'Test prompts', href: '/ai-playground', icon: 'bot', color: 'var(--text-3)' },
  { kind: 'nav', id: 'nav-settings', label: 'Settings', sub: 'Workspace config', href: '/settings/workspace', icon: 'settings', color: 'var(--text-3)' },
];

const TIER_COLORS: Record<string, string> = {
  PRIORITY: 'var(--red)',
  HOT: 'var(--amber)',
  WARM: 'var(--green)',
  COLD: 'var(--blue)',
};

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const { data, isFetching } = useQuery<SearchResults>({
    queryKey: ['cmd-search', query],
    queryFn: () =>
      Promise.all([
        query.length >= 2
          ? apiClient.get<{ leads: Lead[] }>('/leads', { search: query, limit: 5 })
          : Promise.resolve({ leads: [] }),
        query.length >= 2
          ? apiClient.get<{ conversations: Conversation[] }>('/conversations', { search: query, limit: 5 })
          : Promise.resolve({ conversations: [] }),
      ]).then(([l, c]) => ({ leads: l.leads ?? [], conversations: c.conversations ?? [] })),
    enabled: open,
  });

  // Build result list
  const items: ResultItem[] = (() => {
    if (!query) return NAV_SHORTCUTS;

    const results: ResultItem[] = [];

    (data?.leads ?? []).forEach(l =>
      results.push({
        kind: 'lead',
        id: l.id,
        label: l.name ?? `Lead · ${l.id.slice(-6)}`,
        sub: `${l.status.replace(/_/g, ' ')} · score ${l.score}`,
        href: `/leads/${l.id}`,
        icon: 'users',
        color: TIER_COLORS[l.tier] ?? 'var(--text-3)',
      }),
    );

    (data?.conversations ?? []).forEach(c =>
      results.push({
        kind: 'conversation',
        id: c.id,
        label: c.lead?.name ?? `Conversation · ${c.id.slice(-6)}`,
        sub: `${c.status.replace(/_/g, ' ')} · ${c.aiActive ? 'AI active' : 'Human'}`,
        href: `/conversations/${c.id}`,
        icon: 'message',
        color: c.aiActive ? 'var(--purple)' : 'var(--text-3)',
      }),
    );

    // Nav shortcuts that match
    NAV_SHORTCUTS.filter(n => n.label.toLowerCase().includes(query.toLowerCase()) || n.sub.toLowerCase().includes(query.toLowerCase())).forEach(n => results.push(n));

    return results;
  })();

  const safeIndex = Math.min(activeIndex, Math.max(items.length - 1, 0));

  const navigate = useCallback((item: ResultItem) => {
    router.push(item.href);
    onClose();
    setQuery('');
    setActiveIndex(0);
  }, [router, onClose]);

  // Reset on open
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [open]);

  // Keyboard navigation
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex(i => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex(i => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[safeIndex];
        if (item) navigate(item);
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, items, safeIndex, navigate, onClose]);

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-index="${safeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [safeIndex]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 500,
              background: 'rgba(0,0,0,0.60)',
              backdropFilter: 'blur(4px)',
            }}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: 'fixed',
              top: '18vh',
              left: '50%',
              transform: 'translateX(-50%)',
              width: '100%',
              maxWidth: 600,
              zIndex: 510,
              background: 'linear-gradient(180deg, var(--bg-3) 0%, var(--bg-2) 100%)',
              border: '1px solid var(--border-light)',
              borderRadius: 16,
              boxShadow: '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)',
              overflow: 'hidden',
            }}
          >
            {/* Search input */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '14px 16px',
              borderBottom: '1px solid var(--border)',
            }}>
              {isFetching ? (
                <Icon name="loader" size={16} stroke={2} style={{ color: 'var(--text-3)', animation: 'spin 0.8s linear infinite', flexShrink: 0 }} />
              ) : (
                <Icon name="search" size={16} stroke={1.8} style={{ color: 'var(--text-3)', flexShrink: 0 }} />
              )}
              <input
                ref={inputRef}
                value={query}
                onChange={e => { setQuery(e.target.value); setActiveIndex(0); }}
                placeholder="Search leads, conversations, pages…"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 15,
                  color: 'var(--text)',
                  caretColor: 'var(--accent)',
                }}
              />
              <kbd style={{
                padding: '3px 7px',
                background: 'var(--bg-4)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                fontSize: 10,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text-4)',
                letterSpacing: '0.04em',
                flexShrink: 0,
              }}>
                ESC
              </kbd>
            </div>

            {/* Results */}
            <div
              ref={listRef}
              style={{ maxHeight: 380, overflowY: 'auto', padding: 6 }}
            >
              {items.length === 0 && query.length >= 2 ? (
                <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-4)', fontSize: 13 }}>
                  No results for &ldquo;{query}&rdquo;
                </div>
              ) : (
                <>
                  {!query && (
                    <div className="eyebrow" style={{ padding: '6px 10px 4px', color: 'var(--text-4)', fontSize: 9.5 }}>
                      Navigation
                    </div>
                  )}
                  {query && data && (data.leads.length > 0 || data.conversations.length > 0) && (
                    <>
                      {data.leads.length > 0 && (
                        <div className="eyebrow" style={{ padding: '6px 10px 4px', color: 'var(--text-4)', fontSize: 9.5 }}>
                          Leads
                        </div>
                      )}
                    </>
                  )}
                  {items.map((item, idx) => {
                    const isActive = idx === safeIndex;
                    // Insert section header for conversations
                    const prevKind = idx > 0 ? items[idx - 1]?.kind : undefined;
                    const showHeader = query && item.kind !== prevKind && (item.kind === 'conversation' || (item.kind === 'nav' && idx > 0));

                    return (
                      <div key={item.id}>
                        {showHeader && (
                          <div className="eyebrow" style={{ padding: '8px 10px 4px', color: 'var(--text-4)', fontSize: 9.5 }}>
                            {item.kind === 'conversation' ? 'Conversations' : 'Pages'}
                          </div>
                        )}
                        <button
                          data-index={idx}
                          onClick={() => navigate(item)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 12,
                            width: '100%',
                            padding: '9px 10px',
                            borderRadius: 10,
                            background: isActive ? 'rgba(255,255,255,0.06)' : 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'background 0.1s',
                          }}
                        >
                          <div style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: isActive ? 'rgba(232,255,71,0.10)' : 'var(--bg-4)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Icon
                              name={item.icon as never}
                              size={13}
                              stroke={1.8}
                              style={{ color: isActive ? 'var(--accent)' : item.color }}
                            />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: isActive ? 'var(--text)' : 'var(--text-2)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {item.label}
                            </div>
                            <div style={{
                              fontSize: 11,
                              color: 'var(--text-4)',
                              marginTop: 1,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}>
                              {item.sub}
                            </div>
                          </div>
                          {isActive && (
                            <kbd style={{
                              padding: '2px 6px',
                              background: 'var(--bg-4)',
                              border: '1px solid var(--border)',
                              borderRadius: 5,
                              fontSize: 9,
                              fontFamily: "'JetBrains Mono', monospace",
                              color: 'var(--text-4)',
                              flexShrink: 0,
                            }}>
                              ↵
                            </kbd>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            {/* Footer */}
            <div style={{
              padding: '8px 14px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              fontSize: 10,
              color: 'var(--text-4)',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              <span><kbd style={{ padding: '1px 5px', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 4, marginRight: 4 }}>↑↓</kbd>navigate</span>
              <span><kbd style={{ padding: '1px 5px', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 4, marginRight: 4 }}>↵</kbd>open</span>
              <span><kbd style={{ padding: '1px 5px', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 4, marginRight: 4 }}>esc</kbd>close</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
