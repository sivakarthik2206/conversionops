'use client';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Badge, StatusBadge, Skeleton } from '@conversionops/ui';
import { useLead } from '@/hooks/useLeads';
import { Icon } from '@/components/Icon';

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
  const leadId = params['id'] as string;
  const { lead, isLoading } = useLead(leadId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {Array.from({length:4}).map((_,i)=><Skeleton key={i} variant="rect" height={80} />)}
      </div>
    );
  }
  if (!lead) {
    return <div style={{ color: 'var(--text-2)' }}>Lead not found</div>;
  }

  const qual = (lead.qualification as Record<string, string> | undefined) ?? {};
  const answeredCount = QUAL_FIELDS.filter(f => qual[f]).length;
  const qualPct = (answeredCount / QUAL_FIELDS.length) * 100;

  const events = [
    { id: '1', type: 'lead.created', occurredAt: lead.createdAt },
  ];

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
          <p className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 4 }}>{lead.source.replace('_', ' ')}</p>
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
            <Badge variant="info" size="sm">{lead.source.replace('_', ' ')}</Badge>
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
          </div>
          <div style={{ position: 'relative', paddingLeft: 18 }}>
            <div
              style={{
                position: 'absolute',
                left: 7,
                top: 8,
                bottom: 8,
                width: 1,
                background: 'linear-gradient(180deg, var(--accent-glow), transparent)',
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
                  <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                    {timeAgo(evt.occurredAt)}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) { .lead-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
