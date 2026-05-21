'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface Workspace {
  id: string;
  name: string;
  slug: string;
  plan: string;
  status: string;
  ownerEmail: string;
  agentCount: number;
  totalLeads: number;
  tokenUsageCurrentMonth: number;
  tokenQuotaMonthly: number;
  createdAt: string;
}

const PLAN_TONE: Record<string, string> = {
  ENTERPRISE: 'badge-accent',
  BROKERAGE:  'badge-blue',
  SOLO:       'badge-muted',
};

const STATUS_TONE: Record<string, string> = {
  ACTIVE:    'badge-green',
  SUSPENDED: 'badge-red',
  CANCELLED: 'badge-red',
};

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [planFilter, setPlanFilter] = useState('');

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/workspaces`, { headers: { 'x-admin-api-key': ADMIN_KEY } });
      if (res.ok) setWorkspaces(await res.json() as Workspace[]);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWorkspaces(); }, [fetchWorkspaces]);

  async function suspend(ws: Workspace) {
    if (!confirm(`Suspend workspace "${ws.name}"?`)) return;
    setActioning(ws.id);
    await fetch(`${API}/admin/workspaces/${ws.id}/suspend`, {
      method: 'POST',
      headers: { 'x-admin-api-key': ADMIN_KEY },
    });
    await fetchWorkspaces();
    setSelected(null);
    setActioning(null);
  }

  async function reactivate(ws: Workspace) {
    if (!confirm(`Reactivate workspace "${ws.name}"?`)) return;
    setActioning(ws.id);
    await fetch(`${API}/admin/workspaces/${ws.id}/reactivate`, {
      method: 'POST',
      headers: { 'x-admin-api-key': ADMIN_KEY },
    });
    await fetchWorkspaces();
    setSelected(null);
    setActioning(null);
  }

  const filtered = workspaces.filter(ws => {
    if (search && !ws.name.toLowerCase().includes(search.toLowerCase()) && !ws.slug.toLowerCase().includes(search.toLowerCase()) && !ws.ownerEmail.toLowerCase().includes(search.toLowerCase())) return false;
    if (planFilter && ws.plan !== planFilter) return false;
    return true;
  });

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Tenants</p>
          <h1 className="serif" style={{ fontSize: 26, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Workspaces
            <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, marginLeft: 8 }}>
              {workspaces.length}
            </span>
          </h1>
        </div>
        <button onClick={() => void fetchWorkspaces()} className="btn-ghost">
          <Icon name="reload" size={12} stroke={1.8} />
          Refresh
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', width: 320 }}>
          <Icon name="search" size={13} stroke={1.8} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name, slug, or owner email"
            style={{ paddingLeft: 32, height: 34 }}
          />
        </div>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} style={{ width: 160, height: 34 }}>
          <option value="">All plans</option>
          <option value="SOLO">Solo</option>
          <option value="BROKERAGE">Brokerage</option>
          <option value="ENTERPRISE">Enterprise</option>
        </select>
        {(search || planFilter) && (
          <button onClick={() => { setSearch(''); setPlanFilter(''); }} className="btn-ghost" style={{ height: 34 }}>
            <Icon name="x" size={11} stroke={2.2} />
            Clear
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Icon name="loader" size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          Loading workspaces&hellip;
        </div>
      ) : filtered.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)' }}>
          No workspaces match your filters.
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Workspace</th>
                <th>Plan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Agents</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
                <th>Token usage</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(ws => {
                const pct = ws.tokenQuotaMonthly > 0 ? Math.min(100, (ws.tokenUsageCurrentMonth / ws.tokenQuotaMonthly) * 100) : 0;
                return (
                  <tr key={ws.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(ws)}>
                    <td>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{ws.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
                        {ws.slug}
                      </div>
                    </td>
                    <td><span className={`badge ${PLAN_TONE[ws.plan] ?? 'badge-muted'}`}>{ws.plan}</span></td>
                    <td><span className={`badge ${STATUS_TONE[ws.status] ?? 'badge-muted'}`}>{ws.status}</span></td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{ws.agentCount}</td>
                    <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{ws.totalLeads.toLocaleString()}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 160 }}>
                        <div style={{ flex: 1, height: 4, background: 'var(--bg-4)', borderRadius: 100, overflow: 'hidden' }}>
                          <div
                            style={{
                              height: '100%',
                              width: `${pct}%`,
                              background:
                                pct > 80 ? 'var(--red)' :
                                pct > 60 ? 'var(--amber)' :
                                           'var(--accent)',
                              borderRadius: 100,
                              boxShadow: `0 0 6px ${pct > 80 ? 'var(--red)' : pct > 60 ? 'var(--amber)' : 'var(--accent)'}`,
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace", minWidth: 32, textAlign: 'right' }}>
                          {ws.tokenQuotaMonthly > 0 ? `${Math.round(pct)}%` : '—'}
                        </span>
                      </div>
                    </td>
                    <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {new Date(ws.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
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
              width: 440,
              background: 'linear-gradient(180deg, var(--bg-2), var(--bg))',
              borderLeft: '1px solid var(--border-light)',
              padding: 24,
              overflowY: 'auto',
              zIndex: 100,
              boxShadow: 'var(--shadow-xl)',
              animation: 'fadeIn 0.25s ease both',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name="building" size={15} stroke={1.8} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected.name}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", marginTop: 1 }}>
                    {selected.slug}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="btn-ghost" style={{ width: 30, height: 30, padding: 0, justifyContent: 'center' }}>
                <Icon name="x" size={13} stroke={2} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Workspace ID', value: selected.id, mono: true },
                { label: 'Owner', value: selected.ownerEmail },
                { label: 'Plan', value: <span className={`badge ${PLAN_TONE[selected.plan] ?? 'badge-muted'}`}>{selected.plan}</span> },
                { label: 'Status', value: <span className={`badge ${STATUS_TONE[selected.status] ?? 'badge-muted'}`}>{selected.status}</span> },
                { label: 'Agents', value: selected.agentCount.toString(), mono: true },
                { label: 'Total leads', value: selected.totalLeads.toLocaleString(), mono: true },
                { label: 'Token usage', value: `${selected.tokenUsageCurrentMonth.toLocaleString()} / ${selected.tokenQuotaMonthly.toLocaleString()}`, mono: true },
                { label: 'Created', value: new Date(selected.createdAt).toLocaleString() },
              ].map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  <span
                    style={{
                      fontSize: 12.5,
                      color: 'var(--text)',
                      fontFamily: row.mono ? "'JetBrains Mono', monospace" : 'inherit',
                      textAlign: 'right',
                      maxWidth: 240,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
              {selected.status !== 'SUSPENDED' ? (
                <button
                  className="btn-danger"
                  onClick={() => void suspend(selected)}
                  disabled={actioning === selected.id}
                  style={{ flex: 1, justifyContent: 'center', height: 38 }}
                >
                  {actioning === selected.id ? (
                    <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Icon name="pause" size={12} stroke={1.8} />
                  )}
                  Suspend
                </button>
              ) : (
                <button
                  className="btn-primary"
                  onClick={() => void reactivate(selected)}
                  disabled={actioning === selected.id}
                  style={{ flex: 1, justifyContent: 'center', height: 38 }}
                >
                  {actioning === selected.id ? (
                    <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
                  ) : (
                    <Icon name="play" size={12} stroke={1.8} />
                  )}
                  Reactivate
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
