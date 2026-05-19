'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CheckCircle, Circle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge, StatusBadge, Skeleton } from '@conversionops/ui';
import { useLead } from '@/hooks/useLeads';
import { apiClient } from '@/lib/api-client';

const QUAL_FIELDS = ['intent','area','propertyType','budget','timeline','financing','urgency'] as const;
const QUAL_LABELS: Record<string, string> = {
  intent: 'Intent', area: 'Area', propertyType: 'Property Type',
  budget: 'Budget', timeline: 'Timeline', financing: 'Financing', urgency: 'Urgency',
};

function ScoreRing({ score }: { score: number }) {
  const size = 80; const r = (size - 8) / 2; const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--green)' : score >= 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={6} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={6} strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${(score/100)*circ} ${circ}` }}
        transition={{ duration: 1.2, ease: [0.16,1,0.3,1] }}
        transform={`rotate(-90 ${size/2} ${size/2})`} />
      <text x={size/2} y={size/2+6} textAnchor="middle" fontSize="20" fontWeight="700" fill={color}>{score}</text>
    </svg>
  );
}

interface LeadEvent { id: string; type: string; occurredAt: string; payload: Record<string,unknown>; }

const EVENT_COLORS: Record<string, string> = {
  'lead.created': 'var(--blue)', 'lead.contacted': 'var(--blue)',
  'lead.qualification.completed': 'var(--green)', 'lead.assigned': 'var(--green)',
  'lead.appointment.booked': 'var(--accent)', 'lead.converted': 'var(--accent)',
  'lead.opted-out': 'var(--red)', 'lead.dormant': 'var(--text-3)',
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

  if (isLoading) return <div className="flex flex-col gap-4">{Array.from({length:4}).map((_,i)=><Skeleton key={i} variant="rect" height={80} />)}</div>;
  if (!lead) return <div style={{ color: 'var(--text-2)' }}>Lead not found</div>;

  const qual = (lead.qualification as Record<string,string> | undefined) ?? {};
  const answeredCount = QUAL_FIELDS.filter(f => qual[f]).length;
  const qualPct = (answeredCount / QUAL_FIELDS.length) * 100;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-sm mb-6 hover:opacity-80 transition-opacity" style={{ color: 'var(--text-3)' }}>
        <ArrowLeft size={14} /> Back to leads
      </button>

      {/* Hero */}
      <div className="rounded-[10px] border p-6 mb-6 flex items-center gap-6" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <ScoreRing score={lead.score} />
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-[28px] mb-2" style={{ color: 'var(--text)' }}>{lead.name ?? lead.phone ?? 'Unknown Lead'}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="info" size="sm">{lead.source.replace('_',' ')}</Badge>
            <StatusBadge status={lead.status} />
          </div>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Qualification</p>
          <div className="flex items-center gap-2">
            <div className="w-24 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-4)' }}>
              <motion.div className="h-full rounded-full" style={{ background: 'var(--accent)' }}
                initial={{ width: 0 }} animate={{ width: `${qualPct}%` }} transition={{ duration: 1 }} />
            </div>
            <span className="text-xs font-medium" style={{ color: 'var(--text)' }}>{answeredCount}/{QUAL_FIELDS.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Qualification card */}
        <div className="rounded-[10px] border p-5" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Qualification Data</h2>
          <div className="flex flex-col gap-3">
            {QUAL_FIELDS.map(f => (
              <div key={f} className="flex items-start gap-3">
                {qual[f]
                  ? <CheckCircle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--green)' }} />
                  : <Circle size={14} className="mt-0.5 shrink-0" style={{ color: 'var(--border-light)' }} />}
                <div>
                  <p className="text-[11px] uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>{QUAL_LABELS[f]}</p>
                  <p className="text-sm" style={{ color: qual[f] ? 'var(--text)' : 'var(--text-4)' }}>{qual[f] ?? '—'}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="rounded-[10px] border p-5" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--text)' }}>Event Timeline</h2>
          <div className="flex flex-col gap-3 relative">
            <div className="absolute left-[6px] top-2 bottom-2 w-px" style={{ background: 'var(--border)' }} />
            {[
              { id: '1', type: 'lead.created', occurredAt: lead.createdAt, payload: {} },
            ].map(evt => (
              <div key={evt.id} className="flex items-start gap-3 pl-5 relative">
                <div className="absolute left-0 top-1.5 w-3 h-3 rounded-full ring-2 ring-[var(--bg-2)]"
                  style={{ background: EVENT_COLORS[evt.type] ?? 'var(--text-3)' }} />
                <div>
                  <p className="text-xs font-medium" style={{ color: 'var(--text)' }}>{evt.type.replace(/\./g,' ')}</p>
                  <p className="text-[11px]" style={{ color: 'var(--text-3)' }}>{timeAgo(evt.occurredAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
