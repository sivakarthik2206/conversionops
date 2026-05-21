import Link from 'next/link';
import { Icon } from '@/components/Icon';

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

const CARDS = [
  { href: '/ops/health',         icon: 'activity' as const, title: 'Platform health',  desc: 'AI latency, queue lag, Twilio p95, CRM success.',  color: 'var(--green)' },
  { href: '/ops/queues',         icon: 'queue' as const,    title: 'Queue inspector',  desc: 'All BullMQ queues. Retry failed jobs.',             color: 'var(--blue)' },
  { href: '/ops/dead-letters',   icon: 'inbox' as const,    title: 'Dead letters',     desc: 'Failed jobs across queues. Bulk retry.',            color: 'var(--red)' },
  { href: '/ops/ai-debug',       icon: 'flask' as const,    title: 'AI playground',    desc: 'Test qualification chain against any workspace.',    color: 'var(--accent)' },
  { href: '/ops/ai-debug/evals', icon: 'sliders' as const,  title: 'Eval browser',     desc: 'All AIEvalResults. Hallucination scores.',           color: 'var(--purple)' },
  { href: '/workspaces',         icon: 'building' as const, title: 'Workspaces',       desc: 'Suspend / reactivate. Token usage. Agent list.',     color: 'var(--amber)' },
];

export default async function AdminHomePage() {
  const [workspaces, health] = await Promise.all([fetchWorkspaces(), fetchHealth()]);
  const status = health?.status ?? 'unknown';
  const statusTone =
    status === 'healthy'  ? { color: 'var(--green)',  bg: 'rgba(77,255,165,0.10)',  border: 'rgba(77,255,165,0.25)' } :
    status === 'degraded' ? { color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)',  border: 'rgba(255,181,71,0.25)' } :
    status === 'down'     ? { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)',   border: 'rgba(255,92,92,0.25)' } :
                            { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' };

  const activeCount = workspaces.filter(w => w.status === 'ACTIVE').length;
  const totalLeads = workspaces.reduce((sum, w) => sum + (w.totalLeads ?? 0), 0);

  return (
    <div>
      {/* Hero */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Internal ops · live</p>
        <h1 className="serif" style={{ fontSize: 32, color: 'var(--text)', margin: '4px 0 8px', fontWeight: 400, letterSpacing: '-0.025em' }}>
          Operations{' '}
          <span style={{ fontStyle: 'italic', fontFamily: "'Instrument Serif', serif", color: 'var(--accent)' }}>
            console.
          </span>
        </h1>
        <p style={{ fontSize: 14, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
          Production observability and tenant administration. Restricted to staff over VPN / IP allowlist.
        </p>
      </div>

      {/* Top stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        <StatCard
          eyebrow="Platform status"
          value={status.toUpperCase()}
          icon="activity"
          color={statusTone.color}
          tag={
            health
              ? <span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>AI p95 {health.aiP95Ms}ms · queue lag {health.worstQueueLag}</span>
              : null
          }
        />
        <StatCard
          eyebrow="Total workspaces"
          value={workspaces.length.toString()}
          icon="building"
          color="var(--blue)"
          tag={<span style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{activeCount} active</span>}
        />
        <StatCard
          eyebrow="Leads (all time)"
          value={totalLeads.toLocaleString()}
          icon="layers"
          color="var(--accent)"
        />
      </div>

      {/* Card grid */}
      <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 10 }}>Tools</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {CARDS.map(card => (
          <Link key={card.href} href={card.href} style={{ textDecoration: 'none' }}>
            <div
              className="card"
              style={{
                padding: 20,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                cursor: 'pointer',
                transition: 'all 0.3s var(--ease-out-quart)',
                position: 'relative',
                overflow: 'hidden',
                minHeight: 156,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: -40,
                  right: -40,
                  width: 130,
                  height: 130,
                  borderRadius: '50%',
                  background: `radial-gradient(circle, ${card.color}1a, transparent 70%)`,
                  filter: 'blur(20px)',
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: `${card.color}14`,
                  border: `1px solid ${card.color}33`,
                  color: card.color,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                <Icon name={card.icon} size={16} stroke={1.8} />
              </div>
              <div style={{ position: 'relative' }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.01em' }}>
                  {card.title}
                </h3>
                <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: '6px 0 0', lineHeight: 1.55 }}>
                  {card.desc}
                </p>
              </div>
              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: card.color, fontFamily: "'JetBrains Mono', monospace", textTransform: 'uppercase', letterSpacing: '0.06em', position: 'relative' }}>
                Open
                <Icon name="arrow-right" size={10} stroke={2.2} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

function StatCard({
  eyebrow, value, icon, color, tag,
}: {
  eyebrow: string;
  value: string;
  icon: Parameters<typeof Icon>[0]['name'];
  color: string;
  tag?: React.ReactNode;
}) {
  return (
    <div
      className="card"
      style={{ position: 'relative', overflow: 'hidden', padding: 18 }}
    >
      <div
        style={{
          position: 'absolute',
          top: -40,
          right: -40,
          width: 140,
          height: 140,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}14, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, position: 'relative' }}>
        <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{eyebrow}</span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `${color}14`,
            border: `1px solid ${color}33`,
            color,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={icon} size={13} stroke={1.8} />
        </div>
      </div>
      <div
        className="serif"
        style={{ fontSize: 30, lineHeight: 1, color: 'var(--text)', fontWeight: 400, marginBottom: 6, position: 'relative', fontFamily: 'inherit' }}
      >
        {value}
      </div>
      {tag && <div style={{ position: 'relative' }}>{tag}</div>}
    </div>
  );
}
