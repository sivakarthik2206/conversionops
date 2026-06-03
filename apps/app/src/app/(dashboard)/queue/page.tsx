'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton, EmptyState, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface QueueStat {
  name: string;
  key: string;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

interface QueuesResponse {
  queues: QueueStat[];
}

interface FailedJob {
  id: string | undefined;
  name: string;
  data: Record<string, unknown>;
  failedReason: string | undefined;
  attemptsMade: number;
  processedOn: number | undefined;
  timestamp: number;
}

type FailedJobsResponse = FailedJob[];

const QUEUE_ICONS: Record<string, string> = {
  'lead-intake': 'users',
  'ai-response': 'bot',
  'qualification': 'chart',
  'lead-routing': 'route',
  'appointment-booking': 'calendar',
  'crm-sync': 'plug',
  'missed-call': 'phone',
  'reactivation': 'reload',
  'notification': 'bell',
  'audit-log': 'shield',
  'analytics-ingest': 'chart',
  'retention': 'clock',
};

function statusColor(q: QueueStat): string {
  if (q.failed > 0) return 'var(--red)';
  if (q.active > 0) return 'var(--green)';
  if (q.waiting > 5) return 'var(--amber)';
  return 'var(--text-4)';
}

function statusLabel(q: QueueStat): string {
  if (q.failed > 0) return 'failing';
  if (q.active > 0) return 'processing';
  if (q.waiting > 0) return 'queued';
  return 'idle';
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

export default function QueuePage() {
  const [selected, setSelected] = useState<string | null>(null);
  const { addToast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, dataUpdatedAt } = useQuery<QueuesResponse>({
    queryKey: ['admin-queues'],
    queryFn: () => apiClient.get('/admin/queues'),
    refetchInterval: 10_000,
  });

  const { data: dlqData, isLoading: dlqLoading } = useQuery<FailedJobsResponse>({
    queryKey: ['admin-queue-failed', selected],
    queryFn: () => apiClient.get(`/admin/queues/${selected}/failed`, { limit: 20 }),
    enabled: !!selected,
    refetchInterval: 10_000,
  });

  const retryJob = useMutation({
    mutationFn: ({ queue, jobId }: { queue: string; jobId: string }) =>
      apiClient.post(`/admin/queues/${queue}/jobs/${jobId}/retry`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin-queue-failed', selected] });
      void qc.invalidateQueries({ queryKey: ['admin-queues'] });
      addToast('Job requeued', 'success');
    },
    onError: () => addToast('Retry failed', 'error'),
  });

  const retryAll = useMutation({
    mutationFn: (queue: string) =>
      apiClient.post<{ retried: number }>(`/admin/queues/${queue}/retry-all`, {}),
    onSuccess: (data) => {
      void qc.invalidateQueries({ queryKey: ['admin-queue-failed', selected] });
      void qc.invalidateQueries({ queryKey: ['admin-queues'] });
      addToast(`${data?.retried ?? 0} jobs requeued`, 'success');
    },
    onError: () => addToast('Bulk retry failed', 'error'),
  });

  const queues = data?.queues ?? [];
  const totalFailed = queues.reduce((sum, q) => sum + q.failed, 0);
  const totalActive = queues.reduce((sum, q) => sum + q.active, 0);
  const totalWaiting = queues.reduce((sum, q) => sum + q.waiting, 0);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
            Queue Inspector
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            BullMQ job queue health
            {dataUpdatedAt > 0 && (
              <span style={{ marginLeft: 10, fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                updated {timeAgo(dataUpdatedAt)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        {[
          { label: 'Active', value: totalActive, color: 'var(--green)', bg: 'rgba(77,255,165,0.08)', border: 'rgba(77,255,165,0.20)' },
          { label: 'Waiting', value: totalWaiting, color: 'var(--amber)', bg: 'rgba(255,181,71,0.08)', border: 'rgba(255,181,71,0.20)' },
          { label: 'Failed', value: totalFailed, color: 'var(--red)', bg: 'rgba(255,92,92,0.08)', border: 'rgba(255,92,92,0.20)' },
        ].map(({ label, value, color, bg, border }) => (
          <div key={label} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 16px',
            borderRadius: 10,
            background: bg,
            border: `1px solid ${border}`,
          }}>
            <span style={{ fontSize: 20, fontWeight: 700, color, fontFamily: "'JetBrains Mono', monospace" }}>{value}</span>
            <span style={{ fontSize: 12, color, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Queue cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 10, marginBottom: 32 }}>
        {isLoading ? (
          Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 90, borderRadius: 12 }} />
          ))
        ) : (
          queues.map((q, i) => {
            const icon = (QUEUE_ICONS[q.name] ?? 'cpu') as never;
            const color = statusColor(q);
            const label = statusLabel(q);
            const isSelected = selected === q.name;
            return (
              <motion.button
                key={q.name}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.02, duration: 0.2 }}
                onClick={() => setSelected(isSelected ? null : q.name)}
                className="surface-card"
                style={{
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  background: isSelected ? 'rgba(232,255,71,0.04)' : undefined,
                  borderColor: isSelected ? 'rgba(232,255,71,0.25)' : q.failed > 0 ? 'rgba(255,92,92,0.25)' : undefined,
                  width: '100%',
                  border: '1px solid',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: `${color}14`,
                  border: `1px solid ${color}33`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  <Icon name={icon} size={15} stroke={1.8} style={{ color }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                      {q.name}
                    </span>
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: `${color}14`,
                      border: `1px solid ${color}33`,
                    }}>
                      {label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 14 }}>
                    {[
                      { label: 'waiting', value: q.waiting, c: 'var(--text-3)' },
                      { label: 'active',  value: q.active,  c: q.active > 0 ? 'var(--green)' : 'var(--text-4)' },
                      { label: 'done',    value: q.completed, c: 'var(--text-4)' },
                      { label: 'failed',  value: q.failed,  c: q.failed > 0 ? 'var(--red)' : 'var(--text-4)' },
                    ].map(({ label, value, c }) => (
                      <div key={label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono', monospace", lineHeight: 1 }}>{value}</span>
                        <span style={{ fontSize: 9, color: 'var(--text-4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>{label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Icon name="chevron-right" size={12} stroke={1.6} style={{ color: isSelected ? 'var(--accent)' : 'var(--text-4)', flexShrink: 0 }} />
              </motion.button>
            );
          })
        )}
      </div>

      {/* DLQ panel */}
      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.2 }}
          >
            <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                Failed jobs — <span style={{ color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>{selected}</span>
              </h3>
              {dlqData && dlqData.length > 0 && (
                <button
                  onClick={() => selected && retryAll.mutate(selected)}
                  disabled={retryAll.isPending}
                  style={{
                    padding: '4px 12px',
                    borderRadius: 7,
                    background: 'rgba(255,181,71,0.10)',
                    border: '1px solid rgba(255,181,71,0.30)',
                    color: 'var(--amber)',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}
                >
                  <Icon name="reload" size={11} stroke={2} />
                  Retry all ({dlqData.length})
                </button>
              )}
              <button
                onClick={() => setSelected(null)}
                style={{ marginLeft: 'auto', background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', fontSize: 12 }}
              >
                close ×
              </button>
            </div>

            {dlqLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} style={{ height: 56, borderRadius: 10, marginBottom: 6 }} />
              ))
            ) : !dlqData || dlqData.length === 0 ? (
              <EmptyState
                illustration={<Icon name="shield" size={24} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
                title="No failed jobs"
                description="All jobs in this queue completed successfully."
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {dlqData.map((job, i) => (
                  <motion.div
                    key={job.id ?? i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="surface-card"
                    style={{ padding: '12px 16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Icon name="x-circle" size={13} stroke={2} style={{ color: 'var(--red)', flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 3 }}>
                          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {job.name} #{job.id}
                          </span>
                          <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                            {job.attemptsMade} attempt{job.attemptsMade !== 1 ? 's' : ''}
                          </span>
                          {job.processedOn && (
                            <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                              {timeAgo(job.processedOn)}
                            </span>
                          )}
                        </div>
                        <p style={{ margin: 0, fontSize: 12, color: 'var(--red)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {job.failedReason ?? 'Unknown error'}
                        </p>
                      </div>
                      {job.id && (
                        <button
                          onClick={() => selected && retryJob.mutate({ queue: selected, jobId: job.id! })}
                          disabled={retryJob.isPending}
                          title="Retry this job"
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: 7,
                            background: 'rgba(77,255,165,0.08)',
                            border: '1px solid rgba(77,255,165,0.25)',
                            color: 'var(--green)',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Icon name="reload" size={12} stroke={2} />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
