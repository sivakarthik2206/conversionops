'use client';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { EmptyState, Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { useLeads } from '@/hooks/useLeads';
import { useConversations } from '@/hooks/useConversations';
import { Icon } from '@/components/Icon';
import { CountUp } from '@/components/CountUp';
import Link from 'next/link';

interface WorkspaceHealth {
  totalLeads: number;
  qualifiedRate: number;
  appointmentsBooked: number;
  avgResponseMs: number;
}

interface SystemHealth {
  status: 'healthy' | 'degraded' | 'down';
  services: { database: string; redis: string; vertexAi: string };
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return `${Math.floor(diff/86400000)}d ago`;
}

const TIER_ORDER = ['PRIORITY', 'HOT', 'WARM', 'COLD', 'UNQUALIFIED'] as const;
const TIER_META: Record<string, { color: string; icon: 'fire' | 'bolt' | 'target' | 'inbox' | 'minus'; label: string }> = {
  PRIORITY:    { color: 'var(--accent)', icon: 'bolt',   label: 'Priority' },
  HOT:         { color: 'var(--green)',  icon: 'fire',   label: 'Hot' },
  WARM:        { color: 'var(--amber)',  icon: 'target', label: 'Warm' },
  COLD:        { color: 'var(--blue)',   icon: 'inbox',  label: 'Cold' },
  UNQUALIFIED: { color: 'var(--text-4)', icon: 'minus',  label: 'Unqualified' },
};

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function OverviewPage() {
  const { data: health, isLoading: healthLoading } = useQuery<WorkspaceHealth>({
    queryKey: ['workspace-health'],
    queryFn: () => apiClient.get('/workspaces/me/health'),
  });

  const { data: systemHealth } = useQuery<SystemHealth>({
    queryKey: ['system-health'],
    queryFn: () => apiClient.get('/health'),
    refetchInterval: 30_000,
  });

  const { conversations, isLoading: convsLoading } = useConversations({ limit: 5 });
  const { leads } = useLeads({ limit: 50 });

  const tierCounts = leads.reduce<Record<string, number>>((acc, l) => {
    acc[l.tier] = (acc[l.tier] ?? 0) + 1;
    return acc;
  }, {});
  const totalLeads = leads.length || 1;

  const metrics: MetricCardProps[] = [
    {
      label: 'Total leads',
      value: health?.totalLeads ?? 0,
      icon: 'users',
      color: 'var(--accent)',
      trend: '+12%',
      trendPositive: true,
    },
    {
      label: 'Qualified rate',
      value: health?.qualifiedRate ?? 0,
      decimals: 1,
      suffix: '%',
      icon: 'target',
      color: 'var(--green)',
      trend: '+8%',
      trendPositive: true,
    },
    {
      label: 'Appointments',
      value: health?.appointmentsBooked ?? 0,
      icon: 'calendar',
      color: 'var(--purple)',
      trend: '+5',
      trendPositive: true,
    },
    {
      label: 'Avg response',
      value: health?.avgResponseMs ? health.avgResponseMs / 1000 : null,
      decimals: 1,
      suffix: 's',
      display: '—',
      icon: 'clock',
      color: 'var(--blue)',
      trend: '−3s',
      trendPositive: true,
    },
  ];

  return (
    <div>
      {/* Hero greeting */}
      <div style={{ marginBottom: 32 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 8 }}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
        <h1
          className="serif"
          style={{
            fontSize: 'clamp(28px, 3.4vw, 38px)',
            color: 'var(--text)',
            margin: 0,
            fontWeight: 400,
            lineHeight: 1.05,
            letterSpacing: '-0.025em',
          }}
        >
          {greeting()}.{' '}
          <span style={{ fontStyle: 'italic', color: 'var(--text-3)', fontFamily: "'Instrument Serif', serif" }}>
            Here&apos;s what&apos;s happening.
          </span>
        </h1>
      </div>

      {/* System health strip */}
      {systemHealth && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          style={{
            marginBottom: 20,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 16,
            padding: '7px 14px',
            borderRadius: 10,
            background: systemHealth.status === 'healthy'
              ? 'rgba(77,255,165,0.06)'
              : systemHealth.status === 'degraded'
                ? 'rgba(255,181,71,0.06)'
                : 'rgba(255,92,92,0.06)',
            border: `1px solid ${
              systemHealth.status === 'healthy' ? 'rgba(77,255,165,0.20)'
              : systemHealth.status === 'degraded' ? 'rgba(255,181,71,0.20)'
              : 'rgba(255,92,92,0.20)'}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              background: systemHealth.status === 'healthy' ? 'var(--green)' : systemHealth.status === 'degraded' ? 'var(--amber)' : 'var(--red)',
              boxShadow: `0 0 6px ${systemHealth.status === 'healthy' ? 'var(--green)' : systemHealth.status === 'degraded' ? 'var(--amber)' : 'var(--red)'}`,
            }} />
            <span style={{
              fontSize: 11,
              fontWeight: 700,
              color: systemHealth.status === 'healthy' ? 'var(--green)' : systemHealth.status === 'degraded' ? 'var(--amber)' : 'var(--red)',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
            }}>
              {systemHealth.status}
            </span>
          </div>
          <span style={{ width: 1, height: 14, background: 'var(--border)' }} />
          {Object.entries(systemHealth.services).map(([svc, status]) => (
            <div key={svc} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: status === 'healthy' ? 'var(--green)' : status === 'unconfigured' ? 'var(--text-4)' : 'var(--red)',
              }} />
              <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                {svc.replace(/([A-Z])/g, ' $1').toLowerCase().trim()}
              </span>
            </div>
          ))}
        </motion.div>
      )}

      {/* Metric grid */}
      <div
        className="metric-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {healthLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rect" height={132} />)
          : metrics.map((m, i) => (
              <motion.div
                key={m.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              >
                <MetricCard {...m} />
              </motion.div>
            ))}
      </div>

      {/* Split: Recent conversations + Pipeline */}
      <div className="dashboard-split" style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 16 }}>
        {/* Recent conversations */}
        <div className="surface-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CardHeader
            icon="message"
            title="Live conversations"
            action={<Link href="/conversations" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all
              <Icon name="arrow-right" size={11} stroke={2} />
            </Link>}
          />
          {convsLoading ? (
            <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} variant="rect" height={48} />)}
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="No conversations yet" description="Conversations will appear when leads reply." />
            </div>
          ) : (
            <div style={{ flex: 1 }}>
              {conversations.slice(0, 6).map((conv, i) => (
                <Link
                  key={conv.id}
                  href={`/conversations/${conv.id}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '12px 18px',
                    textDecoration: 'none',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: conv.aiActive ? 'var(--green)' : 'var(--amber)',
                      boxShadow: conv.aiActive ? '0 0 6px var(--green)' : '0 0 6px var(--amber)',
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      Lead · {conv.leadId.slice(-8)}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                      <span
                        style={{
                          padding: '1px 6px',
                          borderRadius: 4,
                          background: conv.aiActive ? 'rgba(179,155,255,0.10)' : 'rgba(255,181,71,0.10)',
                          color: conv.aiActive ? 'var(--purple)' : 'var(--amber)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 9.5,
                          letterSpacing: '0.04em',
                          textTransform: 'uppercase',
                        }}
                      >
                        {conv.aiActive ? 'AI' : 'Human'}
                      </span>
                      <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(conv.updatedAt)}</span>
                    </div>
                  </div>
                  <Icon name="chevron-right" size={14} style={{ color: 'var(--text-4)' }} />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Lead pipeline */}
        <div className="surface-card" style={{ overflow: 'hidden' }}>
          <CardHeader
            icon="chart"
            title="Lead pipeline"
            action={<Link href="/leads" style={{ fontSize: 12, color: 'var(--text-3)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              View all
              <Icon name="arrow-right" size={11} stroke={2} />
            </Link>}
          />
          <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {TIER_ORDER.map((tier, idx) => {
              const count = tierCounts[tier] ?? 0;
              const pct = (count / totalLeads) * 100;
              const meta = TIER_META[tier]!;
              return (
                <motion.div
                  key={tier}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.4 }}
                  style={{ display: 'flex', alignItems: 'center', gap: 12 }}
                >
                  <div
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 8,
                      background: `${meta.color}1a`,
                      border: `1px solid ${meta.color}33`,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: meta.color,
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={meta.icon} size={14} stroke={1.8} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-2)' }}>
                        {meta.label}
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                        <CountUp value={count} />
                      </span>
                    </div>
                    <div style={{ height: 4, borderRadius: 100, background: 'var(--bg-4)', overflow: 'hidden' }}>
                      <motion.div
                        style={{ height: '100%', borderRadius: 100, background: meta.color, boxShadow: `0 0 8px ${meta.color}` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.2 + idx * 0.05 }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) { .metric-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 900px)  { .dashboard-split { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px)  { .metric-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function CardHeader({ icon, title, action }: { icon: Parameters<typeof Icon>[0]['name']; title: string; action?: React.ReactNode }) {
  return (
    <div
      style={{
        padding: '14px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Icon name={icon} size={13} stroke={1.8} style={{ color: 'var(--text-3)' }} />
        <h2 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.005em' }}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | null;
  display?: string;
  decimals?: number;
  suffix?: string;
  icon: Parameters<typeof Icon>[0]['name'];
  color: string;
  trend?: string;
  trendPositive?: boolean;
}

function MetricCard({
  label, value, display, decimals, suffix, icon, color, trend, trendPositive,
}: MetricCardProps) {
  return (
    <div
      className="surface-card"
      style={{
        padding: 18,
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.3s, transform 0.3s var(--ease-out-quart)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--border-light)';
        e.currentTarget.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--border)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Accent glow */}
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}1a, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 9,
            background: `${color}14`,
            border: `1px solid ${color}33`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color,
          }}
        >
          <Icon name={icon} size={15} stroke={1.8} />
        </div>
        {trend && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: trendPositive ? 'var(--green)' : 'var(--red)',
              fontFamily: "'JetBrains Mono', monospace",
              display: 'inline-flex',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Icon name={trendPositive ? 'arrow-up' : 'arrow-down'} size={10} stroke={2.4} />
            {trend}
          </span>
        )}
      </div>

      <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div
        className="serif"
        style={{
          fontSize: 32,
          lineHeight: 1,
          color: 'var(--text)',
          fontWeight: 400,
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value === null ? (display ?? '—') : <CountUp value={value} decimals={decimals ?? 0} suffix={suffix ?? ''} />}
      </div>
    </div>
  );
}
