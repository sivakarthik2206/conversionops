'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Skeleton, EmptyState, Badge, StatusBadge } from '@conversionops/ui';
import { useConversations } from '@/hooks/useConversations';
import { Icon } from '@/components/Icon';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

const FILTERS = [
  { id: 'all',    label: 'All',          color: 'var(--text-2)' },
  { id: 'ai',     label: 'AI handling',  color: 'var(--purple)' },
  { id: 'human',  label: 'Human',        color: 'var(--amber)' },
  { id: 'queued', label: 'Awaiting',     color: 'var(--blue)' },
];

export default function ConversationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'ai' | 'human' | 'queued'>('all');
  const { conversations, isLoading } = useConversations();

  const filtered = conversations.filter(c => {
    if (search && !c.leadId.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'ai' && !c.aiActive) return false;
    if (filter === 'human' && c.aiActive) return false;
    return true;
  });

  return (
    <div
      style={{
        display: 'flex',
        height: 'calc(100vh - 130px)',
        margin: '-32px -32px 0',
        overflow: 'hidden',
        borderTop: '1px solid var(--border)',
      }}
    >
      {/* LIST PANEL */}
      <div
        style={{
          width: 380,
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-2)',
          borderRight: '1px solid var(--border)',
        }}
      >
        {/* Search + filters */}
        <div style={{ padding: 14, borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} stroke={1.8} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{
                width: '100%',
                height: 34,
                paddingLeft: 32,
                paddingRight: 12,
                fontSize: 13,
                borderRadius: 8,
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                color: 'var(--text)',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>

          <div style={{ display: 'flex', gap: 4, padding: 2, background: 'var(--bg-3)', borderRadius: 8, border: '1px solid var(--border)' }}>
            {FILTERS.map(f => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id as typeof filter)}
                style={{
                  flex: 1,
                  height: 26,
                  borderRadius: 6,
                  background: filter === f.id ? 'var(--bg-2)' : 'transparent',
                  border: '1px solid',
                  borderColor: filter === f.id ? 'var(--border-light)' : 'transparent',
                  color: filter === f.id ? f.color : 'var(--text-3)',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s',
                  fontFamily: "'JetBrains Mono', monospace",
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 14px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <Skeleton variant="circle" width={32} height={32} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" style={{ marginBottom: 6 }} />
                  <Skeleton variant="text" width="70%" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                illustration={<Icon name="inbox" size={32} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
                title="No conversations"
                description={search ? 'No matches for your search.' : 'Leads will appear here when they reply.'}
              />
            </div>
          ) : (
            filtered.map(conv => (
              <button
                key={conv.id}
                onClick={() => router.push(`/conversations/${conv.id}`)}
                style={{
                  width: '100%',
                  padding: '14px 14px',
                  textAlign: 'left',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--border)',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: conv.aiActive
                      ? 'linear-gradient(135deg, var(--purple) 0%, #7c5fff 100%)'
                      : 'linear-gradient(135deg, var(--amber) 0%, #ff9747 100%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0a0a0b',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={conv.aiActive ? 'bot' : 'user'} size={14} stroke={2} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: 'var(--text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      Lead · {conv.leadId.slice(-8)}
                    </span>
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-4)', flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                      {timeAgo(conv.updatedAt)}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Badge variant={conv.aiActive ? 'ai' : 'warning'} size="sm">
                      {conv.aiActive ? 'AI' : 'Human'}
                    </Badge>
                    <StatusBadge status={conv.status} />
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* EMPTY DETAIL PANEL */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          background: 'var(--bg)',
          padding: 32,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-3)',
            position: 'relative',
          }}
        >
          <Icon name="message" size={28} stroke={1.5} />
          <div
            style={{
              position: 'absolute',
              inset: -1,
              borderRadius: 16,
              border: '1px solid var(--accent-glow)',
              opacity: 0.3,
              filter: 'blur(8px)',
              pointerEvents: 'none',
            }}
          />
        </div>
        <div style={{ textAlign: 'center' }}>
          <h3
            className="serif"
            style={{ fontSize: 24, color: 'var(--text)', margin: '0 0 6px', fontWeight: 400, fontStyle: 'italic', fontFamily: "'Instrument Serif', serif" }}
          >
            Pick a conversation
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0 }}>
            Select a thread on the left to view full history.
          </p>
        </div>
      </div>
    </div>
  );
}
