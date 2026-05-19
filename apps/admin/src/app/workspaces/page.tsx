'use client';
import { useState, useEffect, useCallback } from 'react';

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

function planBadge(plan: string): string {
  if (plan === 'ENTERPRISE') return 'badge-accent';
  if (plan === 'BROKERAGE') return 'badge-blue';
  return 'badge-muted';
}

function statusBadge(status: string): string {
  if (status === 'ACTIVE') return 'badge-green';
  if (status === 'SUSPENDED') return 'badge-red';
  if (status === 'CANCELLED') return 'badge-red';
  return 'badge-muted';
}

export default function WorkspacesPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Workspace | null>(null);
  const [actioning, setActioning] = useState<string | null>(null);

  const fetchWorkspaces = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/workspaces`, {
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
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

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Workspaces</h1>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 48 }}>Loading...</div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Plan</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Agents</th>
                <th style={{ textAlign: 'right' }}>Leads</th>
                <th>Token Usage</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {workspaces.map((ws) => (
                <tr key={ws.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(ws)}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{ws.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'monospace' }}>{ws.slug}</div>
                  </td>
                  <td><span className={`badge ${planBadge(ws.plan)}`}>{ws.plan}</span></td>
                  <td><span className={`badge ${statusBadge(ws.status)}`}>{ws.status}</span></td>
                  <td style={{ textAlign: 'right' }}>{ws.agentCount}</td>
                  <td style={{ textAlign: 'right' }}>{ws.totalLeads.toLocaleString()}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        flex: 1, height: 6, background: 'var(--bg-4)', borderRadius: 3, overflow: 'hidden',
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${ws.tokenQuotaMonthly > 0 ? Math.min(100, (ws.tokenUsageCurrentMonth / ws.tokenQuotaMonthly) * 100) : 0}%`,
                          background: ws.tokenUsageCurrentMonth / ws.tokenQuotaMonthly > 0.8 ? 'var(--red)' : 'var(--accent)',
                          borderRadius: 3,
                        }} />
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', minWidth: 36 }}>
                        {ws.tokenQuotaMonthly > 0 ? `${Math.round((ws.tokenUsageCurrentMonth / ws.tokenQuotaMonthly) * 100)}%` : '—'}
                      </span>
                    </div>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>
                    {new Date(ws.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, width: 400,
          background: 'var(--bg-2)', borderLeft: '1px solid var(--border)',
          padding: 24, overflowY: 'auto', zIndex: 100,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700 }}>{selected.name}</h3>
            <button className="btn-ghost" style={{ padding: '4px 8px' }} onClick={() => setSelected(null)}>✕</button>
          </div>

          {[
            { label: 'Workspace ID', value: selected.id },
            { label: 'Slug', value: selected.slug },
            { label: 'Owner', value: selected.ownerEmail },
            { label: 'Plan', value: selected.plan },
            { label: 'Status', value: selected.status },
            { label: 'Agents', value: String(selected.agentCount) },
            { label: 'Total Leads', value: selected.totalLeads.toLocaleString() },
            { label: 'Token Usage', value: `${selected.tokenUsageCurrentMonth.toLocaleString()} / ${selected.tokenQuotaMonthly.toLocaleString()}` },
          ].map(({ label, value }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{label}</span>
              <span style={{ fontSize: 12, fontFamily: 'monospace' }}>{value}</span>
            </div>
          ))}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8, display: 'flex', gap: 8 }}>
            {selected.status !== 'SUSPENDED' ? (
              <button
                className="btn-danger"
                onClick={() => { void suspend(selected); }}
                disabled={actioning === selected.id}
                style={{ flex: 1 }}
              >
                Suspend Workspace
              </button>
            ) : (
              <button
                className="btn-primary"
                onClick={() => { void reactivate(selected); }}
                disabled={actioning === selected.id}
                style={{ flex: 1 }}
              >
                Reactivate Workspace
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
