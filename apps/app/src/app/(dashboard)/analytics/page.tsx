'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { DataTable, EmptyState, Skeleton } from '@conversionops/ui';
import type { ColumnDef } from '@conversionops/ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

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

function msToReadable(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function conversionPct(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
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

export default function AnalyticsPage() {
  const [dateRange, setDateRange] = useState('30d');

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelData>({
    queryKey: ['analytics', 'funnel', dateRange],
    queryFn: () => apiClient.get(`/analytics/funnel?range=${dateRange}`),
  });

  const { data: responseTimes, isLoading: rtLoading } = useQuery<ResponseTimeData>({
    queryKey: ['analytics', 'response-times', dateRange],
    queryFn: () => apiClient.get(`/analytics/response-times?range=${dateRange}`),
  });

  const { data: rawSources, isLoading: sourcesLoading } = useQuery<Omit<SourceRow, 'id'>[]>({
    queryKey: ['analytics', 'sources', dateRange],
    queryFn: () => apiClient.get(`/analytics/lead-sources?range=${dateRange}`),
  });

  const sources: SourceRow[] = (rawSources ?? []).map((s, i) => ({ ...s, id: `src-${i}` }));
  const isLoading = funnelLoading || rtLoading || sourcesLoading;

  const metrics = [
    { label: 'Total leads',  value: funnel?.NEW ?? 0,                  icon: 'users' as const,    color: 'var(--accent)', trend: '+12%' },
    { label: 'Qualified',    value: funnel?.QUALIFIED ?? 0,            icon: 'target' as const,   color: 'var(--green)',  trend: funnel ? conversionPct(funnel.QUALIFIED, funnel.NEW) : '—' },
    { label: 'Appointments', value: funnel?.APPOINTMENT_SCHEDULED ?? 0, icon: 'calendar' as const, color: 'var(--purple)', trend: '+5' },
    { label: 'Avg response', value: responseTimes ? msToReadable(responseTimes.avgMs) : '—', icon: 'clock' as const, color: 'var(--blue)', trend: '−3s' },
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
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {m.trend}
                </span>
              </div>
              <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{m.label}</div>
              <div className="serif" style={{ fontSize: 30, lineHeight: 1, color: 'var(--text)', fontWeight: 400 }}>
                {m.value}
              </div>
            </motion.div>
          ))
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
                    {count}
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
        @media (max-width: 900px) { .metric-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .metric-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
