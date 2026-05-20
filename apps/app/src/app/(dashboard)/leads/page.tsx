'use client';
import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { LayoutList, LayoutGrid, Globe, Phone, Building } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { DataTable, type ColumnDef, PageHeader, StatusBadge, EmptyState, Badge, Avatar, Skeleton } from '@conversionops/ui';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { Button } from '@conversionops/ui';

function ScoreRing({ score, size = 24 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--green)' : score >= 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={2} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round"
        strokeDasharray={`${(score/100)*circ} ${circ}`} transform={`rotate(-90 ${size/2} ${size/2})`} />
    </svg>
  );
}

function sourceIcon(source: string) {
  if (source === 'ZILLOW' || source === 'REALTOR_COM') return <Building size={13} style={{ color: 'var(--text-3)' }} />;
  if (source === 'MISSED_CALL') return <Phone size={13} style={{ color: 'var(--text-3)' }} />;
  return <Globe size={13} style={{ color: 'var(--text-3)' }} />;
}

const TIERS = ['PRIORITY', 'HOT', 'WARM', 'COLD'] as const;
type TierKey = (typeof TIERS)[number];
const TIER_COLORS: Record<TierKey, string> = {
  PRIORITY: 'var(--accent)', HOT: 'var(--green)', WARM: 'var(--amber)', COLD: 'var(--blue)',
};

const COLUMNS: ColumnDef<Lead>[] = [
  { key: 'name', header: 'Name', render: r => <span className="font-medium" style={{ color: 'var(--text)' }}>{r.name ?? r.phone ?? r.email ?? r.id.slice(-8)}</span>, sortable: true },
  { key: 'score', header: 'Score', width: '80px', render: r => (
    <div className="flex items-center gap-2">
      <ScoreRing score={r.score} />
      <span className="text-xs" style={{ color: 'var(--text-2)' }}>{r.score}</span>
    </div>
  )},
  { key: 'tier', header: 'Tier', width: '100px', render: r => <Badge variant="neutral" size="sm" style={{ color: TIER_COLORS[r.tier as TierKey] }}>{r.tier}</Badge> },
  { key: 'source', header: 'Source', width: '100px', render: r => (
    <div className="flex items-center gap-1.5">{sourceIcon(r.source)}<span className="text-xs" style={{ color: 'var(--text-2)' }}>{r.source.replace('_',' ')}</span></div>
  )},
  { key: 'status', header: 'Status', width: '130px', render: r => <StatusBadge status={r.status} /> },
  { key: 'agent', header: 'Agent', width: '60px', render: r => r.assignedWorkspaceUserId ? <Avatar name={r.assignedWorkspaceUserId.slice(-4)} size="sm" /> : <span style={{ color: 'var(--text-4)' }}></span> },
];

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get('view') ?? 'list') as 'list' | 'kanban';
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const { leads, isLoading, fetchNextPage, hasNextPage } = useLeads();

  const filtered = useMemo(() => leads.filter(l => {
    if (search && !([l.name, l.phone, l.email].some(v => v?.toLowerCase().includes(search.toLowerCase())))) return false;
    if (tierFilter && l.tier !== tierFilter) return false;
    if (sourceFilter && l.source !== sourceFilter) return false;
    return true;
  }), [leads, search, tierFilter, sourceFilter]);

  const byTier = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    TIERS.forEach(t => { map[t] = []; });
    filtered.forEach(l => { if (TIERS.includes(l.tier as TierKey)) (map[l.tier] ??= []).push(l); });
    return map;
  }, [filtered]);

  return (
    <div>
      <PageHeader
        title="Leads"
        subtitle={`${leads.length} total leads`}
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => router.push('?view=list')} className={`p-2 rounded-lg transition-colors ${view === 'list' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'hover:bg-[var(--bg-3)] text-[var(--text-3)]'}`}><LayoutList size={16} /></button>
            <button onClick={() => router.push('?view=kanban')} className={`p-2 rounded-lg transition-colors ${view === 'kanban' ? 'bg-[var(--accent-dim)] text-[var(--accent)]' : 'hover:bg-[var(--bg-3)] text-[var(--text-3)]'}`}><LayoutGrid size={16} /></button>
          </div>
        }
      />

      {/* Filters */}
      <div className="flex items-center gap-3 mb-6">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search leads"
          className="h-9 px-3 text-sm rounded-lg w-60 focus:outline-none focus:ring-1"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', caretColor: 'var(--accent)' }} />
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg focus:outline-none"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <option value="">All tiers</option>
          {TIERS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={sourceFilter} onChange={e => setSourceFilter(e.target.value)}
          className="h-9 px-3 text-sm rounded-lg focus:outline-none"
          style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text-2)' }}>
          <option value="">All sources</option>
          {['ZILLOW','REALTOR_COM','WEB_FORM','MISSED_CALL','SMS_INBOUND','MANUAL'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
        </select>
      </div>

      {view === 'list' ? (
        <DataTable
          columns={COLUMNS}
          data={filtered}
          isLoading={isLoading}
          onRowClick={row => router.push(`/leads/${row.id}`)}
          hasNextPage={hasNextPage}
          onNextPage={() => void fetchNextPage()}
          emptyState={<EmptyState title="No leads yet" description="Leads will appear when they contact you." />}
        />
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {TIERS.map(tier => (
            <div key={tier} className="rounded-[10px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
              <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--border)' }}>
                <span className="text-xs font-semibold uppercase tracking-wide" style={{ color: TIER_COLORS[tier] }}>{tier}</span>
                <Badge variant="neutral" size="sm">{byTier[tier]?.length ?? 0}</Badge>
              </div>
              <div className="p-3 flex flex-col gap-2 max-h-[600px] overflow-y-auto">
                {isLoading
                  ? Array.from({length:3}).map((_,i)=><Skeleton key={i} variant="rect" height={80} />)
                  : (byTier[tier] ?? []).map(lead => (
                      <motion.div key={lead.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="rounded-lg p-3 cursor-pointer hover:bg-[var(--bg-4)] transition-colors"
                        style={{ background: 'var(--bg-3)' }}
                        onClick={() => router.push(`/leads/${lead.id}`)}>
                        <div className="flex items-center gap-2 mb-1.5">
                          <ScoreRing score={lead.score} size={20} />
                          <span className="text-xs font-medium truncate" style={{ color: 'var(--text)' }}>{lead.name ?? lead.phone ?? lead.id.slice(-6)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {sourceIcon(lead.source)}
                          <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{lead.source.replace('_',' ')}</span>
                        </div>
                      </motion.div>
                    ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {view === 'list' && hasNextPage && (
        <div className="mt-4 flex justify-center">
          <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()}>Load more</Button>
        </div>
      )}
    </div>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div className="space-y-4"><div className="h-8 rounded bg-[var(--bg-3)]" /><div className="h-96 rounded bg-[var(--bg-3)]" /></div>}>
      <LeadsContent />
    </Suspense>
  );
}
