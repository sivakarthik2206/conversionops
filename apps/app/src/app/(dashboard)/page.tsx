'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { MessageSquare, Clock } from 'lucide-react';
import { MetricCard, PageHeader, EmptyState, Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { useLeads } from '@/hooks/useLeads';
import { useConversations } from '@/hooks/useConversations';

interface WorkspaceHealth {
  totalLeads: number;
  qualifiedRate: number;
  appointmentsBooked: number;
  avgResponseMs: number;
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

export default function OverviewPage() {
  const { data: health, isLoading: healthLoading } = useQuery<WorkspaceHealth>({
    queryKey: ['workspace-health'],
    queryFn: () => apiClient.get('/workspaces/me/health'),
  });

  const { conversations, isLoading: convsLoading } = useConversations({ limit: 5 });
  const { leads } = useLeads({ limit: 50 });

  const tierCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.tier] = (acc[l.tier] ?? 0) + 1;
    return acc;
  }, {});

  const tierOrder = ['PRIORITY', 'HOT', 'WARM', 'COLD', 'UNQUALIFIED'];
  const tierColors: Record<string, string> = {
    PRIORITY: 'var(--accent)', HOT: 'var(--green)', WARM: 'var(--amber)',
    COLD: 'var(--blue)', UNQUALIFIED: 'var(--text-4)',
  };

  const metrics = [
    { label: 'Total Leads', value: health?.totalLeads ?? 0 },
    { label: 'Qualified Rate', value: `${(health?.qualifiedRate ?? 0).toFixed(1)}%` },
    { label: 'Appointments Booked', value: health?.appointmentsBooked ?? 0 },
    { label: 'Avg Response Time', value: health?.avgResponseMs ? `${(health.avgResponseMs / 1000).toFixed(1)}s` : '—' },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle="Your lead conversion dashboard" />

      {/* Metric cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {healthLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rect" height={120} />)
          : metrics.map((m, i) => (
              <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35, ease: [0.16,1,0.3,1] }}>
                <MetricCard label={m.label} value={m.value} />
              </motion.div>
            ))}
      </div>

      {/* Split: Conversations + Pipeline */}
      <div className="grid grid-cols-2 gap-6">
        {/* Recent Conversations */}
        <div className="rounded-[10px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text)' }}>
              <MessageSquare size={14} style={{ color: 'var(--text-3)' }} /> Recent Conversations
            </h2>
          </div>
          {convsLoading ? (
            <div className="p-4 flex flex-col gap-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rect" height={40} />)}</div>
          ) : conversations.length === 0 ? (
            <EmptyState title="No conversations yet" description="Conversations will appear when leads reply." />
          ) : (
            conversations.slice(0, 5).map(conv => (
              <div key={conv.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--bg-3)] transition-colors cursor-pointer" style={{ borderBottom: '1px solid var(--border)' }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: conv.aiActive ? 'var(--green)' : 'var(--amber)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{conv.leadId}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0" style={{ color: 'var(--text-3)' }}>
                  <Clock size={11} />
                  <span className="text-[11px]">{timeAgo(conv.updatedAt)}</span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Lead Pipeline */}
        <div className="rounded-[10px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Lead Pipeline</h2>
          </div>
          <div className="p-5 flex flex-col gap-4">
            {tierOrder.map(tier => {
              const count = tierCounts[tier] ?? 0;
              const total = leads.length || 1;
              return (
                <div key={tier}>
                  <div className="flex justify-between mb-1.5">
                    <span className="text-xs font-medium" style={{ color: 'var(--text-2)' }}>{tier}</span>
                    <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{count}</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: tierColors[tier] }}
                      initial={{ width: 0 }}
                      animate={{ width: `${(count / total) * 100}%` }}
                      transition={{ duration: 0.8, ease: [0.16,1,0.3,1] }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
