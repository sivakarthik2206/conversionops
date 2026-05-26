'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { DataTable, EmptyState, Skeleton, Avatar } from '@conversionops/ui';
import type { ColumnDef } from '@conversionops/ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { CountUp } from '@/components/CountUp';

interface FunnelData {
  NEW: number;
  CONTACTED: number;
  QUALIFYING: number;
  QUALIFIED: number;
  APPOINTMENT_SCHEDULED: number;
  CONVERTED: number;
}

interface ResponseTimeData { p50: number; p90: number; p99: number; avgMs: number; }

interface SourceRow {
  id: string;
  source: string;
  leads: number;
  qualified: number;
  booked: number;
  rate: number;
}

interface AgentPerf {
  id: string;
  displayName: string | null;
  role: string;
  isAvailable: boolean;
  totalLeadsAssigned: number;
  totalConversions: number;
  conversionRate: number;
  avgResponseTimeMs: number | null;
  languages: string[];
  serviceAreas: string[];
  user?: { email: string; name: string | null } | null;
  period: { leads: number; converted: number; avgScore: number };
}

interface TrendDay { date: string; leads: number; appointments: number; conversions: number; }
interface TrendsData {
  days: TrendDay[];
  totals: { leads: number; appointments: number; conversions: number };
}

function msToReadable(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function conversionPct(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function rangeToParams(range: string): { from: string; to: string } {
  const days = range === '7d' ? 7 : range === '90d' ? 90 : 30;
  const to = new Date();
  const from = new Date(Date.now() - days * 86_400_000);
  return { from: from.toISOString(), to: to.toISOString() };
}

const SOURCE_COLUMNS: ColumnDef<SourceRow>[] = [
  { key: 'source', header: 'Source', render: row => (
    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{row.source.replace(/_/g, ' ')}</span>
  )},
  { key: 'leads',     header: 'Leads',     render: row => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{row.leads}</span> },
  { key: 'qualified', header: 'Qualified', render: row => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{row.qualified}</span> },
  { key: 'booked',    header: 'Booked',    render: row => <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>{row.booked}</span> },
  { key: 'rate',      header: 'Conv. rate', render: row => (
    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: row.rate >= 30 ? 'var(--green)' : row.rate >= 15 ? 'var(--amber)' : 'var(--red)', fontWeight: 600 }}>
      {row.rate}%
    </span>
  )},
];

const FUNNEL_COLORS = [
  'var(--blue)', 'var(--purple)', 'var(--accent)', 'var(--green)', 'var(--amber)', 'var(--accent)',
];

// ─── Sparkline (animated SVG area chart, no external dep) ─────────────────────

function Sparkline({ values, color, height = 56 }: { values: number[]; color: string; height?: number }) {
  const w = 240;
  const pad = 4;
  const n = values.length;
  const max = Math.max(1, ...values);
  const pts = values.map((v, i) => {
    const x = n <= 1 ? 0 : (i / (n - 1)) * w;
    const y = height - pad - (v / max) * (height - pad * 2);
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const area = pts.length ? `${line} L${w},${height} L0,${height} Z` : '';
  const gid = `spark-${color.replace(/[^a-z0-9]/gi, '')}`;
  const last = pts[pts.length - 1];

  return (
    <svg width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" style={{ display: 'block', overflow: 'visible' }}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.30" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && (
        <motion.path
          d={area}
          fill={`url(#${gid})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6 }}
        />
      )}
      <motion.path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        vectorEffect="non-scaling-stroke"
        style={{ filter: `drop-shadow(0 0 6px ${color}66)` }}
      />
      {last && (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r={3}
          fill={color}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 1.0, type: 'spring', stiffness: 400 }}
          style={{ filter: `drop-shadow(0 0 5px ${color})` }}
        />
      )}
    </svg>
  );
}

function TrendCard({ label, total, values, color, icon }: {
  label: string; total: number; values: number[]; color: string; icon: Parameters<typeof Icon>[0]['name'];
}) {
  return (
    <div className="surface-card" style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 12, overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ width: 28, height: 28, borderRadius: 8, background: `${color}14`, border: `1px solid ${color}33`, color, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={icon} size={13} stroke={1.8} />
          </span>
          <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{label}</span>
        </div>
        <span className="serif" style={{ fontSize: 22, color: 'var(--text)', fontWeight: 400, fontFeatureSettings: '"tnum"' }}>
          <CountUp value={total} />
        </span>
      </div>
      <Sparkline values={values} color={color} />
    </div>
  );
}

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');
  const params = rangeToParams(dateRange);

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ['analytics', 'funnel', dateRange],
    queryFn: () => apiClient.get('/analytics/funnel', params),
  });

  const { data: responseTimes, isLoading: rtLoading } = useQuery<ResponseTimeData>({
    queryKey: ['analytics', 'response-times', dateRange],
    queryFn: () => apiClient.get('/analytics/response-times', params),
  });

  const { data: rawSources, isLoading: sourcesLoading } = useQuery<Omit<SourceRow, 'id'>[]>({
    queryKey: ['analytics', 'sources', dateRange],
    queryFn: () => apiClient.get('/analytics/lead-sources', params),
  });

  const { data: trends, isLoading: trendsLoading } = useQuery<TrendsData>({
    queryKey: ['analytics', 'trends', dateRange],
    queryFn: () => apiClient.get('/analytics/trends', params),
  });

  const { data: agentData, isLoading: agentsLoading } = useQuery<{ agents: AgentPerf[] }>({
    queryKey: ['analytics', 'agents', dateRange],
    queryFn: () => apiClient.get('/analytics/agents', params),
  });

  const sources: SourceRow[] = (rawSources ?? []).map((s, i) => ({ ...s, id: `src-${i}` }));
  const isLoading = funnelLoading || rtLoading || sourcesLoading;

  const agents = [...(agentData?.agents ?? [])].sort((a, b) => b.period.leads - a.period.leads);
  const maxAgentLeads = Math.max(1, ...agents.map(a => a.period.leads));

  const metrics: { label: string; value: number | null; display?: string; decimals?: number; suffix?: string; icon: Parameters<typeof Icon>[0]['name']; color: string; trend: string }[] = [
    { label: 'Total leads',  value: funnel?.NEW ?? 0,                   icon: 'users',    color: 'var(--accent)', trend: '+12%' },
    { label: 'Qualified',    value: funnel?.QUALIFIED ?? 0,             icon: 'target',   color: 'var(--green)',  trend: funnel ? conversionPct(funnel.QUALIFIED, funnel.NEW) : '—' },
    { label: 'Appointments', value: funnel?.APPOINTMENT_SCHEDULED ?? 0, icon: 'calendar', color: 'var(--purple)', trend: funnel ? conversionPct(funnel.APPOINTMENT_SCHEDULED, funnel.NEW) : '—' },
    { label: 'Avg response', value: responseTimes ? responseTimes.avgMs / 1000 : null, decimals: 1, suffix: 's', display: '—', icon: 'clock', color: 'var(--blue)', trend: 'p50 ' + (responseTimes ? msToReadable(responseTimes.p50) : '—') },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Performance</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Analytics
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {(['7d', '30d', '90d'] as const).map(r => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              style={{
                padding: '5px 14px',
                borderRadius: 7,
                background: dateRange === r ? 'var(--bg)' : 'transparent',
                border: '1px solid',
                borderColor: dateRange === r ? 'var(--border-light)' : 'transparent',
                color: dateRange === r ? 'var(--text)' : 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                cursor: 'pointer',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Metric tiles */}
      <div className="metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: 124 }} />)
        ) : (
          metrics.map((m, i) => (
            <motion.div
              key={m.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="surface-card"
              style={{ padding: 18, position: 'relative', overflow: 'hidden' }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 120,
                  height: 120,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${m.color}1a, transparent 70%)`,
                  filter: 'blur(20px)',
                  pointerEvents: 'none',
                }}
              />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: `${m.color}14`,
                    border: `1px solid ${m.color}33`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: m.color,
                  }}
                >
                  <Icon name={m.icon} size={15} stroke={1.8} />
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.trend}
                </span>
              </div>
              <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{m.label}</div>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1, color: 'var(--text)', fontWeight: 400, fontFeatureSettings: '"tnum"' }}>
                {m.value === null ? (m.display ?? '—') : <CountUp value={m.value} decimals={m.decimals ?? 0} suffix={m.suffix ?? ''} />}
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* 30-day trends */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <Icon name="chart" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Trends</h2>
          <span className="eyebrow" style={{ color: 'var(--text-4)', marginLeft: 'auto' }}>{dateRange} · daily</span>
        </div>
        {trendsLoading ? (
          <div className="trend-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 132 }} />)}
          </div>
        ) : trends && trends.days.length > 0 ? (
          <div className="trend-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            <TrendCard label="Lead volume"   total={trends.totals.leads}        values={trends.days.map(d => d.leads)}        color="var(--accent)" icon="users" />
            <TrendCard label="Appointments"  total={trends.totals.appointments} values={trends.days.map(d => d.appointments)} color="var(--purple)" icon="calendar" />
            <TrendCard label="Conversions"   total={trends.totals.conversions}  values={trends.days.map(d => d.conversions)}  color="var(--green)" icon="target" />
          </div>
        ) : (
          <div className="surface-card" style={{ padding: 24 }}>
            <EmptyState title="No trend data yet" description="Daily lead, appointment, and conversion trends will appear as activity accrues." />
          </div>
        )}
      </div>

      {/* Funnel */}
      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
          <Icon name="chart" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Conversion funnel</h2>
          <span className="eyebrow" style={{ color: 'var(--text-4)', marginLeft: 'auto' }}>{dateRange}</span>
        </div>

        {funnelLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} style={{ height: 36 }} />)}
          </div>
        ) : funnel ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {(Object.entries(funnel) as [string, number][]).map(([stage, count], idx, arr) => {
              const maxCount = arr[0]?.[1] ?? 1;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              const color = FUNNEL_COLORS[idx % FUNNEL_COLORS.length]!;
              const prev = idx === 0 ? null : arr[idx - 1];
              const stageRate = prev && prev[1] > 0 ? Math.round((count / prev[1]) * 100) : null;
              return (
                <div key={stage} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 160, textAlign: 'right', fontSize: 12, color: 'var(--text-2)', fontWeight: 500 }}>
                    {stage.replace(/_/g, ' ')}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <motion.div
                      style={{
                        height: '100%',
                        background: `linear-gradient(90deg, ${color}80 0%, ${color} 100%)`,
                        borderRadius: 8,
                        position: 'relative',
                      }}
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.9, delay: idx * 0.05, ease: [0.16, 1, 0.3, 1] }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          inset: 0,
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.1), transparent)',
                          borderRadius: 8,
                        }}
                      />
                    </motion.div>
                  </div>
                  <div style={{ width: 64, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                    <CountUp value={count} />
                  </div>
                  <div style={{ width: 56, textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: stageRate !== null ? 'var(--text-3)' : 'var(--text-5)' }}>
                    {stageRate !== null ? `${stageRate}%` : '—'}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No funnel data" description="Lead data will appear here after your first conversions." />
        )}
      </div>

      {/* Agent performance comparison */}
      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Icon name="agent" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Agent performance</h2>
          <span className="eyebrow" style={{ color: 'var(--text-4)', marginLeft: 'auto' }}>{dateRange}</span>
        </div>
        {agentsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 56 }} />)}
          </div>
        ) : agents.length === 0 ? (
          <EmptyState title="No agents" description="Invite agents to see side-by-side performance." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {/* header row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.9fr 0.8fr', gap: 12, padding: '0 4px 10px', borderBottom: '1px solid var(--border)' }}>
              {['Agent', 'Leads (period)', 'Converted', 'Conv. rate', 'Avg resp'].map((h, i) => (
                <span key={h} className="eyebrow" style={{ color: 'var(--text-4)', textAlign: i === 0 ? 'left' : 'right' }}>{h}</span>
              ))}
            </div>
            {agents.map((a, idx) => {
              const name = a.displayName ?? a.user?.name ?? a.user?.email ?? 'Agent';
              const ratePct = Math.round(a.conversionRate * 100);
              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 0.9fr 0.9fr 0.8fr', gap: 12, alignItems: 'center', padding: '12px 4px', borderTop: idx === 0 ? 'none' : '1px solid var(--border)' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                    <Avatar name={name} size="sm" online={a.isAvailable} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
                      <div className="eyebrow" style={{ color: 'var(--text-4)', fontSize: 9 }}>{a.role}</div>
                    </div>
                  </div>
                  {/* leads with proportional bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'flex-end' }}>
                    <div style={{ flex: 1, height: 5, borderRadius: 100, background: 'var(--bg-4)', overflow: 'hidden', maxWidth: 90 }}>
                      <motion.div
                        style={{ height: '100%', background: 'var(--accent)', borderRadius: 100, boxShadow: '0 0 6px var(--accent)' }}
                        initial={{ width: 0 }}
                        animate={{ width: `${(a.period.leads / maxAgentLeads) * 100}%` }}
                        transition={{ duration: 0.8, delay: 0.1 + idx * 0.04 }}
                      />
                    </div>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text)', fontWeight: 600, minWidth: 24, textAlign: 'right' }}>
                      <CountUp value={a.period.leads} />
                    </span>
                  </div>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: 'var(--text-2)', textAlign: 'right' }}>
                    <CountUp value={a.period.converted} />
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 600, textAlign: 'right', color: ratePct >= 30 ? 'var(--green)' : ratePct >= 15 ? 'var(--amber)' : 'var(--text-3)' }}>
                    {ratePct}%
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text-3)', textAlign: 'right' }}>
                    {a.avgResponseTimeMs ? msToReadable(a.avgResponseTimeMs) : '—'}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Response times */}
      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Icon name="clock" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Response times</h2>
        </div>
        {rtLoading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} style={{ height: 88 }} />)}
          </div>
        ) : responseTimes ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {(['p50', 'p90', 'p99'] as const).map(key => (
              <div
                key={key}
                style={{
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  padding: 18,
                  textAlign: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: -30,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 100,
                    height: 60,
                    background: 'radial-gradient(ellipse at center, rgba(232,255,71,0.08), transparent 70%)',
                    filter: 'blur(15px)',
                    pointerEvents: 'none',
                  }}
                />
                <div
                  className="serif"
                  style={{
                    fontSize: 28,
                    color: 'var(--accent)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontWeight: 500,
                    marginBottom: 6,
                    textShadow: '0 0 16px rgba(232,255,71,0.30)',
                    position: 'relative',
                  }}
                >
                  {msToReadable(responseTimes[key])}
                </div>
                <div
                  className="eyebrow"
                  style={{ color: 'var(--text-3)', position: 'relative' }}
                >
                  {key} latency
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Source breakdown */}
      <div className="surface-card" style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <Icon name="globe" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
          <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Lead sources</h2>
        </div>
        {sourcesLoading ? (
          <Skeleton style={{ height: 192 }} />
        ) : sources.length > 0 ? (
          <DataTable columns={SOURCE_COLUMNS} data={sources} />
        ) : (
          <EmptyState title="No source data" description="Source performance data will appear after lead activity." />
        )}
      </div>

      <style>{`
        @media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, 1fr) !important; } .trend-grid { grid-template-columns: 1fr !important; } }
        @media (max-width: 560px) { .metric-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
