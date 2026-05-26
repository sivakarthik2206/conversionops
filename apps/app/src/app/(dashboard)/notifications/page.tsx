'use client';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { Skeleton, EmptyState } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { useRealtime } from '@/hooks/useRealtime';

interface NotificationItem {
  id: string;
  type: string;
  status: string;
  channel: string;
  subject: string | null;
  body: string;
  metadata: Record<string, unknown>;
  leadId: string | null;
  createdAt: string;
  lead: { id: string; name: string | null; phone: string | null } | null;
}

interface NotificationsResponse {
  notifications: NotificationItem[];
  total: number;
  recentCount: number;
}

const TYPE_META: Record<string, { label: string; color: string; icon: string; bg: string }> = {
  HOT_LEAD_ALERT:         { label: 'Hot Lead',        color: 'var(--red)',    icon: 'fire',    bg: 'rgba(255,92,92,0.10)' },
  APPOINTMENT_BOOKED:     { label: 'Appointment',      color: 'var(--green)',  icon: 'calendar',bg: 'rgba(77,255,165,0.10)' },
  AGENT_TAKEOVER_REQUEST: { label: 'Takeover',         color: 'var(--purple)', icon: 'user',    bg: 'rgba(179,155,255,0.10)' },
  AI_ESCALATION:          { label: 'Escalation',       color: 'var(--amber)',  icon: 'bolt',    bg: 'rgba(255,181,71,0.10)' },
  MISSED_CALL_RECOVERY:   { label: 'Missed Call',      color: 'var(--blue)',   icon: 'phone',   bg: 'rgba(71,139,255,0.10)' },
  REACTIVATION_SUCCESS:   { label: 'Reactivated',      color: 'var(--accent)', icon: 'reload',  bg: 'rgba(232,255,71,0.10)' },
  AI_PAUSED_ALERT:        { label: 'AI Paused',        color: 'var(--red)',    icon: 'bot',     bg: 'rgba(255,92,92,0.10)' },
  QUOTA_WARNING:          { label: 'Quota Warning',    color: 'var(--amber)',  icon: 'cpu',     bg: 'rgba(255,181,71,0.10)' },
  BILLING_ALERT:          { label: 'Billing',          color: 'var(--amber)',  icon: 'building',bg: 'rgba(255,181,71,0.10)' },
  OPS_ALERT:              { label: 'Ops Alert',        color: 'var(--red)',    icon: 'shield',  bg: 'rgba(255,92,92,0.10)' },
};

const ALL_TYPES = Object.keys(TYPE_META);

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function isRecent(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<string>('all');

  const { data, isLoading } = useQuery<NotificationsResponse>({
    queryKey: ['notifications', typeFilter],
    queryFn: () => apiClient.get('/notifications', typeFilter !== 'all' ? { type: typeFilter } : {}),
    refetchInterval: 30_000,
  });

  const { on } = useRealtime();

  // Live: invalidate on new notification
  useEffect(() => {
    const off = on('notification:new', () => {
      void qc.invalidateQueries({ queryKey: ['notifications'] });
    });
    return off;
  }, [on, qc]);

  const notifications = data?.notifications ?? [];
  const recentCount = data?.recentCount ?? 0;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
            Notifications
          </h2>
          <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            Workspace alerts and system events
            {recentCount > 0 && (
              <span style={{
                marginLeft: 10,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                padding: '2px 8px',
                borderRadius: 100,
                background: 'rgba(232,255,71,0.12)',
                border: '1px solid rgba(232,255,71,0.25)',
                color: 'var(--accent)',
                fontSize: 11,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                {recentCount} new
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Type filter chips */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 20 }}>
        {(['all', ...ALL_TYPES]).map(t => {
          const meta = t === 'all' ? null : TYPE_META[t];
          const isActive = typeFilter === t;
          return (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 8,
                background: isActive ? (meta?.bg ?? 'rgba(232,255,71,0.10)') : 'var(--bg-2)',
                border: `1px solid ${isActive ? (meta?.color ?? 'var(--accent)') + '44' : 'var(--border)'}`,
                color: isActive ? (meta?.color ?? 'var(--accent)') : 'var(--text-3)',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {meta && <Icon name={meta.icon as never} size={10} stroke={2} />}
              {meta?.label ?? 'All'}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} style={{ height: 76, borderRadius: 12 }} />
          ))
        ) : notifications.length === 0 ? (
          <EmptyState
            illustration={<Icon name="bell" size={28} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
            title="No notifications"
            description="Alerts about lead activity, AI events, and system health will appear here."
          />
        ) : (
          <AnimatePresence initial={false}>
            {notifications.map((n, i) => {
              const meta = TYPE_META[n.type] ?? { label: n.type, color: 'var(--text-3)', icon: 'bell', bg: 'var(--bg-3)' };
              const recent = isRecent(n.createdAt);
              return (
                <motion.div
                  key={n.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.25 }}
                  className="surface-card"
                  style={{
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 14,
                    cursor: n.leadId ? 'pointer' : 'default',
                    transition: 'border-color 0.2s',
                    borderColor: recent ? `${meta.color}22` : 'var(--border)',
                    position: 'relative',
                  }}
                  onClick={() => {
                    if (n.leadId) router.push(`/leads/${n.leadId}`);
                  }}
                  onMouseEnter={e => { if (n.leadId) (e.currentTarget as HTMLElement).style.borderColor = `${meta.color}44`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = recent ? `${meta.color}22` : 'var(--border)'; }}
                >
                  {/* New dot */}
                  {recent && (
                    <span style={{
                      position: 'absolute',
                      top: 16,
                      right: 16,
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: meta.color,
                      boxShadow: `0 0 6px ${meta.color}`,
                    }} />
                  )}

                  {/* Icon */}
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: meta.bg,
                    border: `1px solid ${meta.color}33`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon name={meta.icon as never} size={14} stroke={2} style={{ color: meta.color }} />
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: meta.color,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {meta.label}
                      </span>
                      {n.subject && (
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {n.subject}
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {n.body}
                    </p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
                      {n.lead?.name && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-3)' }}>
                          <Icon name="user" size={10} stroke={1.6} />
                          {n.lead.name}
                        </span>
                      )}
                      <span style={{
                        fontSize: 11,
                        color: 'var(--text-4)',
                        fontFamily: "'JetBrains Mono', monospace",
                      }}>
                        {timeAgo(n.createdAt)}
                      </span>
                      <span style={{
                        fontSize: 10,
                        color: n.status === 'DELIVERED' ? 'var(--green)' : n.status === 'FAILED' ? 'var(--red)' : 'var(--text-4)',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.04em',
                      }}>
                        {n.channel} · {n.status}
                      </span>
                    </div>
                  </div>

                  {n.leadId && (
                    <Icon name="arrow-right" size={13} stroke={1.6} style={{ color: 'var(--text-4)', flexShrink: 0, alignSelf: 'center' }} />
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>

      {/* Load more */}
      {!isLoading && data && data.total > notifications.length && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <p style={{ fontSize: 12, color: 'var(--text-4)' }}>
            Showing {notifications.length} of {data.total} notifications
          </p>
        </div>
      )}
    </div>
  );
}
