'use client';
import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, EmptyState, Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { useRealtime } from '@/hooks/useRealtime';
import type { AppointmentBookedEvent } from '@/hooks/useRealtime';
import Link from 'next/link';
import { Icon } from '@/components/Icon';

interface Appointment {
  id: string;
  leadId: string;
  status: string;
  scheduledAt: string;
  timezone: string;
  durationMinutes: number;
  location?: string;
  lead?: { name: string | null; phone: string | null; score: number; tier: string } | null;
  workspaceUserId?: string | null;
}

interface AppointmentPage { items: Appointment[]; nextCursor: string | null; }

const STATUS_META: Record<string, { color: string; bg: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  CONFIRMED:             { color: 'var(--green)',  bg: 'rgba(77,255,165,0.10)',  icon: 'check-circle' },
  PENDING_CONFIRMATION:  { color: 'var(--amber)',  bg: 'rgba(255,181,71,0.10)',  icon: 'clock' },
  CANCELLED:             { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)',   icon: 'x-circle' },
  RESCHEDULED:           { color: 'var(--blue)',   bg: 'rgba(90,163,255,0.10)',  icon: 'reload' },
  COMPLETED:             { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.04)', icon: 'check' },
  NO_SHOW:               { color: 'var(--red)',    bg: 'rgba(255,92,92,0.10)',   icon: 'x' },
};

function formatDateTime(iso: string, timezone: string) {
  const d = new Date(iso);
  return {
    full: d.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: timezone,
    }),
    day: d.toLocaleString('en-US', { day: 'numeric', timeZone: timezone }),
    month: d.toLocaleString('en-US', { month: 'short', timeZone: timezone }),
    time: d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: timezone }),
  };
}

export default function AppointmentsPage() {
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const queryClient = useQueryClient();
  const { on } = useRealtime();

  const now = new Date().toISOString();
  const { data, isLoading } = useQuery<AppointmentPage>({
    queryKey: ['appointments', tab],
    queryFn: () => apiClient.get('/appointments', tab === 'upcoming' ? { from: now } : { to: now }),
  });

  useEffect(() => {
    const off = on('appointment:booked', (_event: AppointmentBookedEvent) => {
      void queryClient.invalidateQueries({ queryKey: ['appointments'] });
    });
    return off;
  }, [on, queryClient]);

  const appointments = data?.items ?? [];

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Calendar</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Appointments{' '}
            <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 16, marginLeft: 8 }}>
              {appointments.length}
            </span>
          </h1>
        </div>

        <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--bg-3)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {(['upcoming', 'past'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '6px 16px',
                borderRadius: 7,
                background: tab === t ? 'var(--bg)' : 'transparent',
                border: '1px solid',
                borderColor: tab === t ? 'var(--border-light)' : 'transparent',
                color: tab === t ? 'var(--text)' : 'var(--text-3)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.15s',
              }}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rect" height={88} />)
        ) : appointments.length === 0 ? (
          <EmptyState
            illustration={<Icon name="calendar" size={32} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
            title={`No ${tab} appointments`}
            description="Appointments appear here when leads book through ConversionOps."
          />
        ) : (
          <AnimatePresence>
            {appointments.map((appt, i) => {
              const dt = formatDateTime(appt.scheduledAt, appt.timezone);
              const meta = STATUS_META[appt.status] ?? STATUS_META['CONFIRMED']!;
              return (
                <motion.div
                  key={appt.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="surface-card"
                  style={{
                    padding: 18,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 20,
                    transition: 'border-color 0.2s, transform 0.3s var(--ease-out-quart)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Date tile */}
                  <div
                    style={{
                      width: 64,
                      flexShrink: 0,
                      borderRadius: 10,
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      padding: '10px 0',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      className="eyebrow"
                      style={{
                        color: 'var(--accent)',
                        marginBottom: 4,
                        fontSize: 9,
                      }}
                    >
                      {dt.month}
                    </div>
                    <div
                      className="serif"
                      style={{
                        fontSize: 26,
                        lineHeight: 1,
                        color: 'var(--text)',
                        fontWeight: 400,
                      }}
                    >
                      {dt.day}
                    </div>
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0 }}>
                        {appt.lead?.name ?? `Lead · ${appt.leadId.slice(-8)}`}
                      </p>
                      {appt.lead?.phone && (
                        <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {appt.lead.phone}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 12, color: 'var(--text-3)' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontFamily: "'JetBrains Mono', monospace" }}>
                        <Icon name="clock" size={11} stroke={1.6} />
                        {dt.time} · {appt.durationMinutes}m
                      </span>
                      {appt.location && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <Icon name="building" size={11} stroke={1.6} />
                          {appt.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '5px 10px',
                      borderRadius: 100,
                      background: meta.bg,
                      border: `1px solid ${meta.color}22`,
                      color: meta.color,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    <Icon name={meta.icon} size={11} stroke={2} />
                    {appt.status.replace(/_/g, ' ')}
                  </div>

                  {/* View link */}
                  <Link
                    href={`/leads/${appt.leadId}`}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      fontSize: 12,
                      color: 'var(--text-3)',
                      textDecoration: 'none',
                      padding: '6px 10px',
                      borderRadius: 8,
                      border: '1px solid var(--border)',
                      transition: 'all 0.2s',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.color = 'var(--text)';
                      e.currentTarget.style.borderColor = 'var(--border-light)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.color = 'var(--text-3)';
                      e.currentTarget.style.borderColor = 'var(--border)';
                    }}
                  >
                    Lead
                    <Icon name="arrow-right" size={11} stroke={2} />
                  </Link>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
