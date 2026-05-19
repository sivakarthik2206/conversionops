'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, Tooltip, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { MetricCard, PageHeader, Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

const RANGE_OPTIONS = [
  { label: '7d', value: 7 },
  { label: '30d', value: 30 },
  { label: '90d', value: 90 },
];

const STATUS_COLORS: Record<string, string> = {
  NEW: '#4796ff', CONTACTED: '#4796ff', QUALIFYING: '#ffb347',
  QUALIFIED: '#47ff8e', ROUTING: '#47ff8e', ASSIGNED: '#47ff8e',
  APPOINTMENT_SCHEDULED: '#e8ff47', CONVERTED: '#e8ff47',
  UNRESPONSIVE: '#52525b', DORMANT: '#52525b', OPT_OUT: '#ff4747',
};

const SOURCE_COLORS = ['#e8ff47','#47ff8e','#4796ff','#ffb347','#a78bfa','#ff4747'];

interface FunnelData { status: string; count: number; }
interface FunnelResponse { stages: FunnelData[] }
interface VolumePoint { date: string; leads: number; }
interface SourcePoint { source: string; count: number; }

function DarkTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name?: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
      {label && <p className="font-medium mb-1" style={{ color: 'var(--text-2)' }}>{label}</p>}
      {payload.map((p, i) => <p key={i}>{p.value}</p>)}
    </div>
  );
}

export default function AnalyticsPage() {
  const [range, setRange] = useState(30);

  const { data: funnel, isLoading: funnelLoading } = useQuery<FunnelResponse>({
    queryKey: ['analytics-funnel', range],
    queryFn: () => apiClient.get('/analytics/funnel', { days: range }),
    retry: false,
  });

  const stages = funnel?.stages ?? [
    { status: 'NEW', count: 0 }, { status: 'QUALIFIED', count: 0 }, { status: 'ASSIGNED', count: 0 },
    { status: 'APPOINTMENT_SCHEDULED', count: 0 }, { status: 'CONVERTED', count: 0 },
  ];

  const volumeData: VolumePoint[] = Array.from({ length: Math.min(range, 14) }, (_, i) => ({
    date: new Date(Date.now() - (i * 86400000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    leads: 0,
  })).reverse();

  const sourceData: SourcePoint[] = ['ZILLOW','WEB_FORM','MISSED_CALL','SMS_INBOUND','REFERRAL','OTHER'].map(s => ({ source: s.replace('_',' '), count: 0 }));

  return (
    <div>
      <PageHeader title="Analytics" subtitle="Lead conversion metrics"
        action={
          <div className="flex items-center gap-1 p-1 rounded-lg" style={{ background: 'var(--bg-3)' }}>
            {RANGE_OPTIONS.map(o => (
              <button key={o.value} onClick={() => setRange(o.value)}
                className="px-3 py-1.5 rounded-md text-xs font-medium transition-colors"
                style={{ background: range === o.value ? 'var(--bg-2)' : 'transparent', color: range === o.value ? 'var(--text)' : 'var(--text-3)' }}>
                {o.label}
              </button>
            ))}
          </div>
        }
      />

      <div className="grid grid-cols-4 gap-4 mb-8">
        {['Total Leads','Qualified Rate','Booking Rate','Avg Response'].map(label => (
          <MetricCard key={label} label={label} value="—" />
        ))}
      </div>

      <div className="rounded-[10px] border p-5 mb-6" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Conversion Funnel</h2>
        {funnelLoading ? <Skeleton variant="rect" height={200} /> : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stages} layout="vertical" margin={{ left: 80 }}>
              <XAxis type="number" stroke="var(--text-3)" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <YAxis type="category" dataKey="status" stroke="var(--text-3)" tick={{ fontSize: 11, fill: 'var(--text-3)' }} />
              <Tooltip content={<DarkTooltip />} />
              <Bar dataKey="count" fill="var(--accent)" radius={[0,4,4,0]}>
                {stages.map(entry => <Cell key={entry.status} fill={STATUS_COLORS[entry.status] ?? 'var(--accent)'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-[10px] border p-5" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Lead Volume</h2>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={volumeData}>
              <XAxis dataKey="date" stroke="var(--text-3)" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <YAxis stroke="var(--text-3)" tick={{ fontSize: 10, fill: 'var(--text-3)' }} />
              <Tooltip content={<DarkTooltip />} />
              <Area type="monotone" dataKey="leads" stroke="#e8ff47" fill="rgba(232,255,71,0.10)" strokeWidth={1.5} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-[10px] border p-5" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Lead Sources</h2>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={sourceData} dataKey="count" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {sourceData.map((_, i) => <Cell key={i} fill={SOURCE_COLORS[i % SOURCE_COLORS.length] ?? '#e8ff47'} />)}
                </Pie>
                <Tooltip content={<DarkTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2">
              {sourceData.map((s, i) => (
                <div key={s.source} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full" style={{ background: SOURCE_COLORS[i % SOURCE_COLORS.length] }} />
                  <span className="text-[11px]" style={{ color: 'var(--text-2)' }}>{s.source}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
