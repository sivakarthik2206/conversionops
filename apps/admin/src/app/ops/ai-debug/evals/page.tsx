'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';

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

interface EvalRow extends EvalResult { content?: string; }

function HScore({ s, kind = 'lower' }: { s: number | null; kind?: 'lower' | 'higher' }) {
  if (s === null) return <span style={{ color: 'var(--text-5)' }}>—</span>;
  // kind 'lower' → low is good (hallucination)
  // kind 'higher' → high is good (relevance, booking intent, tone)
  const isGood = kind === 'lower' ? s <= 0.3 : s >= 0.7;
  const isBad = kind === 'lower' ? s > 0.6 : s < 0.3;
  const color = isBad ? 'var(--red)' : isGood ? 'var(--green)' : 'var(--amber)';

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: "'JetBrains Mono', monospace" }}>
      <span style={{ color, fontWeight: 600, fontSize: 12 }}>{s.toFixed(2)}</span>
      <span
        style={{
          width: 28,
          height: 4,
          borderRadius: 100,
          background: 'var(--bg-4)',
          overflow: 'hidden',
          display: 'inline-block',
        }}
      >
        <span
          style={{
            display: 'block',
            height: '100%',
            width: `${Math.min(100, s * 100)}%`,
            background: color,
            borderRadius: 100,
            boxShadow: `0 0 4px ${color}`,
          }}
        />
      </span>
    </span>
  );
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
      if (res.ok) setEvals((await res.json()) as EvalRow[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [wsFilter]);

  useEffect(() => { void fetchEvals(); }, [fetchEvals]);

  function toggleSort(col: keyof EvalRow) {
    if (sortCol === col) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortCol(col); setSortDir('desc'); }
  }

  const filtered = evals
    .filter(e => !wsFilter || e.workspaceId.includes(wsFilter))
    .filter(e => hThreshold === 0 || (e.hallucinationScore ?? 0) >= hThreshold)
    .sort((a, b) => {
      const av = a[sortCol];
      const bv = b[sortCol];
      if (av === null || av === undefined) return 1;
      if (bv === null || bv === undefined) return -1;
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === 'asc' ? cmp : -cmp;
    });

  function exportCsv() {
    const csv = [
      ['messageId', 'workspaceId', 'relevance', 'hallucination', 'bookingIntent', 'qualProgress', 'tone', 'createdAt'].join(','),
      ...filtered.map(e =>
        [
          e.messageId,
          e.workspaceId,
          e.relevanceScore ?? '',
          e.hallucinationScore ?? '',
          e.bookingIntentScore ?? '',
          e.qualProgressScore ?? '',
          e.toneScore ?? '',
          e.createdAt,
        ].join(','),
      ),
    ].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evals-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const SortHeader = ({ col, label }: { col: keyof EvalRow; label: string }) => (
    <th
      style={{ cursor: 'pointer', userSelect: 'none' }}
      onClick={() => toggleSort(col)}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
        {label}
        {sortCol === col && (
          <Icon name={sortDir === 'asc' ? 'arrow-up' : 'arrow-down'} size={9} stroke={2.4} style={{ color: 'var(--accent)' }} />
        )}
      </span>
    </th>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Quality · AIEvalResults</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 4px', fontWeight: 400, letterSpacing: '-0.025em' }}>
            Eval browser
          </h1>
        </div>
        <button onClick={exportCsv} className="btn-ghost">
          <Icon name="download" size={12} stroke={1.8} />
          Export CSV
        </button>
      </div>

      <div
        className="card"
        style={{
          marginBottom: 16,
          padding: 18,
          display: 'flex',
          alignItems: 'flex-end',
          gap: 16,
        }}
      >
        <div style={{ flex: 1 }}>
          <label className="eyebrow" style={{ color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
            Workspace ID filter
          </label>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={13} stroke={1.8} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input
              type="text"
              placeholder="Filter by workspace ID…"
              value={wsFilter}
              onChange={e => setWsFilter(e.target.value)}
              style={{ paddingLeft: 32 }}
            />
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <label className="eyebrow" style={{ color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
            Min hallucination ·{' '}
            <span style={{ color: hThreshold > 0.6 ? 'var(--red)' : hThreshold > 0.3 ? 'var(--amber)' : 'var(--green)', fontWeight: 700 }}>
              {hThreshold.toFixed(1)}
            </span>
          </label>
          <input
            type="range"
            min={0}
            max={1}
            step={0.1}
            value={hThreshold}
            onChange={e => setHThreshold(Number(e.target.value))}
            style={{
              width: '100%',
              accentColor: 'var(--accent)',
              height: 6,
            }}
          />
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Icon name="loader" size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          Loading eval results&hellip;
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <SortHeader col="messageId" label="Message" />
                <SortHeader col="workspaceId" label="Workspace" />
                <SortHeader col="relevanceScore" label="Relevance" />
                <SortHeader col="hallucinationScore" label="Hallucination" />
                <SortHeader col="bookingIntentScore" label="Booking" />
                <SortHeader col="qualProgressScore" label="Qual" />
                <SortHeader col="createdAt" label="Run at" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(e => {
                const isRed = (e.hallucinationScore ?? 0) > 0.6;
                const isAmber = (e.hallucinationScore ?? 0) > 0.3 && !isRed;
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    style={{
                      cursor: 'pointer',
                      background: isRed ? 'rgba(255,92,92,0.04)' : isAmber ? 'rgba(255,181,71,0.04)' : undefined,
                    }}
                  >
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-2)' }}>
                      {e.messageId.slice(0, 14)}…
                    </td>
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: 'var(--text-3)' }}>
                      {e.workspaceId.slice(0, 14)}…
                    </td>
                    <td><HScore s={e.relevanceScore} kind="higher" /></td>
                    <td><HScore s={e.hallucinationScore} kind="lower" /></td>
                    <td><HScore s={e.bookingIntentScore} kind="higher" /></td>
                    <td><HScore s={e.qualProgressScore} kind="higher" /></td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(e.createdAt).toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div
            style={{
              padding: '12px 18px',
              fontSize: 11,
              color: 'var(--text-4)',
              fontFamily: "'JetBrains Mono', monospace",
              borderTop: '1px solid var(--border)',
              background: 'var(--bg-3)',
            }}
          >
            Showing {filtered.length} of {evals.length} results
          </div>
        </div>
      )}

      {/* Detail drawer */}
      {selected && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 99 }}
            onClick={() => setSelected(null)}
          />
          <div
            style={{
              position: 'fixed',
              right: 0,
              top: 0,
              bottom: 0,
              width: 480,
              background: 'linear-gradient(180deg, var(--bg-2), var(--bg))',
              borderLeft: '1px solid var(--border-light)',
              padding: 24,
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.25s ease both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
              <div>
                <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Eval detail</p>
                <h3 className="serif" style={{ fontSize: 20, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
                  Quality scores
                </h3>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
                <Icon name="x" size={13} stroke={2} />
              </button>
            </div>

            <div
              style={{
                background: 'var(--bg-3)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '10px 12px',
                marginBottom: 18,
                fontSize: 11,
                fontFamily: "'JetBrains Mono', monospace",
                color: 'var(--text-2)',
                wordBreak: 'break-all',
              }}
            >
              <div className="eyebrow" style={{ color: 'var(--text-4)', marginBottom: 4 }}>Message ID</div>
              {selected.messageId}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Relevance',      value: selected.relevanceScore,     kind: 'higher' as const },
                { label: 'Hallucination',  value: selected.hallucinationScore, kind: 'lower' as const },
                { label: 'Booking intent', value: selected.bookingIntentScore, kind: 'higher' as const },
                { label: 'Qual progress',  value: selected.qualProgressScore,  kind: 'higher' as const },
                { label: 'Tone',           value: selected.toneScore,          kind: 'higher' as const },
              ].map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  <HScore s={row.value} kind={row.kind} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
