'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';

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

const SERVICE_META: Record<string, { label: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  api:      { label: 'API',         icon: 'globe' },
  worker:   { label: 'Worker',      icon: 'cpu' },
  database: { label: 'Database',    icon: 'database' },
  redis:    { label: 'Redis',       icon: 'queue' },
  twilio:   { label: 'Twilio',      icon: 'message' },
  vertexAI: { label: 'Vertex AI',   icon: 'bot' },
};

async function fetchHealth(): Promise<PlatformHealth> {
  const res = await fetch(`${API}/admin/health`, {
    headers: { 'x-admin-api-key': ADMIN_KEY },
  });
  if (!res.ok) throw new Error(`Failed: ${res.status}`);
  return res.json() as Promise<PlatformHealth>;
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

  const tone =
    health?.status === 'healthy'  ? { color: 'var(--green)',  bg: 'rgba(77,255,165,0.10)',  border: 'rgba(77,255,165,0.25)' } :
    health?.status === 'degraded' ? { color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)',  border: 'rgba(255,181,71,0.25)' } :
    health?.status === 'down'     ? { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)',   border: 'rgba(255,92,92,0.25)' } :
                                    { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border)' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Live · auto-refreshes every 30s</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.025em' }}>
            Platform health
          </h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {lastFetch && (
            <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
              <Icon name="clock" size={10} stroke={1.6} style={{ verticalAlign: 'middle', marginRight: 4 }} />
              {lastFetch}
            </span>
          )}
          {health && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '6px 14px',
                borderRadius: 100,
                background: tone.bg,
                border: `1px solid ${tone.border}`,
                color: tone.color,
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              <span style={{ position: 'relative', width: 8, height: 8 }}>
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '50%',
                    background: tone.color,
                    animation: 'pulseRing 2s ease-out infinite',
                    opacity: 0.5,
                  }}
                />
                <span style={{ position: 'absolute', inset: 0, borderRadius: '50%', background: tone.color, boxShadow: `0 0 8px ${tone.color}` }} />
              </span>
              {health.status}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div
          style={{
            padding: 16,
            borderRadius: 12,
            background: 'rgba(255,92,92,0.08)',
            border: '1px solid rgba(255,92,92,0.20)',
            color: 'var(--red)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13,
          }}
        >
          <Icon name="x-circle" size={16} stroke={1.8} />
          {error}
        </div>
      )}

      {health && (
        <>
          {/* Services */}
          <div className="card" style={{ marginBottom: 16, padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon name="layers" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Services</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 10 }}>
              {(Object.entries(health.services) as [keyof typeof health.services, 'up' | 'down'][]).map(([service, status]) => {
                const meta = SERVICE_META[service] ?? { label: service, icon: 'globe' as const };
                const isUp = status === 'up';
                return (
                  <div
                    key={service}
                    style={{
                      background: 'var(--bg-3)',
                      border: '1px solid',
                      borderColor: isUp ? 'rgba(77,255,165,0.18)' : 'rgba(255,92,92,0.20)',
                      borderRadius: 11,
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 8,
                        background: isUp ? 'rgba(77,255,165,0.10)' : 'rgba(255,92,92,0.10)',
                        color: isUp ? 'var(--green)' : 'var(--red)',
                        border: '1px solid',
                        borderColor: isUp ? 'rgba(77,255,165,0.22)' : 'rgba(255,92,92,0.22)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Icon name={meta.icon} size={14} stroke={1.8} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                        {meta.label}
                      </div>
                      <div
                        style={{
                          fontSize: 10,
                          color: isUp ? 'var(--green)' : 'var(--red)',
                          fontFamily: "'JetBrains Mono', monospace",
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          marginTop: 2,
                        }}
                      >
                        {status}
                      </div>
                    </div>
                    <span className={`status-dot ${isUp ? 'green' : 'red'}`} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Metrics */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon name="activity" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
              <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>24-hour metrics</h2>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
              {(
                [
                  { label: 'AI p95',         value: `${health.metrics.aiLatencyP95Ms}ms`,     icon: 'bot',     color: 'var(--purple)' },
                  { label: 'Twilio p95',     value: `${health.metrics.twilioLatencyP95Ms}ms`, icon: 'message', color: 'var(--blue)' },
                  { label: 'Queue lag',      value: `${health.metrics.queueLagMs}ms`,         icon: 'queue',   color: 'var(--amber)' },
                  { label: 'CRM sync rate',  value: `${health.metrics.crmSyncSuccessRate}%`,  icon: 'sliders', color: 'var(--green)' },
                  { label: 'Active workspaces', value: health.metrics.activeWorkspaces,       icon: 'building',color: 'var(--accent)' },
                  { label: 'Leads (24h)',    value: health.metrics.totalLeads24h.toLocaleString(), icon: 'layers', color: 'var(--accent)' },
                ] as { label: string; value: string | number; icon: Parameters<typeof Icon>[0]['name']; color: string }[]
              ).map(m => (
                <div
                  key={m.label}
                  style={{
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    borderRadius: 11,
                    padding: '16px 18px',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      position: 'absolute',
                      top: -25,
                      right: -25,
                      width: 80,
                      height: 80,
                      borderRadius: '50%',
                      background: `radial-gradient(circle, ${m.color}1a, transparent 70%)`,
                      filter: 'blur(15px)',
                      pointerEvents: 'none',
                    }}
                  />
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, position: 'relative' }}>
                    <Icon name={m.icon} size={12} stroke={1.8} style={{ color: m.color }} />
                    <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{m.label}</span>
                  </div>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 600,
                      color: m.color,
                      fontFamily: "'JetBrains Mono', monospace",
                      textShadow: `0 0 12px ${m.color}33`,
                      position: 'relative',
                    }}
                  >
                    {m.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {!health && !error && (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
          <Icon name="loader" size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          Loading health data&hellip;
        </div>
      )}
    </div>
  );
}
