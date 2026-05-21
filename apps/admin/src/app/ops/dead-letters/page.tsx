'use client';
import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface DeadLetter {
  id: string;
  queue: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  processedOn: number | null;
}

const QUEUE_NAMES = [
  'lead-intake', 'ai-response', 'qualification', 'lead-routing',
  'appointment-booking', 'crm-sync', 'missed-call', 'reactivation',
  'notification', 'analytics-ingest', 'audit-log', 'retention',
];

function timeAgo(ts: number | null): string {
  if (!ts) return 'unknown';
  const diff = Date.now() - ts;
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function DeadLettersPage() {
  const [jobs, setJobs] = useState<DeadLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<Set<string>>(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const fetchAll = useCallback(async () => {
    const results = await Promise.all(
      QUEUE_NAMES.map(async q => {
        try {
          const res = await fetch(`${API}/admin/queues/${q}/failed`, {
            headers: { 'x-admin-api-key': ADMIN_KEY },
          });
          if (!res.ok) return [];
          const data = (await res.json()) as Array<Omit<DeadLetter, 'queue'>>;
          return data.map(j => ({ ...j, queue: q }));
        } catch {
          return [];
        }
      }),
    );
    const flat = results.flat().sort((a, b) => (b.processedOn ?? 0) - (a.processedOn ?? 0));
    setJobs(flat);
    setLoading(false);
  }, []);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  async function retryJob(queue: string, id: string) {
    setRetrying(prev => new Set([...prev, id]));
    try {
      await fetch(`${API}/admin/queues/${queue}/jobs/${id}/retry`, {
        method: 'POST',
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
      await fetchAll();
    } finally {
      setRetrying(prev => {
        const s = new Set(prev);
        s.delete(id);
        return s;
      });
    }
  }

  async function retryAllJobs() {
    setShowConfirm(false);
    await Promise.all(
      QUEUE_NAMES.map(q =>
        fetch(`${API}/admin/queues/${q}/retry-all`, {
          method: 'POST',
          headers: { 'x-admin-api-key': ADMIN_KEY },
        }).catch(() => undefined),
      ),
    );
    await fetchAll();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Failed jobs · all queues</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 4px', fontWeight: 400, letterSpacing: '-0.025em' }}>
            Dead letters
            <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 14, marginLeft: 8 }}>
              {jobs.length}
            </span>
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => void fetchAll()} className="btn-ghost">
            <Icon name="reload" size={12} stroke={1.8} />
            Refresh
          </button>
          {jobs.length > 0 && (
            <button onClick={() => setShowConfirm(true)} className="btn-danger">
              <Icon name="reload" size={12} stroke={1.8} />
              Retry all ({jobs.length})
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card"
            style={{ width: 420, padding: 24 }}
            onClick={e => e.stopPropagation()}
          >
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255,92,92,0.12)',
                border: '1px solid rgba(255,92,92,0.28)',
                color: 'var(--red)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Icon name="reload" size={18} stroke={1.8} />
            </div>
            <h3 className="serif" style={{ fontSize: 22, color: 'var(--text)', margin: '0 0 8px', fontWeight: 400, letterSpacing: '-0.02em' }}>
              Retry {jobs.length} failed jobs?
            </h3>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 22px', lineHeight: 1.55 }}>
              This re-enqueues every failed job across all queues. Jobs that fail again will return to dead letters.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={() => void retryAllJobs()}>
                Confirm retry
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Icon name="loader" size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          Loading dead letters&hellip;
        </div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)' }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'rgba(77,255,165,0.10)',
              border: '1px solid rgba(77,255,165,0.22)',
              color: 'var(--green)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 14,
            }}
          >
            <Icon name="check-circle" size={26} stroke={1.6} />
          </div>
          <h3 className="serif" style={{ fontSize: 22, color: 'var(--text)', margin: '0 0 6px', fontWeight: 400 }}>
            All queues healthy.
          </h3>
          <p style={{ fontSize: 13, margin: 0 }}>No failed jobs in any queue.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>Queue</th>
                <th>Job type</th>
                <th>Error</th>
                <th style={{ textAlign: 'right' }}>Attempts</th>
                <th>Last attempt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map(job => (
                <tr key={`${job.queue}-${job.id}`}>
                  <td>
                    <span
                      style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 100,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border)',
                        color: 'var(--text-2)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        letterSpacing: '0.04em',
                      }}
                    >
                      {job.queue}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: 'var(--text-2)' }}>{job.name}</td>
                  <td style={{ color: 'var(--red)', fontSize: 11.5, maxWidth: 420, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                    {(job.failedReason ?? '').slice(0, 240)}
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: "'JetBrains Mono', monospace", color: 'var(--text)' }}>{job.attemptsMade}</td>
                  <td style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{timeAgo(job.processedOn)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className="btn-ghost"
                      onClick={() => void retryJob(job.queue, job.id)}
                      disabled={retrying.has(job.id)}
                      style={{ fontSize: 11, padding: '4px 10px' }}
                    >
                      {retrying.has(job.id) ? (
                        <Icon name="loader" size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
                      ) : (
                        <Icon name="reload" size={10} stroke={2} />
                      )}
                      Retry
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
