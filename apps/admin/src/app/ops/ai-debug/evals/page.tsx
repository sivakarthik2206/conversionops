'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface EvalResult {
  id: string;
  messageId: string;
  workspaceId: string;
  relevanceScore: number | null;
  hallucinationScore: number | null;
  bookingIntentScore: number | null;
  qualProgressScore: number | null;
  toneScore: number | null;
  runAt?: string;
  createdAt: string;
}

interface EvalRow extends EvalResult {
  content?: string;
}

function HScore({ s }: { s: number | null }) {
  if (s === null) return <span style={{ color: 'var(--text-3)' }}>—</span>;
  const color = s > 0.6 ? 'var(--red)' : s > 0.3 ? 'var(--amber)' : 'var(--green)';
  return <span style={{ color, fontWeight: 600 }}>{s.toFixed(2)}</span>;
}

export default function EvalsPage() {
  const [evals, setEvals] = useState<EvalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [wsFilter, setWsFilter] = useState('');
  const [hThreshold, setHThreshold] = useState(0);
  const [sortCol, setSortCol] = useState<keyof EvalRow>('createdAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<EvalRow | null>(null);

  const fetchEvals = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (wsFilter) params.set('workspaceId', wsFilter);
      const res = await fetch(`${API}/admin/evals?${params}`, {
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
      if (res.ok) {
        setEvals(await res.json() as EvalRow[]);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [wsFilter]);

  useEffect(() => { void fetchEvals(); }, [fetchEvals]);

  function toggleSort(col: keyof EvalRow) {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
  }

  const filtered = evals
    .filter((e) => !wsFilter || e.workspaceId.includes(wsFilter))
    .filter((e) => hThreshold === 0 || (e.hallucinationScore ?? 0) >= hThreshold)
    .sort((a, b) => {
      const av = a[sortCol]; const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  const SortHeader = ({ col, label }: { col: keyof EvalRow; label: string }) => (
    <th style={{ cursor: 'pointer', userSelect: 'none' }} onClick={() => toggleSort(col)}>
      {label} {sortCol === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
    </th>
  );

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>AI Eval Results</h1>

      <div className="card" style={{ marginBottom: 16, display: 'flex', gap: 16, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>WORKSPACE ID FILTER</label>
          <input type="text" placeholder="Filter by workspace ID..." value={wsFilter} onChange={(e) => setWsFilter(e.target.value)} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 11, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>
            MIN HALLUCINATION SCORE: {hThreshold.toFixed(1)}
          </label>
          <input
            type="range" min={0} max={1} step={0.1}
            value={hThreshold}
            onChange={(e) => setHThreshold(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <button className="btn-ghost" onClick={() => {
          const csv = [
            ['messageId', 'workspaceId', 'relevance', 'hallucination', 'bookingIntent', 'qualProgress', 'tone', 'createdAt'].join(','),
            ...filtered.map((e) => [
              e.messageId, e.workspaceId,
              e.relevanceScore ?? '', e.hallucinationScore ?? '',
              e.bookingIntentScore ?? '', e.qualProgressScore ?? '',
              e.toneScore ?? '', e.createdAt,
            ].join(',')),
          ].join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url; a.download = 'evals.csv'; a.click();
          URL.revokeObjectURL(url);
        }}>
          Export CSV
        </button>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 48 }}>Loading...</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <SortHeader col="messageId" label="Message ID" />
                <SortHeader col="workspaceId" label="Workspace" />
                <SortHeader col="relevanceScore" label="Relevance" />
                <SortHeader col="hallucinationScore" label="Hallucination" />
                <SortHeader col="bookingIntentScore" label="Booking Intent" />
                <SortHeader col="qualProgressScore" label="Qual Progress" />
                <SortHeader col="createdAt" label="Run At" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((e) => (
                <tr
                  key={e.id}
                  onClick={() => setSelected(e)}
                  style={{
                    cursor: 'pointer',
                    background: (e.hallucinationScore ?? 0) > 0.6 ? 'rgba(255,71,71,0.05)'
                      : (e.hallucinationScore ?? 0) > 0.3 ? 'rgba(255,179,71,0.05)' : undefined,
                  }}
                >
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.messageId.slice(0, 16)}...</td>
                  <td style={{ fontFamily: 'monospace', fontSize: 11 }}>{e.workspaceId.slice(0, 16)}...</td>
                  <td><HScore s={e.relevanceScore} /></td>
                  <td><HScore s={e.hallucinationScore} /></td>
                  <td><HScore s={e.bookingIntentScore} /></td>
                  <td><HScore s={e.qualProgressScore} /></td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)' }}>{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 12 }}>
            Showing {filtered.length} of {evals.length} results
          </div>
        </div>
      )}

      {selected && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 480,
          background: 'var(--bg-2)', borderLeft: '1px solid var(--border)',
          padding: 24, overflowY: 'auto', zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700 }}>Eval Detail</h3>
            <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelected(null)}>✕</button>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'monospace', color: 'var(--text-2)', marginBottom: 16 }}>
            {selected.messageId}
          </div>
          {[
            { label: 'Relevance', value: selected.relevanceScore },
            { label: 'Hallucination', value: selected.hallucinationScore },
            { label: 'Booking Intent', value: selected.bookingIntentScore },
            { label: 'Qual Progress', value: selected.qualProgressScore },
            { label: 'Tone', value: selected.toneScore },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ color: 'var(--text-3)', fontSize: 13 }}>{label}</span>
              <HScore s={value} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
