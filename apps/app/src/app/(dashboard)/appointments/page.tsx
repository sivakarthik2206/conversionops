'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Clock, User } from 'lucide-react';
import { PageHeader, Badge, EmptyState, Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { useRealtime } from '@/hooks/useRealtime';
import { useQueryClient } from '@tanstack/react-query';
import type { AppointmentBookedEvent } from '@/hooks/useRealtime';
import Link from 'next/link';

interface Appointment {
  id: string; leadId: string; status: string; scheduledAt: string;
  timezone: string; durationMinutes: number; location?: string;
  lead?: { name: string | null; phone: string | null; score: number; tier: string } | null;
  workspaceUserId?: string | null;
}

interface AppointmentPage { items: Appointment[]; nextCursor: string | null; }

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral'> = {
  CONFIRMED: 'success', PENDING_CONFIRMATION: 'warning', CANCELLED: 'error',
  RESCHEDULED: 'info', COMPLETED: 'neutral', NO_SHOW: 'error',
};

function formatDateTime(iso: string, timezone: string) {
  const d = new Date(iso);
  return d.toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: timezone });
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
      <PageHeader title="Appointments" subtitle={`${appointments.length} ${tab}`} />
      <div className="flex gap-1 p-1 rounded-lg mb-6 w-fit" style={{ background: 'var(--bg-3)' }}>
        {(['upcoming', 'past'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize"
            style={{ background: tab === t ? 'var(--bg-2)' : 'transparent', color: tab === t ? 'var(--text)' : 'var(--text-3)' }}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} variant="rect" height={80} />)
          : appointments.length === 0
            ? <EmptyState title="No appointments yet" description="Appointments appear here when leads book through ConversionOps." />
            : (
              <AnimatePresence>
                {appointments.map((appt, i) => (
                  <motion.div key={appt.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                    className="rounded-[10px] border p-5 flex items-center gap-6"
                    style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <p className="font-medium" style={{ color: 'var(--text)' }}>{appt.lead?.name ?? appt.leadId.slice(-8)}</p>
                        {appt.lead?.phone && <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{appt.lead.phone}</span>}
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-2)' }}>
                          <Calendar size={13} /><span className="text-sm">{formatDateTime(appt.scheduledAt, appt.timezone)}</span>
                        </div>
                        <div className="flex items-center gap-1.5" style={{ color: 'var(--text-3)' }}>
                          <Clock size={12} /><span className="text-xs">{appt.durationMinutes} min</span>
                        </div>
                      </div>
                    </div>
                    <Badge variant={STATUS_VARIANT[appt.status] ?? 'neutral'} size="sm">{appt.status}</Badge>
                    <Link href={`/leads/${appt.leadId}`} className="text-xs hover:underline" style={{ color: 'var(--text-3)' }}>View lead ?</Link>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
      </div>
    </div>
  );
}
