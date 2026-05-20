'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface PlatformHealth {
  status: 'healthy' | 'degraded' | 'down';
  lastUpdated: string;
  metrics: {
    aiLatencyP95Ms: number;
    twilioLatencyP95Ms: number;
    queueLagMs: number;
    crmSyncSuccessRate: number;
    activeWorkspaces: number;
    totalLeads24h: number;
  };
  services: {
    api: 'up' | 'down';
    worker: 'up' | 'down';
    database: 'up' | 'down';
    redis: 'up' | 'down';
    twilio: 'up' | 'down';
    vertexAI: 'up' | 'down';
  };
}

async function fetchHealth(): Promise<PlatformHealth> {
  const res = await fetch(`${API}/admin/health`, {
    headers: { Authorization: `Bearer ${ADMIN_KEY}` },
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json() as Promise<PlatformHealth>;
}

function statusColor(s: 'up' | 'down' | 'healthy' | 'degraded'): string {
  if (s === 'up' || s === 'healthy') return 'var(--green)';
  if (s === 'degraded') return 'var(--amber)';
  return 'var(--red)';
}

function statusBg(s: 'up' | 'down' | 'healthy' | 'degraded'): string {
  if (s === 'up' || s === 'healthy') return 'var(--green-dim)';
  if (s === 'degraded') return 'var(--amber-dim)';
  return 'var(--red-dim)';
}

export default function HealthPage() {
  const [health, setHealth] = useState<PlatformHealth | null>(null);
  const [error, setError] = useState('');
  const [lastFetch, setLastFetch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await fetchHealth();
      setHealth(data);
      setLastFetch(new Date().toLocaleTimeString());
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load health data');
    }
  }, []);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), 30000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <div style={{ padding: 32, background: 'var(--bg)', minHeight: '100vh', fontFamily: 'DM Sans, sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Platform Health</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: '4px 0 0' }}>Auto-refreshes every 30s · Last: {lastFetch || '—'}</p>
        </div>
        {health && (
          <div style={{ padding: '6px 16px', borderRadius: 8, background: statusBg(health.status), color: statusColor(health.status), fontSize: 13, fontWeight: 600 }}>
            {health.status.toUpperCase()}
          </div>
        )}
      </div>

      {error && (
        <div style={{ padding: 16, borderRadius: 8, background: 'var(--red-dim)', color: 'var(--red)', marginBottom: 24 }}>
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Services */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20, marginBottom: 24 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>Services</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
              {(Object.entries(health.services) as [string, 'up' | 'down'][]).map(([service, status]) => (
                <div key={service} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', textTransform: 'capitalize' }}>{service}</span>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: statusColor(status) }} />
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: 20 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 16 }}>24h Metrics</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
              {([
                { label: 'AI Latency p95', value: `${health.metrics.aiLatencyP95Ms}ms` },
                { label: 'Twilio Latency p95', value: `${health.metrics.twilioLatencyP95Ms}ms` },
                { label: 'Queue Lag', value: `${health.metrics.queueLagMs}ms` },
                { label: 'CRM Sync Rate', value: `${health.metrics.crmSyncSuccessRate}%` },
                { label: 'Active Workspaces', value: health.metrics.activeWorkspaces },
                { label: 'Leads (24h)', value: health.metrics.totalLeads24h },
              ] as { label: string; value: string | number }[]).map(({ label, value }) => (
                <div key={label} style={{ background: 'var(--bg-3)', borderRadius: 8, padding: '14px 16px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>{label}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--accent)', fontFamily: 'JetBrains Mono, monospace' }}>{value}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!health && !error && (
        <div style={{ color: 'var(--text-3)', textAlign: 'center', marginTop: 64 }}>Loading health data…</div>
      )}
    </div>
  );
}
