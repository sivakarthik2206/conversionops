'use client';
import React, { useState, useCallback, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Badge } from '../primitives';

function cn(...inputs: Parameters<typeof clsx>) { return twMerge(clsx(inputs)); }

/* --- MetricCard -------------------------------------------- */
export interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  sparkline?: number[];
  className?: string;
}

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const W = 80; const H = 28;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * W},${H - ((v - min) / range) * H}`).join(' ');
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true">
      <polyline points={pts} stroke="var(--accent)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MetricCard({ label, value, trend, sparkline, className }: MetricCardProps) {
  return (
    <motion.div
      className={cn('rounded-[10px] border p-6 flex flex-col gap-3', className)}
      style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}
      whileHover={{ y: -2, boxShadow: 'var(--shadow-accent)' }}
      transition={{ duration: 0.15 }}
    >
      <p className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>{label}</p>
      <div className="flex items-end justify-between gap-2">
        <span className="font-display text-[40px] leading-none font-normal" style={{ color: 'var(--text)' }}>{value}</span>
        {sparkline && sparkline.length >= 2 && <Sparkline data={sparkline} />}
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1">
          {trend >= 0
            ? <TrendingUp size={13} style={{ color: 'var(--green)' }} />
            : <TrendingDown size={13} style={{ color: 'var(--red)' }} />}
          <span className="text-xs font-medium" style={{ color: trend >= 0 ? 'var(--green)' : 'var(--red)' }}>
            {trend >= 0 ? '+' : ''}{trend}%
          </span>
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>vs last period</span>
        </div>
      )}
    </motion.div>
  );
}

/* --- DataTable --------------------------------------------- */
export interface ColumnDef<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  sortable?: boolean;
  width?: string;
}

export interface DataTableProps<T extends { id: string }> {
  columns: ColumnDef<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: ReactNode;
  onRowClick?: (row: T) => void;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
  onNextPage?: () => void;
  onPrevPage?: () => void;
  bulkActions?: { label: string; action: (ids: string[]) => void }[];
}

export function DataTable<T extends { id: string }>({
  columns, data, isLoading, emptyState, onRowClick,
  hasNextPage, hasPrevPage, onNextPage, onPrevPage, bulkActions,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const toggleAll = () => {
    if (selected.size === data.length) setSelected(new Set());
    else setSelected(new Set(data.map(r => r.id)));
  };

  const toggleRow = (id: string) => {
    setSelected(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  };

  if (isLoading) {
    return (
      <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="px-4 py-3 flex gap-4 border-b" style={{ borderColor: 'var(--border)' }}>
            <div className="h-4 rounded flex-1 bg-[var(--bg-3)] animate-pulse" />
            <div className="h-4 rounded w-20 bg-[var(--bg-3)] animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)', minHeight: 200 }}>{emptyState}</div>;
  }

  const selectedArr = Array.from(selected);

  return (
    <div className="rounded-[10px] border overflow-hidden" style={{ borderColor: 'var(--border)', background: 'var(--bg-2)' }}>
      {selected.size > 0 && bulkActions && bulkActions.length > 0 && (
        <div className="px-4 py-2 flex items-center gap-3 border-b" style={{ background: 'var(--accent-dim)', borderColor: 'var(--border)' }}>
          <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>{selected.size} selected</span>
          {bulkActions.map(a => (
            <button key={a.label} onClick={() => { a.action(selectedArr); setSelected(new Set()); }}
              className="text-xs px-2 py-1 rounded hover:bg-[var(--accent)] hover:text-[var(--bg)] transition-colors"
              style={{ color: 'var(--text-2)' }}>{a.label}</button>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr style={{ background: 'var(--bg-3)', borderBottom: '1px solid var(--border)' }}>
              {bulkActions && (
                <th className="pl-4 py-3 w-8">
                  <input type="checkbox" checked={selected.size === data.length && data.length > 0} onChange={toggleAll} className="accent-[var(--accent)]" />
                </th>
              )}
              {columns.map(col => (
                <th key={col.key} className={cn('px-4 py-3 text-left', col.sortable && 'cursor-pointer hover:text-[var(--text)]')} style={{ width: col.width, color: 'var(--text-3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}
                  onClick={() => col.sortable && toggleSort(col.key)}>
                  <span className="flex items-center gap-1">
                    {col.header}
                    {col.sortable && sortKey === col.key && <span style={{ color: 'var(--accent)' }}>{sortDir === 'asc' ? '↑' : '↓'}</span>}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={row.id}
                className={cn('border-b transition-colors', onRowClick && 'cursor-pointer')}
                style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'transparent' }}
                onClick={() => onRowClick?.(row)}
                onMouseEnter={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'var(--bg-3)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLTableRowElement).style.background = 'transparent'; }}
              >
                {bulkActions && (
                  <td className="pl-4 py-3 w-8" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.has(row.id)} onChange={() => toggleRow(row.id)} className="accent-[var(--accent)]" />
                  </td>
                )}
                {columns.map(col => (
                  <td key={col.key} className="px-4 py-3 text-sm" style={{ color: 'var(--text)' }}>{col.render(row)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {(hasNextPage !== undefined || hasPrevPage !== undefined) && (
        <div className="px-4 py-3 flex items-center justify-end gap-2 border-t" style={{ borderColor: 'var(--border)' }}>
          <button disabled={!hasPrevPage} onClick={onPrevPage} className="text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>Previous</button>
          <button disabled={!hasNextPage} onClick={onNextPage} className="text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-40"
            style={{ borderColor: 'var(--border)', color: 'var(--text-2)' }}>Next</button>
        </div>
      )}
    </div>
  );
}

/* --- PageHeader -------------------------------------------- */
export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-8', className)}>
      <div>
        <h1 className="font-display text-[32px] leading-tight font-normal" style={{ color: 'var(--text)' }}>{title}</h1>
        {subtitle && <p className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/* --- EmptyState -------------------------------------------- */
export interface EmptyStateProps {
  illustration?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ illustration, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center p-8', className)} style={{ minHeight: 200 }}>
      {illustration && <div className="mb-4 opacity-60">{illustration}</div>}
      <h3 className="font-display text-[24px] leading-tight mb-2 font-normal" style={{ color: 'var(--text)' }}>{title}</h3>
      {description && <p className="text-sm mb-6 max-w-xs" style={{ color: 'var(--text-2)' }}>{description}</p>}
      {action}
    </div>
  );
}

/* --- StatusBadge ------------------------------------------- */
type LeadStatus = 'NEW' | 'CONTACTED' | 'QUALIFYING' | 'QUALIFIED' | 'ROUTING' | 'ASSIGNED' | 'APPOINTMENT_REQUESTED' | 'APPOINTMENT_SCHEDULED' | 'CONVERTED' | 'OPT_OUT' | 'DISQUALIFIED' | 'UNRESPONSIVE' | 'DORMANT' | 'REACTIVATED';

const statusVariantMap: Record<LeadStatus, 'info' | 'warning' | 'success' | 'accent' | 'error' | 'neutral'> = {
  NEW:                   'info',
  CONTACTED:             'info',
  QUALIFYING:            'warning',
  QUALIFIED:             'success',
  ROUTING:               'success',
  ASSIGNED:              'success',
  APPOINTMENT_REQUESTED: 'success',
  APPOINTMENT_SCHEDULED: 'success',
  CONVERTED:             'accent',
  OPT_OUT:               'error',
  DISQUALIFIED:          'error',
  UNRESPONSIVE:          'neutral',
  DORMANT:               'neutral',
  REACTIVATED:           'info',
};

const statusLabels: Record<LeadStatus, string> = {
  NEW: 'New', CONTACTED: 'Contacted', QUALIFYING: 'Qualifying', QUALIFIED: 'Qualified',
  ROUTING: 'Routing', ASSIGNED: 'Assigned', APPOINTMENT_REQUESTED: 'Apt. Req.', APPOINTMENT_SCHEDULED: 'Scheduled',
  CONVERTED: 'Converted', OPT_OUT: 'Opt Out', DISQUALIFIED: 'Disqualified',
  UNRESPONSIVE: 'Unresponsive', DORMANT: 'Dormant', REACTIVATED: 'Reactivated',
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as LeadStatus;
  const variant = statusVariantMap[s] ?? 'neutral';
  const label = statusLabels[s] ?? status;
  return <Badge variant={variant} size="sm">{label}</Badge>;
}

