'use client';
import { Fragment, useState, useEffect, useCallback } from 'react';
import { Icon } from '@/components/Icon';

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

export default function QueuesPage() {
  const [queues, setQueues] = useState<QueueStats[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
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
    const interval = setInterval(() => void fetchAll(), 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  async function handleExpand(name: string) {
    if (expanded === name) {
      setExpanded(null);
      return;
    }
    setExpanded(name);
    const jobs = await fetchFailedJobs(name);
    setFailedJobs(jobs);
  }

  async function handleRetryAll(name: string) {
    if (!confirm(`Retry all failed jobs in ${name}?`)) return;
    setRetrying(name);
    await fetch(`${API}/admin/queues/${name}/retry-all`, {
      method: 'POST',
      headers: { 'x-admin-api-key': ADMIN_KEY },
    });
    await fetchAll();
    setRetrying(null);
  }

  const totalFailed = queues.reduce((s, q) => s + q.failed, 0);
  const totalWaiting = queues.reduce((s, q) => s + q.waiting, 0);
  const totalActive = queues.reduce((s, q) => s + q.active, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>BullMQ · auto-refresh 15s</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.025em' }}>
            Queue inspector
          </h1>
        </div>
        {lastFetch && (
          <div style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
            <Icon name="clock" size={10} stroke={1.6} style={{ verticalAlign: 'middle', marginRight: 4 }} />
            Last: {lastFetch.toLocaleTimeString()}
          </div>
        )}
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <SummaryStat label="Waiting"  value={totalWaiting} color="var(--amber)" icon="clock" />
        <SummaryStat label="Active"   value={totalActive}  color="var(--blue)"  icon="activity" />
        <SummaryStat label="Failed"   value={totalFailed}  color={totalFailed > 0 ? 'var(--red)' : 'var(--text-3)'} icon="x-circle" />
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <table>
          <thead>
            <tr>
              <th>Queue</th>
              <th style={{ textAlign: 'right' }}>Waiting</th>
              <th style={{ textAlign: 'right' }}>Active</th>
              <th style={{ textAlign: 'right' }}>Completed</th>
              <th style={{ textAlign: 'right' }}>Failed</th>
              <th style={{ textAlign: 'right' }}>Delayed</th>
              <th style={{ textAlign: 'right' }} />
            </tr>
          </thead>
          <tbody>
            {queues.map(q => {
              const isExpanded = expanded === q.name;
              return (
                <Fragment key={q.name}>
                  <tr
                    onClick={() => void handleExpand(q.name)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: 'var(--text)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Icon
                          name="chevron-right"
                          size={11}
                          stroke={2}
                          style={{
                            color: 'var(--text-4)',
                            transform: isExpanded ? 'rotate(90deg)' : 'none',
                            transition: 'transform 0.2s',
                          }}
                        />
                        {q.name}
                      </div>
                    </td>
                    <td style={{ textAlign: 'right', color: q.waiting > 0 ? 'var(--amber)' : 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{q.waiting}</td>
                    <td style={{ textAlign: 'right', color: q.active > 0 ? 'var(--blue)' : 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontWeight: 500 }}>{q.active}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>{q.completed.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', color: q.failed > 0 ? 'var(--red)' : 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontWeight: q.failed > 0 ? 600 : 400 }}>{q.failed}</td>
                    <td style={{ textAlign: 'right', color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>{q.delayed}</td>
                    <td style={{ textAlign: 'right' }}>
                      {q.failed > 0 && (
                        <button
                          className="btn-danger"
                          onClick={(e) => { e.stopPropagation(); void handleRetryAll(q.name); }}
                          disabled={retrying === q.name}
                          style={{ fontSize: 10, padding: '4px 10px' }}
                        >
                          {retrying === q.name ? (
                            <Icon name="loader" size={10} style={{ animation: 'spin 0.8s linear infinite' }} />
                          ) : (
                            <Icon name="reload" size={10} stroke={2} />
                          )}
                          Retry all
                        </button>
                      )}
                    </td>
                  </tr>
                  {isExpanded && failedJobs.length > 0 && (
                    <tr>
                      <td colSpan={7} style={{ background: 'var(--bg-3)', padding: 0, borderBottom: '1px solid var(--border)' }}>
                        <div style={{ padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {failedJobs.slice(0, 10).map(job => (
                            <div
                              key={job.id}
                              style={{
                                padding: '10px 12px',
                                borderRadius: 8,
                                background: 'var(--bg)',
                                border: '1px solid rgba(255,92,92,0.16)',
                                display: 'flex',
                                gap: 12,
                                alignItems: 'flex-start',
                              }}
                            >
                              <span
                                style={{
                                  fontSize: 10,
                                  color: 'var(--text-4)',
                                  fontFamily: "'JetBrains Mono', monospace",
                                  flexShrink: 0,
                                  paddingTop: 2,
                                }}
                              >
                                #{job.id.slice(-8)}
                              </span>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 11.5, color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1.5 }}>
                                  {(job.failedReason ?? '').slice(0, 240)}
                                </div>
                                <div style={{ fontSize: 10, color: 'var(--text-4)', marginTop: 4 }}>
                                  {job.attemptsMade} attempt{job.attemptsMade !== 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>
                          ))}
                          {failedJobs.length > 10 && (
                            <div style={{ fontSize: 11, color: 'var(--text-4)', textAlign: 'center', padding: 8 }}>
                              + {failedJobs.length - 10} more
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SummaryStat({ label, value, color, icon }: { label: string; value: number; color: string; icon: Parameters<typeof Icon>[0]['name'] }) {
  return (
    <div className="card" style={{ padding: 16, display: 'flex', alignItems: 'center', gap: 14, position: 'relative', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: -30,
          right: -30,
          width: 100,
          height: 100,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${color}14, transparent 70%)`,
          filter: 'blur(20px)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          background: `${color}14`,
          border: `1px solid ${color}33`,
          color,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={15} stroke={1.8} />
      </div>
      <div style={{ position: 'relative' }}>
        <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 3 }}>{label}</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 1,
          }}
        >
          {value.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
