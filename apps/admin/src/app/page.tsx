const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['ADMIN_API_KEY'] ?? '';

interface WorkspaceSummary {
  id: string;
  name: string;
  plan: string;
  status: string;
  totalLeads: number;
}

interface HealthSummary {
  status: 'healthy' | 'degraded' | 'down';
  aiP95Ms: number;
  worstQueueLag: number;
}

async function fetchWorkspaces(): Promise<WorkspaceSummary[]> {
  try {
    const res = await fetch(`${API}/admin/workspaces`, {
      headers: { 'x-admin-api-key': ADMIN_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

async function fetchHealth(): Promise<HealthSummary | null> {
  try {
    const res = await fetch(`${API}/workspaces/me/health`, {
      headers: { 'x-admin-api-key': ADMIN_KEY },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function AdminHomePage() {
  const [workspaces, health] = await Promise.all([fetchWorkspaces(), fetchHealth()]);

  const statusColor = health?.status === 'healthy' ? 'green'
    : health?.status === 'degraded' ? 'amber'
    : health?.status === 'down' ? 'red'
    : 'muted';

  return (
    <div>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>ConversionOps Ops Console</h1>
      <p style={{ color: 'var(--text-2)', marginBottom: 32 }}>Internal tools — deploy behind VPN or IP allowlist.</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>PLATFORM STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span className={`status-dot ${statusColor}`} />
            <span style={{ fontSize: 20, fontWeight: 700, textTransform: 'uppercase' }}>
              {health?.status ?? 'Unknown'}
            </span>
          </div>
          {health && (
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-2)' }}>
              AI p95: {health.aiP95Ms}ms · Queue lag: {health.worstQueueLag}
            </div>
          )}
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>TOTAL WORKSPACES</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>{workspaces.length}</div>
          <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
            Active: {workspaces.filter(w => w.status === 'ACTIVE').length}
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>TOTAL LEADS (ALL TIME)</div>
          <div style={{ fontSize: 32, fontWeight: 700 }}>
            {workspaces.reduce((sum, w) => sum + (w.totalLeads ?? 0), 0).toLocaleString()}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
        {[
          { href: '/ops/health', title: 'Platform Health', desc: 'AI latency, queue lag, Twilio p95, CRM success rate. Auto-refreshes every 30s.' },
          { href: '/ops/queues', title: 'Queue Inspector', desc: 'All 12 BullMQ queues: waiting, active, failed counts. Retry failed jobs.' },
          { href: '/ops/dead-letters', title: 'Dead Letters', desc: 'Failed jobs across all queues. Bulk retry. Error details.' },
          { href: '/ops/ai-debug', title: 'AI Playground', desc: 'Test qualification chain against any workspace config. Eval scores.' },
          { href: '/ops/ai-debug/evals', title: 'Eval Browser', desc: 'All AIEvalResults. Hallucination scores. Filter and sort.' },
          { href: '/workspaces', title: 'Workspaces', desc: 'All workspaces. Suspend / reactivate. Token usage. Agent list.' },
        ].map(({ href, title, desc }) => (
          <a key={href} href={href} style={{ textDecoration: 'none' }}>
            <div className="card" style={{ cursor: 'pointer', transition: 'border-color 0.15s', borderColor: 'var(--border)' }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{desc}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
