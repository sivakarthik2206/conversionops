'use client';
import { useRef, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, UserCheck, Bot, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge, StatusBadge, Skeleton } from '@conversionops/ui';
import { useConversation } from '@/hooks/useConversations';
import { apiClient } from '@/lib/api-client';
import { useToast } from '@conversionops/ui';

function ScoreRing({ score, size = 48 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const color = score >= 80 ? 'var(--green)' : score >= 30 ? 'var(--amber)' : 'var(--red)';
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-label={`Score: ${score}`}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={3} />
      <motion.circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={3}
        strokeLinecap="round"
        initial={{ strokeDasharray: `0 ${circ}` }}
        animate={{ strokeDasharray: `${(score/100)*circ} ${circ}` }}
        transition={{ duration: 1, ease: [0.16,1,0.3,1] }}
        transform={`rotate(-90 ${size/2} ${size/2})`}
      />
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>{score}</text>
    </svg>
  );
}

const QUAL_FIELDS = ['intent','area','propertyType','budget','timeline','financing','urgency'] as const;
const QUAL_LABELS: Record<string, string> = {
  intent: 'Intent', area: 'Area', propertyType: 'Property Type',
  budget: 'Budget', timeline: 'Timeline', financing: 'Financing', urgency: 'Urgency',
};

export default function ConversationThreadPage() {
  const params = useParams();
  const router = useRouter();
  const { addToast } = useToast();
  const convId = params['id'] as string;
  const { conversation, messages, isLoading } = useConversation(convId);
  const [takingOver, setTakingOver] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleTakeover = async () => {
    setTakingOver(true);
    try { await apiClient.post(`/conversations/${convId}/takeover`, {}); addToast('Conversation taken over', 'success'); }
    catch { addToast('Failed to take over', 'error'); }
    finally { setTakingOver(false); }
  };

  const handleRelease = async () => {
    try { await apiClient.post(`/conversations/${convId}/release`, {}); addToast('Released to AI', 'success'); }
    catch { addToast('Failed to release', 'error'); }
  };

  if (isLoading) return <div className="flex flex-col gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} variant="rect" height={60} />)}</div>;
  const qual: Record<string,string> = {};

  return (
    <div className="flex gap-6 h-[calc(100vh-130px)] -mt-8 -mx-8">
      <div className="flex-1 flex flex-col overflow-hidden rounded-[10px] border" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <div className="px-5 py-3 flex items-center gap-3 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
          <button onClick={() => router.back()} className="p-1 rounded hover:bg-[var(--bg-3)]" style={{ color: 'var(--text-3)' }}><ArrowLeft size={16} /></button>
          {conversation && <ScoreRing score={0} size={40} />}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text)' }}>{convId}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={conversation?.status ?? 'NEW'} />
              <Badge variant={conversation?.aiActive ? 'ai' : 'warning'} size="sm">{conversation?.aiActive ? 'AI Active' : 'Human'}</Badge>
            </div>
          </div>
          {conversation?.aiActive
            ? <Button size="sm" variant="secondary" loading={takingOver} onClick={handleTakeover}><UserCheck size={13} />Take over</Button>
            : <Button size="sm" variant="ghost" onClick={handleRelease}><Bot size={13} />Release to AI</Button>}
        </div>
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === 'HUMAN' ? 'justify-end' : msg.role === 'SYSTEM' ? 'justify-center' : 'justify-start'}`}>
              {msg.role === 'SYSTEM'
                ? <p className="text-xs italic" style={{ color: 'var(--text-3)' }}>{msg.content}</p>
                : <div className={`max-w-[75%] px-4 py-2.5 rounded-[10px] text-sm leading-relaxed ${msg.role === 'AI' ? 'border-l-2' : ''}`}
                    style={{ background: msg.role === 'AI' ? 'var(--bg-3)' : 'var(--accent-dim)', borderLeftColor: msg.role === 'AI' ? 'var(--purple)' : undefined, color: 'var(--text)' }}>
                    {msg.content}
                  </div>}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>
      <div className="w-[280px] shrink-0 flex flex-col gap-4 overflow-y-auto">
        <div className="rounded-[10px] border p-4" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
          <p className="text-[11px] uppercase tracking-wide mb-3 font-medium" style={{ color: 'var(--text-3)' }}>Qualification</p>
          <div className="flex flex-col gap-2">
            {QUAL_FIELDS.map(f => (
              <div key={f} className="flex items-center gap-2">
                <CheckCircle size={12} style={{ color: qual[f] ? 'var(--green)' : 'var(--border-light)', flexShrink: 0 }} />
                <span className="text-[11px]" style={{ color: 'var(--text-3)' }}>{QUAL_LABELS[f]}: </span>
                <span className="text-[11px] font-medium" style={{ color: qual[f] ? 'var(--text)' : 'var(--text-4)' }}>{qual[f] ?? '—'}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

