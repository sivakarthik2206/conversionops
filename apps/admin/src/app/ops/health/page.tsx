'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface HealthData {
  status: 'healthy' | 'degraded' | 'down';
  aiP50Ms: number;
  aiP95Ms: number;
  twilioP95Ms: number;
  worstQueueLag: number;
  crmSuccessRate: number;
  checkedAt: string;
}

const QUEUE_NAMES = [
  'lead-intake', 'ai-response', 'qualification', 'lead-routing',
  'appointment-booking', 'crm-sync', 'missed-call', 'reactivation',
  'notification', 'analytics-ingest', 'audit-log', 'retention',
];

function statusColor(status: 'healthy' | 'degraded' | 'down'): string {
  if (status === 'healthy') return 'var(--green)';
  if (status === 'degraded') return 'var(--amber)';
  return 'var(--red)';
}

function MetricCard({ label, value, unit, warn }: { label: string; value: number; unit: string; warn?: boolean }) {
  return (
    <div className="card">
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color: warn ? 'var(--amber)' : 'var(--text)' }}>
        {value.toLocaleString()}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>{unit}</div>
    </div>
  );
}

export default function HealthPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API}/admin/health`, {
        headers: { 'x-admin-api-key': ADMIN_KEY },
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json() as HealthData;
        setHealth(data);
        setLastFetch(new Date());
      }
    } catch {
      // health endpoint may not be available
    }
  }, []);

  useEffect(() => {
    void fetchHealth();
    const interval = setInterval(() => { void fetchHealth(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Platform Health</h1>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Auto-refreshes every 30s{lastFetch ? ` · Last: ${lastFetch.toLocaleTimeString()}` : ''}
        </div>
      </div>

      {health ? (
        <>
          <div style={{
            background: health.status === 'healthy' ? 'rgba(71,255,142,0.08)' : health.status === 'degraded' ? 'rgba(255,179,71,0.08)' : 'rgba(255,71,71,0.08)',
            border: `1px solid ${statusColor(health.status)}30`,
            borderRadius: 12,
            padding: '16px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 12,
          }}>
            <span className={`status-dot ${health.status === 'healthy' ? 'green' : health.status === 'degraded' ? 'amber' : 'red'}`} />
            <span style={{ fontWeight: 700, fontSize: 18, color: statusColor(health.status), textTransform: 'uppercase' }}>
              {health.status}
            </span>
            <span style={{ color: 'var(--text-2)', fontSize: 13, marginLeft: 8 }}>
              Platform is {health.status === 'healthy' ? 'operating normally' : health.status === 'degraded' ? 'experiencing degraded performance' : 'down or critically degraded'}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 32 }}>
            <MetricCard label="AI Latency p50" value={health.aiP50Ms} unit="milliseconds" />
            <MetricCard label="AI Latency p95" value={health.aiP95Ms} unit="milliseconds" warn={health.aiP95Ms > 5000} />
            <MetricCard label="Twilio SMS p95" value={health.twilioP95Ms} unit="milliseconds" warn={health.twilioP95Ms > 3000} />
            <MetricCard label="Worst Queue Lag" value={health.worstQueueLag} unit="jobs waiting" warn={health.worstQueueLag > 100} />
            <MetricCard label="CRM Success Rate" value={health.crmSuccessRate} unit="percent" warn={health.crmSuccessRate < 90} />
          </div>
        </>
      ) : (
        <div className="card" style={{ color: 'var(--text-3)', padding: 48, textAlign: 'center' }}>Loading health data...</div>
      )}

      <div className="card">
        <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Queue Status</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {QUEUE_NAMES.map((q) => (
            <div key={q} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8 }}>
              <span className="status-dot green" />
              <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{q}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
