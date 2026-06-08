'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, EmptyState } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { formatRelativeTime } from '@/lib/format-time';
import { Icon } from '@/components/Icon';

interface AuditEntry {
  id: string;
  workspaceId: string | null;
  userId: string | null;
  role: string | null;
  action: string;
  resource: string;
  resourceId: string | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  requestId: string | null;
  occurredAt: string;
  user: { id: string; email: string } | null;
}

interface AuditLogResponse {
  items: AuditEntry[];
  nextCursor: string | null;
}

const ACTION_COLORS: Record<string, { color: string; bg: string }> = {
  CREATE:  { color: 'var(--green)',  bg: 'rgba(77,255,165,0.10)'  },
  UPDATE:  { color: 'var(--blue)',   bg: 'rgba(71,139,255,0.10)'  },
  DELETE:  { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)'   },
  SUSPEND: { color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)'  },
  RESUME:  { color: 'var(--accent)', bg: 'rgba(232,255,71,0.10)'  },
  ASSIGN:  { color: 'var(--purple)', bg: 'rgba(179,155,255,0.10)' },
  TAKEOVER:{ color: 'var(--purple)', bg: 'rgba(179,155,255,0.10)' },
  ESCALATE:{ color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)'  },
  PAUSE:   { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)'   },
};

function actionStyle(action: string) {
  const key = action.split('.').pop()?.toUpperCase() ?? action.toUpperCase();
  return ACTION_COLORS[key] ?? { color: 'var(--text-3)', bg: 'var(--bg-3)' };
}


const ALL_RESOURCES = ['workspace', 'lead', 'conversation', 'agent', 'routing', 'appointment', 'billing'];

export default function AuditLogPage() {
  const [resourceFilter, setResourceFilter] = useState('all');
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data, isLoading } = useQuery<AuditLogResponse>({
    queryKey: ['audit-log', resourceFilter],
    queryFn: () => apiClient.get('/workspaces/me/audit-log', {
      ...(resourceFilter !== 'all' ? { resource: resourceFilter } : {}),
      limit: 100,
    }),
    refetchInterval: 30_000,
  });

  const items = data?.items ?? [];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
          Audit Log
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
          Workspace activity trail — all consequential actions
        </p>
      </div>

      {/* Resource filter */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {(['all', ...ALL_RESOURCES]).map(r => {
          const isActive = resourceFilter === r;
          return (
            <button
              key={r}
              onClick={() => setResourceFilter(r)}
              style={{
                padding: '5px 12px',
                borderRadius: 8,
                background: isActive ? 'rgba(232,255,71,0.10)' : 'var(--bg-2)',
                border: `1px solid ${isActive ? 'rgba(232,255,71,0.30)' : 'var(--border)'}`,
                color: isActive ? 'var(--accent)' : 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                fontFamily: "'JetBrains Mono', monospace",
                transition: 'all 0.2s',
              }}
            >
              {r}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {isLoading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 54, borderRadius: 10 }} />
          ))
        ) : items.length === 0 ? (
          <EmptyState
            illustration={<Icon name="shield" size={28} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
            title="No audit entries"
            description="Consequential actions like lead assignments, AI pauses, and setting changes will appear here."
          />
        ) : (
          <AnimatePresence initial={false}>
            {items.map((entry, i) => {
              const style = actionStyle(entry.action);
              const isOpen = expanded === entry.id;
              const hasDetail = !!entry.oldValue || !!entry.newValue || Object.keys(entry.metadata ?? {}).length > 0;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.015, duration: 0.2 }}
                >
                  <div
                    className="surface-card"
                    style={{
                      padding: '11px 16px',
                      cursor: hasDetail ? 'pointer' : 'default',
                      borderColor: isOpen ? 'rgba(232,255,71,0.20)' : undefined,
                    }}
                    onClick={() => hasDetail && setExpanded(isOpen ? null : entry.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {/* Action badge */}
                      <span style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: style.color,
                        background: style.bg,
                        padding: '2px 6px',
                        borderRadius: 4,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontFamily: "'JetBrains Mono', monospace",
                        flexShrink: 0,
                        minWidth: 58,
                        textAlign: 'center',
                      }}>
                        {entry.action.split('.').pop()?.toUpperCase() ?? entry.action}
                      </span>

                      {/* Resource */}
                      <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--text-3)' }}>{entry.resource}</span>
                        {entry.resourceId && (
                          <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                            {' '}#{entry.resourceId.slice(-8)}
                          </span>
                        )}
                      </span>

                      {/* User */}
                      {entry.user?.email && (
                        <span style={{ fontSize: 11, color: 'var(--text-4)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Icon name="user" size={10} stroke={1.6} />
                          {entry.user.email.split('@')[0]}
                        </span>
                      )}

                      {/* Time */}
                      <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                        {formatRelativeTime(entry.occurredAt)}
                      </span>

                      {hasDetail && (
                        <Icon
                          name={isOpen ? 'chevron-up' : 'chevron-down'}
                          size={12}
                          stroke={1.6}
                          style={{ color: 'var(--text-4)', flexShrink: 0 }}
                        />
                      )}
                    </div>

                    {/* Expanded detail */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.18 }}
                          style={{ overflow: 'hidden' }}
                        >
                          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
                            {entry.requestId && (
                              <div style={{ marginBottom: 6, fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                                request_id: {entry.requestId}
                                {entry.ipAddress && ` · ${entry.ipAddress}`}
                              </div>
                            )}
                            {(entry.newValue || entry.oldValue) && (
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                {entry.oldValue && (
                                  <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', marginBottom: 4 }}>BEFORE</div>
                                    <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-4)', padding: '8px 10px', borderRadius: 8, overflow: 'auto', maxHeight: 120 }}>
                                      {JSON.stringify(entry.oldValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {entry.newValue && (
                                  <div>
                                    <div style={{ fontSize: 9, fontWeight: 700, color: 'var(--accent)', letterSpacing: '0.06em', marginBottom: 4 }}>AFTER</div>
                                    <pre style={{ margin: 0, fontSize: 11, color: 'var(--text-3)', background: 'var(--bg-4)', padding: '8px 10px', borderRadius: 8, overflow: 'auto', maxHeight: 120 }}>
                                      {JSON.stringify(entry.newValue, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {data?.nextCursor && (
        <p style={{ marginTop: 16, textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>
          Showing first 100 entries
        </p>
      )}
    </div>
  );
}
