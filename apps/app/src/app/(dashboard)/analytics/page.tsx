'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, Clock, ArrowUpRight } from 'lucide-react';
import { MetricCard, DataTable, EmptyState, Skeleton, PageHeader } from '@conversionops/ui';
import type { ColumnDef } from '@conversionops/ui';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface FunnelData {
  NEW: number;
  CONTACTED: number;
  QUALIFYING: number;
  QUALIFIED: number;
  APPOINTMENT_SCHEDULED: number;
  CONVERTED: number;
}

interface ResponseTimeData {
  p50: number;
  p90: number;
  p99: number;
  avgMs: number;
}

interface SourceRow {
  id: string;
  source: string;
  leads: number;
  qualified: number;
  booked: number;
  rate: number;
}

const stagger = {
  container: { transition: { staggerChildren: 0.05 } },
  item: {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] },
  },
};

function msToReadable(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function conversionPct(numerator: number, denominator: number): string {
  if (!denominator) return '0%';
  return `${Math.round((numerator / denominator) * 100)}%`;
}

const SOURCE_COLUMNS: ColumnDef<SourceRow>[] = [
  { key: 'source', header: 'Source', render: (row) => row.source },
  { key: 'leads', header: 'Leads', render: (row) => row.leads },
  { key: 'qualified', header: 'Qualified', render: (row) => row.qualified },
  { key: 'booked', header: 'Booked', render: (row) => row.booked },
  { key: 'rate', header: 'Conv. Rate', render: (row) => `${row.rate}%` },
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

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Analytics"
          subtitle="Lead funnel, response times, and source performance."
        />
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
          {(['7d', '30d', '90d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setDateRange(r)}
              className="px-3 py-1 rounded-md text-xs font-medium transition-colors"
              style={{
                background: dateRange === r ? 'var(--bg-4)' : 'transparent',
                color: dateRange === r ? 'var(--text)' : 'var(--text-3)',
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <motion.div
        variants={stagger.container}
        initial="initial"
        animate="animate"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)
        ) : (
          <>
            <motion.div variants={stagger.item}>
              <MetricCard label="Total Leads" value={funnel?.NEW ?? 0} trend={12} />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label={`Qualified ${funnel ? `(${conversionPct(funnel.QUALIFIED, funnel.NEW)})` : ''}`}
                value={funnel?.QUALIFIED ?? 0}
                trend={8}
              />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard label="Appointments" value={funnel?.APPOINTMENT_SCHEDULED ?? 0} trend={5} />
            </motion.div>
            <motion.div variants={stagger.item}>
              <MetricCard
                label="Avg Response"
                value={responseTimes ? msToReadable(responseTimes.avgMs) : '—'}
                trend={-3}
              />
            </motion.div>
          </>
        )}
      </motion.div>

      {/* Funnel */}
      <div className="rounded-[10px] p-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Conversion Funnel</h2>
        </div>
        {funnelLoading ? (
          <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : funnel ? (
          <div className="space-y-2">
            {(Object.entries(funnel) as [string, number][]).map(([stage, count], _idx, arr) => {
              const maxCount = arr[0]?.[1] ?? 1;
              const pct = maxCount > 0 ? (count / maxCount) * 100 : 0;
              return (
                <div key={stage} className="flex items-center gap-4">
                  <div className="w-36 text-xs text-right" style={{ color: 'var(--text-3)' }}>{stage.replace(/_/g, ' ')}</div>
                  <div className="flex-1 h-6 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: 'var(--accent)' }} />
                  </div>
                  <div className="w-12 text-xs text-right font-mono" style={{ color: 'var(--text-2)' }}>{count}</div>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState title="No funnel data" description="Lead data will appear here after your first conversions." />
        )}
      </div>

      {/* Response times */}
      <div className="rounded-[10px] p-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-6">
          <Clock size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Response Times</h2>
        </div>
        {rtLoading ? (
          <div className="grid grid-cols-3 gap-4">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : responseTimes ? (
          <div className="grid grid-cols-3 gap-4">
            {(['p50', 'p90', 'p99'] as const).map((key) => (
              <div key={key} className="rounded-lg p-4 text-center" style={{ background: 'var(--bg-3)' }}>
                <div className="text-xl font-bold font-mono mb-1" style={{ color: 'var(--accent)' }}>{msToReadable(responseTimes[key])}</div>
                <div className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>{key}</div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      {/* Source breakdown */}
      <div className="rounded-[10px] p-6" style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}>
        <div className="flex items-center gap-2 mb-6">
          <ArrowUpRight size={16} style={{ color: 'var(--accent)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Lead Sources</h2>
        </div>
        {sourcesLoading ? (
          <Skeleton className="h-48" />
        ) : sources.length > 0 ? (
          <DataTable columns={SOURCE_COLUMNS} data={sources} />
        ) : (
          <EmptyState title="No source data" description="Source performance data will appear here." />
        )}
      </div>
    </div>
  );
}
