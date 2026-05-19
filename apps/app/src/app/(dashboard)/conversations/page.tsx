'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, MessageSquare } from 'lucide-react';
import { Input, Skeleton, EmptyState, Badge, StatusBadge } from '@conversionops/ui';
import { useConversations } from '@/hooks/useConversations';

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

export default function ConversationsPage() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const { conversations, isLoading } = useConversations();

  const filtered = conversations.filter(c =>
    !search || c.leadId.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="flex h-[calc(100vh-130px)] -mx-8 -mt-8 overflow-hidden rounded-[10px] border" style={{ borderColor: 'var(--border)' }}>
      {/* List panel */}
      <div className="w-[380px] shrink-0 flex flex-col" style={{ background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}>
        <div className="p-3" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-3)' }} />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none focus:ring-1"
              style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', caretColor: 'var(--accent)' }}
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="px-4 py-3 flex gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
                  <Skeleton variant="circle" width={32} height={32} />
                  <div className="flex-1"><Skeleton variant="text" className="mb-1.5" /><Skeleton variant="text" width="70%" /></div>
                </div>
              ))
            : filtered.length === 0
              ? <EmptyState title="No conversations" description="Leads will appear here when they reply." />
              : filtered.map(conv => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); router.push(`/conversations/${conv.id}`); }}
                    className="w-full text-left px-4 py-3 transition-colors border-b"
                    style={{
                      borderColor: 'var(--border)',
                      background: activeId === conv.id ? 'var(--accent-dim)' : 'transparent',
                    }}
                    onMouseEnter={e => { if (activeId !== conv.id) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-3)'; }}
                    onMouseLeave={e => { if (activeId !== conv.id) (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: conv.aiActive ? 'var(--green)' : 'var(--amber)' }} />
                      <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{conv.leadId.slice(-8)}</span>
                      <span className="text-[10px] ml-auto shrink-0" style={{ color: 'var(--text-3)' }}>{timeAgo(conv.updatedAt)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={conv.aiActive ? 'ai' : 'warning'} size="sm">{conv.aiActive ? 'AI' : 'Human'}</Badge>
                      <StatusBadge status={conv.status} />
                    </div>
                  </button>
                ))}
        </div>
      </div>

      {/* Right panel: empty state */}
      <div className="flex-1 flex items-center justify-center" style={{ background: 'var(--bg)' }}>
        <EmptyState
          illustration={<MessageSquare size={40} style={{ color: 'var(--text-4)' }} />}
          title="Select a conversation"
          description="Choose a conversation from the list to view the full thread."
        />
      </div>
    </div>
  );
}
