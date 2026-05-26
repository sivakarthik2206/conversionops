'use client';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Badge, StatusBadge, Skeleton, Modal, Button, useToast } from '@conversionops/ui';
import { useLead } from '@/hooks/useLeads';
import { Icon } from '@/components/Icon';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useState } from 'react';

interface LeadDetail {
  id: string;
  workspaceId: string;
  source: string;
  status: string;
  tier: string;
  score: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  qualification: Record<string, string>;
  assignedWorkspaceUserId: string | null;
  reactivationCount: number;
  latestConversationId: string | null;
  aiPausedForLead: boolean;
  createdAt: string;
  updatedAt: string;
}

interface LeadEvent {
  id: string;
  type: string;
  payload: Record<string, unknown>;
  triggeredBy: string | null;
  occurredAt: string;
  sequence: number;
}

const QUAL_FIELDS = ['intent', 'area', 'propertyType', 'budget', 'timeline', 'financing', 'urgency'] as const;
const QUAL_LABELS: Record<string, string> = {
  intent: 'Intent',
  area: 'Area',
  propertyType: 'Property type',
  budget: 'Budget',
  timeline: 'Timeline',
  financing: 'Financing',
  urgency: 'Urgency',
};

const REACTIVATABLE_STATUSES = ['DORMANT', 'COLD', 'DISQUALIFIED'];

function ScoreRing({ score }: { score: number }) {
  const size = 96;
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--green)' : score >= 50 ? 'var(--accent)' : score >= 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <defs>
          <filter id={`glow-${score}`}>
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={5} />
        <motion.circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={5}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score/100)*circ} ${circ}` }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          filter={`url(#glow-${score})`}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <span className="serif" style={{ fontSize: 28, lineHeight: 1, color, fontWeight: 400 }}>{score}</span>
        <span style={{ fontSize: 9, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>score</span>
      </div>
    </div>
  );
}

const EVENT_META: Record<string, { color: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  'lead.created':                  { color: 'var(--blue)',   icon: 'plus' },
  'lead.contacted':                { color: 'var(--blue)',   icon: 'message' },
  'lead.qualification.completed':  { color: 'var(--green)',  icon: 'check' },
  'lead.assigned':                 { color: 'var(--green)',  icon: 'user' },
  'lead.appointment.booked':       { color: 'var(--accent)', icon: 'calendar' },
  'lead.converted':                { color: 'var(--accent)', icon: 'star' },
  'lead.opted-out':                { color: 'var(--red)',    icon: 'x' },
  'lead.dormant':                  { color: 'var(--text-3)', icon: 'minus' },
  'lead.reactivated':              { color: 'var(--purple)', icon: 'reload' },
};

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff/3600000)}h ago`;
  return new Date(date).toLocaleDateString();
}

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const qc = useQueryClient();
  const leadId = params['id'] as string;

  const [reactivateModal, setReactivateModal] = useState(false);

  const { data: lead, isLoading } = useQuery<LeadDetail>({
    queryKey: ['lead-detail', leadId],
    queryFn: () => apiClient.get<LeadDetail>(`/leads/${leadId}`),
    enabled: !!leadId,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery<LeadEvent[]>({
    queryKey: ['lead-events', leadId],
    queryFn: () => apiClient.get<LeadEvent[]>(`/leads/${leadId}/events`),
    enabled: !!leadId,
  });

  const reactivate = useMutation({
    mutationFn: () => apiClient.post(`/leads/${leadId}/reactivate`, {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['lead-detail', leadId] });
      void qc.invalidateQueries({ queryKey: ['lead-events', leadId] });
      void qc.invalidateQueries({ queryKey: ['leads'] });
      addToast('Lead reactivated — AI will reach out within 60 seconds', 'success');
      setReactivateModal(false);
    },
    onError: () => { addToast('Failed to reactivate lead', 'error'); },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({length:4}).map((_,i)=><Skeleton key={i} variant="rect" height={80} />)}
      </div>
    );
  }

  if (!lead) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-2)' }}>
        <Icon name="x-circle" size={32} stroke={1.5} style={{ color: 'var(--red)', marginBottom: 12 }} />
        <p>Lead not found</p>
        <button onClick={() => router.push('/leads')} className="btn-ghost" style={{ marginTop: 12 }}>
          Back to leads
        </button>
      </div>
    );
  }

  const qual = (lead.qualification as Record<string, string> | undefined) ?? {};
  const answeredCount = QUAL_FIELDS.filter(f => qual[f]).length;
  const qualPct = (answeredCount / QUAL_FIELDS.length) * 100;
  const canReactivate = REACTIVATABLE_STATUSES.includes(lead.status);

  return (
    <div>
      <button
        onClick={() => router.back()}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-3)',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          marginBottom: 20,
          padding: 0,
          transition: 'color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text)'; }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-3)'; }}
      >
        <Icon name="arrow-left" size={13} stroke={1.8} />
        Back to leads
      </button>

      {/* Hero */}
      <div
        className="surface-card"
        style={{
          padding: 28,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 24,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -80,
            right: -80,
            width: 240,
            height: 240,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(232,255,71,0.08), transparent 70%)',
            filter: 'blur(30px)',
            pointerEvents: 'none',
          }}
        />

        <ScoreRing score={lead.score} />

        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{lead.source.replace(/_/g, ' ')}</p>
          <h1
            className="serif"
            style={{
              fontSize: 32,
              color: 'var(--text)',
              margin: 0,
              fontWeight: 400,
              letterSpacing: '-0.025em',
              lineHeight: 1.1,
            }}
          >
            {lead.name ?? lead.phone ?? 'Unknown lead'}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
            <Badge variant="info" size="sm">{lead.source.replace(/_/g, ' ')}</Badge>
            <StatusBadge status={lead.status} />
            {lead.phone && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                <Icon name="phone" size={11} stroke={1.6} />
                {lead.phone}
              </span>
            )}
            {lead.email && (
              <span style={{ fontSize: 12, color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <Icon name="mail" size={11} stroke={1.6} />
                {lead.email}
              </span>
            )}
          </div>
        </div>

        {/* Qualification progress */}
        <div style={{ textAlign: 'right', position: 'relative', minWidth: 160 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 8 }}>Qualification</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 5, borderRadius: 100, background: 'var(--bg-4)', overflow: 'hidden', minWidth: 80 }}>
              <motion.div
                style={{ height: '100%', background: 'var(--accent)', borderRadius: 100, boxShadow: '0 0 8px var(--accent)' }}
                initial={{ width: 0 }}
                animate={{ width: `${qualPct}%` }}
                transition={{ duration: 1.1 }}
              />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: "'JetBrains Mono', monospace" }}>
              {answeredCount}/{QUAL_FIELDS.length}
            </span>
          </div>
          {lead.reactivationCount > 0 && (
            <div style={{ marginTop: 10, fontSize: 11, color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end' }}>
              <Icon name="reload" size={10} stroke={2} />
              {lead.reactivationCount} reactivation{lead.reactivationCount > 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Actions bar */}
      <div
        style={{
          display: 'flex',
          gap: 10,
          marginBottom: 16,
          padding: '14px 18px',
          background: 'var(--bg-2)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginRight: 4 }}>
          Actions
        </span>

        {lead.latestConversationId && (
          <button
            onClick={() => router.push(`/conversations?id=${lead.latestConversationId}`)}
            className="btn-ghost"
            style={{ fontSize: 12, height: 34, padding: '0 14px' }}
          >
            <Icon name="message" size={13} stroke={1.8} />
            View conversation
          </button>
        )}

        {canReactivate && (
          <button
            onClick={() => setReactivateModal(true)}
            className="btn-ghost"
            style={{ fontSize: 12, height: 34, padding: '0 14px', color: 'var(--purple)', borderColor: 'rgba(179,155,255,0.30)', background: 'rgba(179,155,255,0.08)' }}
          >
            <Icon name="reload" size={13} stroke={1.8} />
            Reactivate
          </button>
        )}

        {lead.phone && (
          <a
            href={`tel:${lead.phone}`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              height: 34,
              padding: '0 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              color: 'var(--text-2)',
              textDecoration: 'none',
              transition: 'all 0.2s',
              background: 'transparent',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text)'; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
          >
            <Icon name="phone" size={12} stroke={1.8} />
            Call
          </a>
        )}

        {lead.latestConversationId && (
          <button
            onClick={() => router.push(`/conversations/${lead.latestConversationId}`)}
            className="btn-ghost"
            style={{ fontSize: 12, height: 34, padding: '0 14px' }}
          >
            <Icon name="external" size={12} stroke={1.8} />
            Full thread
          </button>
        )}

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              fontSize: 10,
              color: lead.aiPausedForLead ? 'var(--amber)' : 'var(--green)',
              padding: '3px 8px',
              borderRadius: 100,
              background: lead.aiPausedForLead ? 'rgba(255,181,71,0.10)' : 'rgba(77,255,165,0.10)',
              border: `1px solid ${lead.aiPausedForLead ? 'rgba(255,181,71,0.25)' : 'rgba(77,255,165,0.25)'}`,
              fontFamily: "'JetBrains Mono', monospace",
              fontWeight: 700,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: '50%',
                background: lead.aiPausedForLead ? 'var(--amber)' : 'var(--green)',
                boxShadow: `0 0 4px ${lead.aiPausedForLead ? 'var(--amber)' : 'var(--green)'}`,
              }}
            />
            AI {lead.aiPausedForLead ? 'paused' : 'active'}
          </span>
        </div>
      </div>

      {/* Two-column body */}
      <div
        className="lead-grid"
        style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}
      >
        {/* Qualification */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Icon name="check-circle" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.005em' }}>
              Qualification data
            </h2>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
              {answeredCount}/{QUAL_FIELDS.length}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {QUAL_FIELDS.map((f, i) => {
              const value = qual[f];
              return (
                <div
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '11px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      background: value ? 'rgba(77,255,165,0.16)' : 'var(--bg-3)',
                      border: '1px solid',
                      borderColor: value ? 'rgba(77,255,165,0.30)' : 'var(--border)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: value ? 'var(--green)' : 'var(--text-5)',
                      flexShrink: 0,
                    }}
                  >
                    {value ? <Icon name="check" size={10} stroke={3} /> : <Icon name="minus" size={10} stroke={2} />}
                  </span>
                  <span className="eyebrow" style={{ color: 'var(--text-3)', minWidth: 96 }}>{QUAL_LABELS[f]}</span>
                  <span style={{ flex: 1, fontSize: 13, color: value ? 'var(--text)' : 'var(--text-5)', fontWeight: value ? 500 : 400 }}>
                    {value ?? 'Not collected'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Timeline */}
        <div className="surface-card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Icon name="clock" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
            <h2 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.005em' }}>
              Event timeline
            </h2>
            <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
              {events.length} event{events.length !== 1 ? 's' : ''}
            </span>
          </div>
          {eventsLoading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} style={{ display: 'flex', gap: 10, paddingLeft: 18 }}>
                  <Skeleton variant="circle" width={18} height={18} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <Skeleton variant="text" width="60%" style={{ marginBottom: 4 }} />
                    <Skeleton variant="text" width="30%" />
                  </div>
                </div>
              ))}
            </div>
          ) : events.length === 0 ? (
            <div style={{ padding: '20px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-4)' }}>
              No events recorded yet
            </div>
          ) : (
            <div style={{ position: 'relative', paddingLeft: 18 }}>
              <div
                style={{
                  position: 'absolute',
                  left: 7,
                  top: 8,
                  bottom: 8,
                  width: 1,
                  background: 'linear-gradient(180deg, var(--accent), transparent)',
                  opacity: 0.4,
                }}
              />
              {events.map((evt) => {
                const meta = EVENT_META[evt.type] ?? { color: 'var(--text-3)', icon: 'plus' as const };
                return (
                  <div key={evt.id} style={{ position: 'relative', paddingBottom: 16, paddingLeft: 16 }}>
                    <div
                      style={{
                        position: 'absolute',
                        left: -3,
                        top: 2,
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        background: 'var(--bg-2)',
                        border: `2px solid ${meta.color}`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: meta.color,
                        boxShadow: `0 0 12px ${meta.color}44`,
                      }}
                    >
                      <Icon name={meta.icon} size={9} stroke={2.4} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
                      {evt.type.replace(/\./g, ' ').replace(/^lead /, '')}
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {timeAgo(evt.occurredAt)}
                      </span>
                      {evt.triggeredBy && (
                        <span style={{ fontSize: 11, color: 'var(--text-5)', fontFamily: "'JetBrains Mono', monospace" }}>
                          · {evt.triggeredBy}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Reactivate confirmation modal */}
      <AnimatePresence>
        {reactivateModal && (
          <Modal open={reactivateModal} onClose={() => setReactivateModal(false)} title="Reactivate lead?">
            <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10, lineHeight: 1.6 }}>
              The AI will send a personalised outreach message referencing{' '}
              {lead.name ? <strong>{lead.name}&apos;s</strong> : 'their'} original search criteria.
              Up to 3 reactivation attempts are allowed.
            </p>
            {lead.reactivationCount >= 2 && (
              <div style={{
                padding: '10px 14px',
                borderRadius: 8,
                background: 'rgba(255,181,71,0.08)',
                border: '1px solid rgba(255,181,71,0.25)',
                color: 'var(--amber)',
                fontSize: 12,
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                marginBottom: 16,
              }}>
                <Icon name="bolt" size={12} stroke={2} />
                {3 - lead.reactivationCount} attempt{3 - lead.reactivationCount === 1 ? '' : 's'} remaining.
              </div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
              <Button variant="ghost" size="sm" onClick={() => setReactivateModal(false)}>Cancel</Button>
              <Button
                size="sm"
                loading={reactivate.isPending}
                onClick={() => reactivate.mutate()}
                style={{ background: 'rgba(179,155,255,0.15)', borderColor: 'rgba(179,155,255,0.40)', color: 'var(--purple)' }}
              >
                <Icon name="reload" size={12} stroke={2} />
                Reactivate
              </Button>
            </div>
          </Modal>
        )}
      </AnimatePresence>

      <style>{`
        @media (max-width: 900px) { .lead-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
