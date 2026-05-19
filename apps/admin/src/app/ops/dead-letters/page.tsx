'use client';
import { useState, useEffect, useCallback } from 'react';

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
    const results = await Promise.all(QUEUE_NAMES.map(async (q) => {
      try {
        const res = await fetch(`${API}/admin/queues/${q}/failed`, {
          headers: { 'x-admin-api-key': ADMIN_KEY },
        });
        if (!res.ok) return [];
        const data = await res.json() as Array<Omit<DeadLetter, 'queue'>>;
        return data.map((j) => ({ ...j, queue: q }));
      } catch {
        return [];
      }
    }));
    const flat = results.flat().sort((a, b) => (b.processedOn ?? 0) - (a.processedOn ?? 0));
    setJobs(flat);
    setLoading(false);
  }, []);

  useEffect(() => { void fetchAll(); }, [fetchAll]);

  async function retryJob(queue: string, id: string) {
    setRetrying(prev => new Set([...prev, id]));
    try {
      await fetch(`${API}/admin/queues/${queue}/jobs/${id}/retry`, {
        method: 'POST',
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
      await fetchAll();
    } finally {
      setRetrying(prev => { const s = new Set(prev); s.delete(id); return s; });
    }
  }

  async function retryAllJobs() {
    setShowConfirm(false);
    await Promise.all(
      QUEUE_NAMES.map((q) =>
        fetch(`${API}/admin/queues/${q}/retry-all`, {
          method: 'POST',
          headers: { 'x-admin-api-key': ADMIN_KEY },
        }).catch(() => undefined)
      )
    );
    await fetchAll();
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Dead Letters</h1>
          <p style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 4 }}>
            {jobs.length} failed job{jobs.length !== 1 ? 's' : ''} across all queues
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-ghost" onClick={() => { void fetchAll(); }}>Refresh</button>
          {jobs.length > 0 && (
            <button className="btn-danger" onClick={() => setShowConfirm(true)}>
              Retry all ({jobs.length})
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 999,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div className="card" style={{ width: 400 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Retry all failed jobs?</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
              This will re-enqueue {jobs.length} failed jobs across all queues.
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn-ghost" onClick={() => setShowConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={() => { void retryAllJobs(); }}>Confirm Retry All</button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 48 }}>Loading...</div>
      ) : jobs.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', color: 'var(--text-3)', padding: 48 }}>
          No failed jobs. All queues healthy.
        </div>
      ) : (
        <div className="card">
          <table>
            <thead>
              <tr>
                <th>Queue</th>
                <th>Job Type</th>
                <th>Error</th>
                <th style={{ textAlign: 'right' }}>Attempts</th>
                <th>Last Attempt</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {jobs.map((job) => (
                <tr key={`${job.queue}-${job.id}`}>
                  <td><span style={{ fontFamily: 'monospace', fontSize: 11 }}>{job.queue}</span></td>
                  <td style={{ fontSize: 12 }}>{job.name}</td>
                  <td style={{ color: 'var(--red)', fontSize: 12, maxWidth: 400 }}>
                    {(job.failedReason ?? '').slice(0, 200)}
                  </td>
                  <td style={{ textAlign: 'right' }}>{job.attemptsMade}</td>
                  <td style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(job.processedOn)}</td>
                  <td>
                    <button
                      className="btn-ghost"
                      style={{ fontSize: 11, padding: '3px 8px' }}
                      onClick={() => { void retryJob(job.queue, job.id); }}
                      disabled={retrying.has(job.id)}
                    >
                      {retrying.has(job.id) ? '...' : 'Retry'}
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
