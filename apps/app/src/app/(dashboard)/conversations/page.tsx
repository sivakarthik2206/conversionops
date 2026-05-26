'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton, StatusBadge, EmptyState } from '@conversionops/ui';
import { useQuery, useMutation, useQueryClient, useInfiniteQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useRealtime } from '@/hooks/useRealtime';
import type {
  MessageNewEvent, ConversationTakeoverEvent,
  ConversationEscalatedEvent, TypingEvent,
} from '@/hooks/useRealtime';
import { Icon } from '@/components/Icon';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConversationSummary {
  id: string;
  leadId: string;
  channel: string;
  status: string;
  aiActive: boolean;
  takenOverBy: string | null;
  escalationLevel: string;
  createdAt: string;
  updatedAt: string;
  lead?: { name: string | null; phone: string | null; score: number; tier: string; status?: string };
}

interface Message {
  id: string;
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  aiMetadata?: { reasoning?: string; confidence?: number } | null;
  createdAt: string;
  status?: 'sending' | 'sent' | 'failed';
}

interface ConversationDetail extends ConversationSummary {
  messages: Message[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime();
  if (diff < 60_000) return 'now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function slaStatus(updatedAt: string, isActive: boolean): 'ok' | 'warn' | 'critical' {
  if (!isActive) return 'ok';
  const mins = (Date.now() - new Date(updatedAt).getTime()) / 60_000;
  if (mins > 120) return 'critical';
  if (mins > 30) return 'warn';
  return 'ok';
}

function slaColor(s: 'ok' | 'warn' | 'critical') {
  return s === 'critical' ? 'var(--red)' : s === 'warn' ? 'var(--amber)' : 'var(--text-4)';
}

function scoreColor(n: number) {
  return n >= 80 ? 'var(--green)' : n >= 50 ? 'var(--accent)' : n >= 30 ? 'var(--amber)' : 'var(--red)';
}

const ESCALATION_COLOR: Record<string, string> = {
  URGENT: 'var(--red)',
  HIGH: 'var(--amber)',
  MEDIUM: 'var(--blue)',
  LOW: 'var(--text-3)',
};

const TIER_COLOR: Record<string, string> = {
  PRIORITY: 'var(--accent)',
  HOT: 'var(--green)',
  WARM: 'var(--amber)',
  COLD: 'var(--blue)',
};

// ─── Connection banner ────────────────────────────────────────────────────────

function ConnectionBanner({ state }: { state: string }) {
  if (state === 'connected') return null;
  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 32, opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      style={{
        background: state === 'reconnecting' ? 'rgba(255,181,71,0.12)' : 'rgba(255,92,92,0.12)',
        borderBottom: `1px solid ${state === 'reconnecting' ? 'rgba(255,181,71,0.25)' : 'rgba(255,92,92,0.25)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        fontSize: 11,
        color: state === 'reconnecting' ? 'var(--amber)' : 'var(--red)',
        fontFamily: "'JetBrains Mono', monospace",
        flexShrink: 0,
      }}
    >
      <Icon name="loader" size={11} style={{ animation: 'spin 1s linear infinite' }} />
      {state === 'reconnecting' ? 'Reconnecting…' : 'Disconnected — check your connection'}
    </motion.div>
  );
}

// ─── Score ring (small) ───────────────────────────────────────────────────────

function ScoreRingSmall({ score, size = 28 }: { score: number; size?: number }) {
  const r = (size - 4) / 2;
  const circ = 2 * Math.PI * r;
  const c = scoreColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={2} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray={`${(score / 100) * circ} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 3px ${c})` }}
        />
      </svg>
      <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, fontWeight: 700, color: c, fontFamily: "'JetBrains Mono', monospace" }}>
        {score}
      </span>
    </div>
  );
}

// ─── Large score ring (conversation header) ───────────────────────────────────

function ScoreRingLarge({ score }: { score: number }) {
  const size = 52;
  const r = (size - 5) / 2;
  const circ = 2 * Math.PI * r;
  const c = scoreColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={3} />
        <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={c} strokeWidth={3}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score / 100) * circ} ${circ}` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ filter: `drop-shadow(0 0 5px ${c})` }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'JetBrains Mono', monospace", fontSize: 13, fontWeight: 700, color: c }}>
        {score}
      </div>
    </div>
  );
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function TypingDots() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}
    >
      <div style={{ padding: '10px 14px', borderRadius: '14px 14px 14px 4px', background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', gap: 4, alignItems: 'center' }}>
        <Icon name="bot" size={10} stroke={1.8} style={{ color: 'var(--purple)', marginRight: 4 }} />
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--purple)', display: 'block' }}
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── List panel item ──────────────────────────────────────────────────────────

function ConvRow({
  conv,
  isActive,
  unreadCount,
  onClick,
}: {
  conv: ConversationSummary;
  isActive: boolean;
  unreadCount: number;
  onClick: () => void;
}) {
  const sla = slaStatus(conv.updatedAt, conv.status !== 'CLOSED');
  const esc = conv.escalationLevel !== 'NONE' && conv.escalationLevel !== 'none';
  const escColor = esc ? (ESCALATION_COLOR[conv.escalationLevel] ?? 'var(--text-3)') : null;
  const tierColor = conv.lead ? (TIER_COLOR[conv.lead.tier] ?? 'var(--text-4)') : null;

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%',
        padding: '12px 14px',
        textAlign: 'left',
        background: isActive ? 'rgba(232,255,71,0.06)' : 'transparent',
        border: 'none',
        borderBottom: '1px solid var(--border)',
        borderLeft: `3px solid ${isActive ? 'var(--accent)' : 'transparent'}`,
        cursor: 'pointer',
        transition: 'background 0.15s, border-left-color 0.15s',
        display: 'flex',
        gap: 10,
        alignItems: 'flex-start',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      {/* Avatar */}
      <div style={{
        width: 34,
        height: 34,
        borderRadius: '50%',
        background: conv.aiActive
          ? 'linear-gradient(135deg, var(--purple) 0%, #7c5fff 100%)'
          : 'linear-gradient(135deg, var(--amber) 0%, #ff9747 100%)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#0a0a0b',
        flexShrink: 0,
        position: 'relative',
      }}>
        <Icon name={conv.aiActive ? 'bot' : 'user'} size={14} stroke={2} />
        {esc && (
          <span style={{
            position: 'absolute',
            top: -3, right: -3,
            width: 10, height: 10,
            borderRadius: '50%',
            background: escColor ?? 'var(--red)',
            border: '2px solid var(--bg-2)',
            boxShadow: `0 0 6px ${escColor ?? 'var(--red)'}`,
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Row 1: name + time + unread */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{
            fontSize: 12.5,
            fontWeight: unreadCount > 0 ? 700 : 500,
            color: unreadCount > 0 ? 'var(--text)' : 'var(--text-2)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
          }}>
            {conv.lead?.name ?? `Lead · ${conv.leadId.slice(-8)}`}
          </span>
          <span style={{
            fontSize: 10,
            color: slaColor(sla),
            fontFamily: "'JetBrains Mono', monospace",
            flexShrink: 0,
          }}>
            {timeAgo(conv.updatedAt)}
          </span>
          {unreadCount > 0 && (
            <span style={{
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              background: 'var(--accent)',
              color: '#0a0a0b',
              fontSize: 9,
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              fontFamily: "'JetBrains Mono', monospace",
              flexShrink: 0,
            }}>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>

        {/* Row 2: badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 9,
            fontWeight: 700,
            padding: '2px 5px',
            borderRadius: 4,
            background: conv.aiActive ? 'rgba(179,155,255,0.12)' : 'rgba(255,181,71,0.12)',
            color: conv.aiActive ? 'var(--purple)' : 'var(--amber)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', monospace",
          }}>
            {conv.aiActive ? 'AI' : 'Human'}
          </span>

          {esc && (
            <span style={{
              fontSize: 9,
              fontWeight: 700,
              padding: '2px 5px',
              borderRadius: 4,
              background: `${escColor}18`,
              color: escColor ?? 'var(--red)',
              letterSpacing: '0.05em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {conv.escalationLevel}
            </span>
          )}

          {conv.lead && (
            <span style={{
              fontSize: 9,
              padding: '2px 5px',
              borderRadius: 4,
              background: `${tierColor}14`,
              color: tierColor ?? 'var(--text-4)',
              fontWeight: 600,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              fontFamily: "'JetBrains Mono', monospace",
            }}>
              {conv.lead.tier}
            </span>
          )}

          {sla !== 'ok' && (
            <span style={{ fontSize: 9, color: slaColor(sla), fontFamily: "'JetBrains Mono', monospace" }}>
              {sla === 'critical' ? '⚠ overdue' : '⏱ waiting'}
            </span>
          )}
        </div>
      </div>

      {conv.lead && <ScoreRingSmall score={conv.lead.score} size={26} />}
    </button>
  );
}

// ─── Conversation thread (right panel) ────────────────────────────────────────

function ConversationThread({
  conversationId,
  onClose,
}: {
  conversationId: string;
  onClose?: () => void;
}) {
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState('');
  const [localMsgs, setLocalMsgs] = useState<Message[]>([]);
  const [typing, setTyping] = useState(false);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data, isLoading, isError } = useQuery<ConversationDetail>({
    queryKey: ['conversation', conversationId],
    queryFn: () => apiClient.get(`/conversations/${conversationId}`),
    enabled: !!conversationId,
  });

  useEffect(() => {
    if (data?.messages) setLocalMsgs(data.messages);
  }, [data?.messages]);

  const { on, joinConversation, connectionState } = useRealtime();

  useEffect(() => {
    if (conversationId) joinConversation(conversationId);
    inputRef.current?.focus();
  }, [conversationId, joinConversation]);

  useEffect(() => {
    const offMsg = on('message:new', (evt: MessageNewEvent) => {
      if (evt.conversationId !== conversationId) return;
      setLocalMsgs(prev => {
        if (prev.some(m => m.id === evt.messageId)) return prev;
        // Remove any typing indicator since a message arrived
        setTyping(false);
        return [...prev, { id: evt.messageId, role: evt.role, content: evt.content, createdAt: evt.createdAt, status: 'sent' }];
      });
      void qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    });

    const offTypingStart = on('typing:start', (evt: TypingEvent) => {
      if (evt.conversationId !== conversationId) return;
      setTyping(true);
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => setTyping(false), 8000);
    });

    const offTypingStop = on('typing:stop', (evt: TypingEvent) => {
      if (evt.conversationId !== conversationId) return;
      setTyping(false);
    });

    return () => { offMsg(); offTypingStart(); offTypingStop(); };
  }, [on, conversationId, qc]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMsgs, typing]);

  const sendMsg = useMutation({
    mutationFn: (content: string) => apiClient.post(`/conversations/${conversationId}/message`, { content }),
    onMutate: async (content) => {
      setText('');
      const opt: Message = { id: `opt-${Date.now()}`, role: 'HUMAN', content, createdAt: new Date().toISOString(), status: 'sending' };
      setLocalMsgs(prev => [...prev, opt]);
      return { optId: opt.id };
    },
    onSuccess: (_, __, ctx) => {
      setLocalMsgs(prev => prev.map(m => m.id === ctx?.optId ? { ...m, status: 'sent' } : m));
      void qc.invalidateQueries({ queryKey: ['conversation', conversationId] });
    },
    onError: (_, __, ctx) => {
      setLocalMsgs(prev => prev.map(m => m.id === ctx?.optId ? { ...m, status: 'failed' } : m));
    },
  });

  const retryMsg = useCallback((msg: Message) => {
    setLocalMsgs(prev => prev.filter(m => m.id !== msg.id));
    sendMsg.mutate(msg.content);
  }, [sendMsg]);

  const takeover = useMutation({
    mutationFn: () => apiClient.post(`/conversations/${conversationId}/takeover`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversation', conversationId] }),
  });

  const release = useMutation({
    mutationFn: () => apiClient.post(`/conversations/${conversationId}/release`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversation', conversationId] }),
  });

  const send = useCallback(() => {
    const t = text.trim();
    if (!t || sendMsg.isPending) return;
    sendMsg.mutate(t);
  }, [text, sendMsg]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }, [send]);

  if (isLoading) return (
    <div style={{ flex: 1, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} style={{ height: i % 2 === 0 ? 56 : 40, borderRadius: 12 }} />)}
    </div>
  );

  if (isError || !data) return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <EmptyState
        illustration={<Icon name="x-circle" size={28} stroke={1.5} style={{ color: 'var(--red)' }} />}
        title="Conversation not found"
        description="This conversation may have been deleted."
      />
    </div>
  );

  const isAIActive = data.aiActive;
  const esc = data.escalationLevel !== 'NONE' && data.escalationLevel !== 'none';
  const escColor = esc ? (ESCALATION_COLOR[data.escalationLevel] ?? 'var(--red)') : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        flexShrink: 0,
        background: 'var(--bg-2)',
      }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{ width: 28, height: 28, borderRadius: '50%', background: 'none', border: '1px solid var(--border)', cursor: 'pointer', color: 'var(--text-3)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <Icon name="x" size={12} stroke={2} />
          </button>
        )}

        {data.lead && <ScoreRingLarge score={data.lead.score} />}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span className="serif" style={{ fontSize: 18, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.lead?.name || `Lead · ${data.leadId.slice(-6)}`}
            </span>
            {data.lead?.tier && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4, background: `${TIER_COLOR[data.lead.tier] ?? 'var(--text-4)'}14`, color: TIER_COLOR[data.lead.tier] ?? 'var(--text-4)', letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", flexShrink: 0 }}>
                {data.lead.tier}
              </span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <StatusBadge status={data.lead?.status ?? data.status} />
            {data.lead?.phone && (
              <span style={{ fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <Icon name="phone" size={10} stroke={1.6} />
                {data.lead.phone}
              </span>
            )}
          </div>
        </div>

        {/* Connection + live indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {connectionState === 'connected' ? (
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)', animation: 'pulseRing 2s ease-out infinite' }} />
          ) : (
            <Icon name="loader" size={12} style={{ color: 'var(--amber)', animation: 'spin 1s linear infinite' }} />
          )}
          <span style={{ fontSize: 10, color: connectionState === 'connected' ? 'var(--green)' : 'var(--amber)', fontFamily: "'JetBrains Mono', monospace" }}>
            {connectionState === 'connected' ? 'Live' : 'Reconnecting'}
          </span>
        </div>

        {/* AI toggle */}
        {isAIActive ? (
          <button onClick={() => takeover.mutate()} disabled={takeover.isPending} className="btn-primary" style={{ fontSize: 11, padding: '6px 12px', height: 32 }}>
            <Icon name="user" size={12} stroke={2} />
            Take over
          </button>
        ) : (
          <button onClick={() => release.mutate()} disabled={release.isPending} className="btn-ghost" style={{ fontSize: 11, padding: '6px 12px', height: 32 }}>
            <Icon name="bot" size={12} stroke={1.8} />
            Release to AI
          </button>
        )}
      </div>

      {/* Escalation banner */}
      <AnimatePresence>
        {esc && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 36, opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{
              background: `${escColor}12`,
              borderBottom: `1px solid ${escColor}30`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 11,
              color: escColor ?? 'var(--red)',
              fontWeight: 600,
              flexShrink: 0,
            }}
          >
            <Icon name="bolt" size={11} stroke={2} />
            Escalation: {data.escalationLevel} — requires attention
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
        <AnimatePresence initial={false}>
          {localMsgs.map(msg => {
            if (msg.role === 'SYSTEM') {
              return (
                <motion.div key={msg.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-4)', fontStyle: 'italic', padding: '3px 12px', borderRadius: 100, background: 'var(--bg-3)', border: '1px solid var(--border)' }}>
                    {msg.content}
                  </span>
                </motion.div>
              );
            }
            const isHuman = msg.role === 'HUMAN';
            const isFailed = msg.status === 'failed';
            const isSending = msg.status === 'sending';
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: isSending ? 0.7 : 1, y: 0 }}
                transition={{ duration: 0.22 }}
                style={{ display: 'flex', flexDirection: 'column', alignItems: isHuman ? 'flex-end' : 'flex-start', gap: 3 }}
              >
                {!isHuman && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 2, paddingLeft: 2 }}>
                    <Icon name="bot" size={10} stroke={1.8} style={{ color: 'var(--purple)' }} />
                    <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--purple)', textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: "'JetBrains Mono', monospace" }}>AI</span>
                  </div>
                )}
                <div
                  style={{
                    maxWidth: '76%',
                    padding: '10px 14px',
                    borderRadius: isHuman ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 13.5,
                    lineHeight: 1.55,
                    color: isHuman ? '#0a0a0b' : 'var(--text)',
                    background: isFailed
                      ? 'rgba(255,92,92,0.10)'
                      : isHuman
                        ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                        : 'var(--bg-3)',
                    border: isFailed ? '1px solid rgba(255,92,92,0.35)' : isHuman ? 'none' : '1px solid var(--border)',
                    boxShadow: isHuman && !isFailed ? '0 2px 10px rgba(232,255,71,0.15)' : 'none',
                    wordBreak: 'break-word',
                  }}
                >
                  {msg.content}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: isHuman ? 0 : 2, paddingRight: isHuman ? 2 : 0 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {isSending ? 'sending…' : isFailed ? '' : new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  {isFailed && (
                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10 }}>
                      <span style={{ color: 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>failed</span>
                      <button
                        onClick={() => retryMsg(msg)}
                        style={{ fontSize: 10, color: 'var(--accent)', border: 'none', cursor: 'pointer', padding: '1px 6px', borderRadius: 4, background: 'rgba(232,255,71,0.10)', fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        retry
                      </button>
                    </span>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        <AnimatePresence>
          {typing && <TypingDots />}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isAIActive ? (
        <div style={{ flexShrink: 0, padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'flex-end', gap: 8 }}>
          <textarea
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Message… (Enter to send)"
            rows={2}
            style={{
              flex: 1,
              resize: 'none',
              fontSize: 13.5,
              fontFamily: 'inherit',
              background: 'var(--bg-3)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 12px',
              color: 'var(--text)',
              outline: 'none',
              lineHeight: 1.5,
              caretColor: 'var(--accent)',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
          />
          <button
            onClick={send}
            disabled={!text.trim() || sendMsg.isPending}
            className="btn-primary"
            style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', flexShrink: 0 }}
          >
            {sendMsg.isPending
              ? <Icon name="loader" size={13} style={{ animation: 'spin 0.9s linear infinite' }} />
              : <Icon name="send" size={13} stroke={2} />}
          </button>
        </div>
      ) : (
        <div style={{
          flexShrink: 0,
          margin: '10px 14px 14px',
          padding: '10px 14px',
          borderRadius: 10,
          background: 'rgba(179,155,255,0.08)',
          border: '1px solid rgba(179,155,255,0.20)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          fontSize: 12,
          color: 'var(--purple)',
        }}>
          <Icon name="bot" size={13} stroke={1.8} />
          <span style={{ flex: 1 }}>AI is handling this conversation.</span>
          <button onClick={() => takeover.mutate()} disabled={takeover.isPending} style={{ fontSize: 11, color: 'var(--purple)', background: 'rgba(179,155,255,0.15)', border: '1px solid rgba(179,155,255,0.30)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
            Take over
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main inbox page ──────────────────────────────────────────────────────────

const FILTERS = [
  { id: 'all',    label: 'All' },
  { id: 'ai',     label: 'AI' },
  { id: 'human',  label: 'Human' },
  { id: 'esc',    label: 'Escalated' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

interface ConvPage { items: ConversationSummary[]; nextCursor: string | null; }

export default function ConversationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get('id') ?? null;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterId>('all');
  const [unread, setUnread] = useState<Record<string, number>>({});
  const listRef = useRef<HTMLDivElement>(null);

  const { on, connectionState } = useRealtime();

  const query = useInfiniteQuery<ConvPage>({
    queryKey: ['conversations-inbox', filter],
    queryFn: ({ pageParam }) => apiClient.get<ConvPage>('/conversations', {
      cursor: pageParam as string | undefined,
      limit: 30,
      ...(filter === 'ai' ? { aiActive: true } : {}),
      ...(filter === 'human' ? { aiActive: false } : {}),
    }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p: ConvPage) => p.nextCursor ?? undefined,
  });

  const qc = useQueryClient();
  const conversations: ConversationSummary[] = query.data?.pages.flatMap(p => p.items) ?? [];

  // Realtime: update list on new message, mark unread
  useEffect(() => {
    const offMsg = on('message:new', (evt: MessageNewEvent) => {
      qc.setQueryData(
        ['conversations-inbox', filter],
        (old: { pages: ConvPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page, i) =>
              i === 0
                ? { ...page, items: page.items.map(c => c.id === evt.conversationId ? { ...c, updatedAt: evt.createdAt } : c) }
                : page,
            ),
          };
        },
      );
      // Mark unread if not currently selected
      if (evt.conversationId !== selectedId) {
        setUnread(prev => ({ ...prev, [evt.conversationId]: (prev[evt.conversationId] ?? 0) + 1 }));
      }
    });

    const offTakeover = on('conversation:takeover', (evt: ConversationTakeoverEvent) => {
      qc.setQueryData(
        ['conversations-inbox', filter],
        (old: { pages: ConvPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              items: page.items.map(c =>
                c.id === evt.conversationId
                  ? { ...c, status: 'HUMAN_ACTIVE', aiActive: false, takenOverBy: evt.takenOverBy }
                  : c,
              ),
            })),
          };
        },
      );
    });

    const offEsc = on('conversation:escalated', (evt: ConversationEscalatedEvent) => {
      qc.setQueryData(
        ['conversations-inbox', filter],
        (old: { pages: ConvPage[]; pageParams: unknown[] } | undefined) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map(page => ({
              ...page,
              items: page.items.map(c =>
                c.id === evt.conversationId
                  ? { ...c, escalationLevel: evt.escalationLevel }
                  : c,
              ),
            })),
          };
        },
      );
      if (evt.conversationId !== selectedId) {
        setUnread(prev => ({ ...prev, [evt.conversationId]: (prev[evt.conversationId] ?? 0) + 1 }));
      }
    });

    return () => { offMsg(); offTakeover(); offEsc(); };
  }, [on, qc, filter, selectedId]);

  // Clear unread when conversation is selected
  const selectConversation = useCallback((id: string) => {
    setUnread(prev => { const n = { ...prev }; delete n[id]; return n; });
    void router.push(`/conversations?id=${id}`, { scroll: false });
  }, [router]);

  // Filter conversations
  const filtered = conversations.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      const name = c.lead?.name?.toLowerCase() ?? '';
      const phone = c.lead?.phone ?? '';
      const id = c.leadId.toLowerCase();
      if (!name.includes(q) && !phone.includes(q) && !id.includes(q)) return false;
    }
    if (filter === 'ai' && !c.aiActive) return false;
    if (filter === 'human' && c.aiActive) return false;
    if (filter === 'esc' && (c.escalationLevel === 'NONE' || c.escalationLevel === 'none')) return false;
    return true;
  });

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'TEXTAREA' || (e.target as HTMLElement).tagName === 'INPUT') return;
      if (e.key === 'j' || e.key === 'k') {
        e.preventDefault();
        const idx = filtered.findIndex(c => c.id === selectedId);
        const next = e.key === 'j' ? Math.min(idx + 1, filtered.length - 1) : Math.max(idx - 1, 0);
        const target = filtered[next];
        if (target) selectConversation(target.id);
      }
      if (e.key === 'Escape') {
        void router.push('/conversations', { scroll: false });
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [filtered, selectedId, selectConversation, router]);

  const totalUnread = Object.values(unread).reduce((s, v) => s + v, 0);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 130px)', margin: '-32px -32px 0', overflow: 'hidden', borderTop: '1px solid var(--border)' }}>
      {/* ── LEFT: list ────────────────────────────────────────────── */}
      <div style={{ width: 340, flexShrink: 0, display: 'flex', flexDirection: 'column', background: 'var(--bg-2)', borderRight: '1px solid var(--border)' }}>
        <AnimatePresence>
          <ConnectionBanner state={connectionState} />
        </AnimatePresence>

        {/* Search */}
        <div style={{ padding: '12px 12px 8px' }}>
          <div style={{ position: 'relative' }}>
            <Icon name="search" size={12} stroke={1.8} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search conversations…"
              style={{ width: '100%', height: 32, paddingLeft: 30, paddingRight: 12, fontSize: 12, borderRadius: 8, background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none' }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            />
          </div>
        </div>

        {/* Filter tabs */}
        <div style={{ padding: '0 12px 10px', display: 'flex', gap: 3 }}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              style={{
                flex: 1,
                height: 26,
                borderRadius: 6,
                background: filter === f.id ? 'var(--bg)' : 'transparent',
                border: `1px solid ${filter === f.id ? 'var(--border-light)' : 'transparent'}`,
                color: filter === f.id ? 'var(--text)' : 'var(--text-3)',
                fontSize: 10.5,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: "'JetBrains Mono', monospace",
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
                transition: 'all 0.15s',
              }}
            >
              {f.id === 'all' && totalUnread > 0
                ? <span style={{ color: 'var(--accent)' }}>{f.label} <span style={{ fontWeight: 800 }}>{totalUnread}</span></span>
                : f.label}
            </button>
          ))}
        </div>

        {/* List */}
        <div ref={listRef} style={{ flex: 1, overflowY: 'auto' }}>
          {query.isLoading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ padding: '12px 14px', display: 'flex', gap: 10, borderBottom: '1px solid var(--border)' }}>
                <Skeleton variant="circle" width={34} height={34} />
                <div style={{ flex: 1 }}>
                  <Skeleton variant="text" style={{ marginBottom: 6 }} />
                  <Skeleton variant="text" width="60%" />
                </div>
              </div>
            ))
          ) : filtered.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState
                illustration={<Icon name="inbox" size={28} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
                title="No conversations"
                description={search ? 'No matches for your search.' : 'Leads appear here when they reply.'}
              />
            </div>
          ) : (
            <>
              {filtered.map(conv => (
                <ConvRow
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === selectedId}
                  unreadCount={unread[conv.id] ?? 0}
                  onClick={() => selectConversation(conv.id)}
                />
              ))}
              {query.hasNextPage && (
                <button
                  onClick={() => void query.fetchNextPage()}
                  disabled={query.isFetchingNextPage}
                  style={{ width: '100%', padding: '12px', fontSize: 11, color: 'var(--text-4)', background: 'none', border: 'none', borderTop: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  {query.isFetchingNextPage ? 'Loading…' : 'Load more'}
                </button>
              )}
            </>
          )}
        </div>

        {/* Keyboard hint */}
        <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border)', display: 'flex', gap: 12, fontSize: 9.5, color: 'var(--text-5)', fontFamily: "'JetBrains Mono', monospace" }}>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 3 }}>J/K</kbd> navigate</span>
          <span><kbd style={{ padding: '1px 4px', background: 'var(--bg-4)', border: '1px solid var(--border)', borderRadius: 3 }}>ESC</kbd> close</span>
        </div>
      </div>

      {/* ── RIGHT: detail ─────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: 'var(--bg)', overflow: 'hidden', minWidth: 0 }}>
        {selectedId ? (
          <ConversationThread
            key={selectedId}
            conversationId={selectedId}
            onClose={() => void router.push('/conversations', { scroll: false })}
          />
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--text-4)' }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-3)' }}>
              <Icon name="message" size={24} stroke={1.5} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <h3 className="serif" style={{ fontSize: 22, color: 'var(--text)', margin: '0 0 4px', fontWeight: 400, fontStyle: 'italic' }}>
                Select a conversation
              </h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                Or press <kbd style={{ padding: '2px 5px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 4, fontSize: 11 }}>J</kbd> to begin
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
