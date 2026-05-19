'use client';
import { useState, useEffect, useCallback } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface QueueStats {
  name: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface FailedJob {
  id: string;
  name: string;
  failedReason: string;
  attemptsMade: number;
  processedOn: number;
}

const QUEUE_NAMES = [
  'lead-intake', 'ai-response', 'qualification', 'lead-routing',
  'appointment-booking', 'crm-sync', 'missed-call', 'reactivation',
  'notification', 'analytics-ingest', 'audit-log', 'retention',
];

async function fetchQueueStats(name: string): Promise<QueueStats> {
  try {
    const res = await fetch(`${API}/admin/queues/${name}`, {
      headers: { 'x-admin-api-key': ADMIN_KEY },
    });
    if (res.ok) return res.json() as Promise<QueueStats>;
  } catch {
    // fallthrough
  }
  return { name, waiting: 0, active: 0, completed: 0, failed: 0, delayed: 0 };
}

async function fetchFailedJobs(name: string): Promise<FailedJob[]> {
  try {
    const res = await fetch(`${API}/admin/queues/${name}/failed`, {
      headers: { 'x-admin-api-key': ADMIN_KEY },
    });
    if (res.ok) return res.json() as Promise<FailedJob[]>;
  } catch {
    // fallthrough
  }
  return [];
}

async function retryAll(name: string): Promise<void> {
  await fetch(`${API}/admin/queues/${name}/retry-all`, {
    method: 'POST',
    headers: { 'x-admin-api-key': ADMIN_KEY },
  });
}

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [expandedQueue, setExpandedQueue] = useState<string | null>(null);
  const [failedJobs, setFailedJobs] = useState<FailedJob[]>([]);
  const [lastFetch, setLastFetch] = useState<Date | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    const results = await Promise.all(QUEUE_NAMES.map(fetchQueueStats));
    setQueues(results);
    setLastFetch(new Date());
  }, []);

  useEffect(() => {
    void fetchAll();
    const interval = setInterval(() => { void fetchAll(); }, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  async function handleExpand(name: string) {
    if (expandedQueue === name) {
      setExpandedQueue(null);
      return;
    }
    setExpandedQueue(name);
    const jobs = await fetchFailedJobs(name);
    setFailedJobs(jobs);
  }

  async function handleRetryAll(name: string) {
    if (!confirm(`Retry all failed jobs in ${name}?`)) return;
    setRetrying(name);
    await retryAll(name);
    await fetchAll();
    setRetrying(null);
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Queue Inspector</h1>
        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>
          Auto-refreshes every 15s{lastFetch ? ` · Last: ${lastFetch.toLocaleTimeString()}` : ''}
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th style={{ textAlign: 'right' }}>Waiting</th>
              <th style={{ textAlign: 'right' }}>Active</th>
              <th style={{ textAlign: 'right' }}>Completed</th>
              <th style={{ textAlign: 'right' }}>Failed</th>
              <th style={{ textAlign: 'right' }}>Delayed</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {queues.map((q) => (
              <>
                <tr key={q.name} style={{ cursor: 'pointer' }} onClick={() => handleExpand(q.name)}>
                  <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{q.name}</td>
                  <td style={{ textAlign: 'right', color: q.waiting > 0 ? 'var(--amber)' : undefined }}>{q.waiting}</td>
                  <td style={{ textAlign: 'right', color: q.active > 0 ? 'var(--blue)' : undefined }}>{q.active}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-3)' }}>{q.completed}</td>
                  <td style={{ textAlign: 'right', color: q.failed > 0 ? 'var(--red)' : undefined }}>{q.failed}</td>
                  <td style={{ textAlign: 'right', color: 'var(--text-3)' }}>{q.delayed}</td>
                  <td style={{ textAlign: 'right' }}>
                    {q.failed > 0 && (
                      <button
                        className="btn-danger"
                        style={{ fontSize: 11, padding: '3px 8px' }}
                        onClick={(e) => { e.stopPropagation(); void handleRetryAll(q.name); }}
                        disabled={retrying === q.name}
                      >
                        {retrying === q.name ? '...' : 'Retry all'}
                      </button>
                    )}
                  </td>
                </tr>
                {expandedQueue === q.name && failedJobs.length > 0 && (
                  <tr key={`${q.name}-expanded`}>
                    <td colSpan={7} style={{ background: 'var(--bg-3)', padding: '12px 16px' }}>
                      {failedJobs.map((job) => (
                        <div key={job.id} style={{ marginBottom: 8, fontSize: 12 }}>
                          <span style={{ color: 'var(--text-3)', marginRight: 8 }}>#{job.id}</span>
                          <span style={{ color: 'var(--red)', marginRight: 8 }}>
                            {job.failedReason?.slice(0, 200)}
                          </span>
                          <span style={{ color: 'var(--text-3)' }}>· {job.attemptsMade} attempt(s)</span>
                        </div>
                      ))}
                    </td>
                  </tr>
                )}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
