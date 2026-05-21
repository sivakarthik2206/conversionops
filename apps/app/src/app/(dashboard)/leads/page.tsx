'use client';
import { useState, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DataTable, type ColumnDef, StatusBadge, EmptyState, Badge, Avatar, Skeleton, Button,
} from '@conversionops/ui';
import { useLeads, type Lead } from '@/hooks/useLeads';
import { Icon } from '@/components/Icon';

function ScoreRing({ score, size = 28 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : score >= 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={2} />
        <circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(score/100)*circ} ${circ}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 3px ${color})` }}
        />
      </svg>
      <span
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 600,
          color,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        {score}
      </span>
    </div>
  );
}

function sourceIcon(source: string) {
  const map: Record<string, Parameters<typeof Icon>[0]['name']> = {
    ZILLOW: 'building',
    REALTOR_COM: 'building',
    MISSED_CALL: 'phone',
    SMS_INBOUND: 'message',
    WEB_FORM: 'globe',
    MANUAL: 'user',
  };
  return <Icon name={map[source] ?? 'globe'} size={13} stroke={1.6} style={{ color: 'var(--text-3)' }} />;
}

const TIERS = ['PRIORITY', 'HOT', 'WARM', 'COLD'] as const;
type TierKey = (typeof TIERS)[number];
const TIER_META: Record<TierKey, { color: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  PRIORITY: { color: 'var(--accent)', icon: 'bolt' },
  HOT:      { color: 'var(--green)',  icon: 'fire' },
  WARM:     { color: 'var(--amber)',  icon: 'target' },
  COLD:     { color: 'var(--blue)',   icon: 'inbox' },
};

const COLUMNS: ColumnDef<Lead>[] = [
  {
    key: 'name',
    header: 'Lead',
    render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <Avatar name={r.name ?? r.phone ?? r.id} size="sm" />
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
            {r.name ?? r.phone ?? r.email ?? r.id.slice(-8)}
          </div>
          {r.phone && r.name && (
            <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
              {r.phone}
            </div>
          )}
        </div>
      </div>
    ),
    sortable: true,
  },
  {
    key: 'score',
    header: 'Score',
    width: '88px',
    render: r => <ScoreRing score={r.score} />,
  },
  {
    key: 'tier',
    header: 'Tier',
    width: '110px',
    render: r => {
      const meta = TIER_META[r.tier as TierKey];
      if (!meta) {
        return <Badge variant="neutral" size="sm">{r.tier}</Badge>;
      }
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 8px',
            borderRadius: 100,
            background: `${meta.color}14`,
            border: `1px solid ${meta.color}33`,
            color: meta.color,
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          <Icon name={meta.icon} size={9} stroke={2} />
          {r.tier}
        </span>
      );
    },
  },
  {
    key: 'source',
    header: 'Source',
    width: '130px',
    render: r => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {sourceIcon(r.source)}
        <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
          {r.source.replace('_',' ')}
        </span>
      </div>
    ),
  },
  { key: 'status', header: 'Status', width: '140px', render: r => <StatusBadge status={r.status} /> },
  {
    key: 'agent',
    header: 'Agent',
    width: '64px',
    render: r => r.assignedWorkspaceUserId
      ? <Avatar name={r.assignedWorkspaceUserId.slice(-4)} size="sm" />
      : <span style={{ color: 'var(--text-5)', fontSize: 13 }}>—</span>,
  },
];

function LeadsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const view = (searchParams.get('view') ?? 'list') as 'list' | 'kanban';
  const [search, setSearch] = useState('');
  const [tierFilter, setTierFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');

  const { leads, isLoading, fetchNextPage, hasNextPage } = useLeads();

  const filtered = useMemo(
    () =>
      leads.filter(l => {
        if (search && !([l.name, l.phone, l.email].some(v => v?.toLowerCase().includes(search.toLowerCase())))) return false;
        if (tierFilter && l.tier !== tierFilter) return false;
        if (sourceFilter && l.source !== sourceFilter) return false;
        return true;
      }),
    [leads, search, tierFilter, sourceFilter],
  );

  const byTier = useMemo(() => {
    const map: Record<string, Lead[]> = {};
    TIERS.forEach(t => { map[t] = []; });
    filtered.forEach(l => {
      if (TIERS.includes(l.tier as TierKey)) {
        const arr = map[l.tier];
        if (arr) arr.push(l);
      }
    });
    return map;
  }, [filtered]);

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Pipeline</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            All leads <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 16, marginLeft: 8 }}>{leads.length}</span>
          </h1>
        </div>

        {/* View toggle */}
        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {[
            { id: 'list', icon: 'menu' as const, label: 'List' },
            { id: 'kanban', icon: 'grip' as const, label: 'Board' },
          ].map(v => (
            <button
              key={v.id}
              onClick={() => router.push(`?view=${v.id}`)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 12px',
                borderRadius: 7,
                background: view === v.id ? 'var(--bg)' : 'transparent',
                border: '1px solid',
                borderColor: view === v.id ? 'var(--border-light)' : 'transparent',
                color: view === v.id ? 'var(--text)' : 'var(--text-3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.15s',
              }}
            >
              <Icon name={v.icon} size={12} stroke={1.8} />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
        <div style={{ position: 'relative', width: 280 }}>
          <Icon name="search" size={13} stroke={1.8} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, or email"
            style={{
              width: '100%',
              height: 34,
              paddingLeft: 32,
              paddingRight: 12,
              fontSize: 13,
              borderRadius: 8,
              background: 'var(--bg-2)',
              border: '1px solid var(--border)',
              color: 'var(--text)',
              outline: 'none',
              transition: 'border-color 0.2s',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
        </div>

        <FilterPill value={tierFilter} onChange={setTierFilter} placeholder="All tiers" options={TIERS as readonly string[]} />
        <FilterPill
          value={sourceFilter}
          onChange={setSourceFilter}
          placeholder="All sources"
          options={['ZILLOW','REALTOR_COM','WEB_FORM','MISSED_CALL','SMS_INBOUND','MANUAL']}
        />

        {(tierFilter || sourceFilter || search) && (
          <button
            onClick={() => { setTierFilter(''); setSourceFilter(''); setSearch(''); }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '6px 10px',
              borderRadius: 8,
              background: 'transparent',
              border: '1px solid var(--border)',
              color: 'var(--text-3)',
              fontSize: 11,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            <Icon name="x" size={11} stroke={2} />
            Clear
          </button>
        )}
      </div>

      {view === 'list' ? (
        <DataTable
          columns={COLUMNS}
          data={filtered}
          isLoading={isLoading}
          onRowClick={row => router.push(`/leads/${row.id}`)}
          hasNextPage={hasNextPage}
          onNextPage={() => void fetchNextPage()}
          emptyState={
            <EmptyState
              illustration={<Icon name="users" size={28} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
              title="No leads yet"
              description="Leads appear here when they contact you through SMS, missed call, or your CRM."
            />
          }
        />
      ) : (
        <div className="kanban-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {TIERS.map(tier => {
            const meta = TIER_META[tier];
            const list = byTier[tier] ?? [];
            return (
              <div
                key={tier}
                className="surface-card"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              >
                <div
                  style={{
                    padding: '12px 14px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: 6,
                      background: `${meta.color}1a`,
                      color: meta.color,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name={meta.icon} size={11} stroke={2} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                    {tier}
                  </span>
                  <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {list.length}
                  </span>
                </div>
                <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 600, overflowY: 'auto' }}>
                  {isLoading ? (
                    Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rect" height={66} />)
                  ) : list.length === 0 ? (
                    <div style={{ padding: '32px 12px', textAlign: 'center', fontSize: 11, color: 'var(--text-5)' }}>
                      No {tier.toLowerCase()} leads
                    </div>
                  ) : (
                    list.map(lead => (
                      <motion.div
                        key={lead.id}
                        layout
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        whileHover={{ y: -2 }}
                        onClick={() => router.push(`/leads/${lead.id}`)}
                        style={{
                          padding: 12,
                          borderRadius: 10,
                          background: 'var(--bg-3)',
                          border: '1px solid var(--border)',
                          cursor: 'pointer',
                          transition: 'border-color 0.2s',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                          <ScoreRing score={lead.score} size={22} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {lead.name ?? lead.phone ?? lead.id.slice(-6)}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--text-3)' }}>
                          {sourceIcon(lead.source)}
                          <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>{lead.source.replace('_',' ')}</span>
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {view === 'list' && hasNextPage && (
        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'center' }}>
          <Button variant="secondary" size="sm" onClick={() => void fetchNextPage()}>Load more</Button>
        </div>
      )}

      <style>{`
        @media (max-width: 960px) { .kanban-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .kanban-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}

function FilterPill({
  value, onChange, placeholder, options,
}: { value: string; onChange: (v: string) => void; placeholder: string; options: readonly string[] }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        height: 34,
        padding: '0 28px 0 12px',
        fontSize: 12,
        borderRadius: 8,
        background: 'var(--bg-2)',
        border: '1px solid var(--border)',
        color: value ? 'var(--text)' : 'var(--text-3)',
        outline: 'none',
        cursor: 'pointer',
        appearance: 'none',
        WebkitAppearance: 'none',
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%237d7d87' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")",
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'right 8px center',
        backgroundSize: 12,
      }}
    >
      <option value="">{placeholder}</option>
      {options.map(o => <option key={o} value={o}>{o.replace('_',' ')}</option>)}
    </select>
  );
}

export default function LeadsPage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}><Skeleton style={{ height: 36 }} /><Skeleton style={{ height: 400 }} /></div>}>
      <LeadsContent />
    </Suspense>
  );
}
