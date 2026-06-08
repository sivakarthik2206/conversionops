'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton, StatusBadge, EmptyState } from '@conversionops/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { formatMessageTime } from '@/lib/format-time';
import { Icon } from '@/components/Icon';
import { useRealtime } from '@/hooks/useRealtime';
import type { MessageNewEvent } from '@/hooks/useRealtime';

interface Message {
  id: string;
  role: 'AI' | 'HUMAN' | 'SYSTEM';
  content: string;
  createdAt: string;
}

interface ConversationDetail {
  id: string;
  status: string;
  aiActive: boolean;
  lead: {
    id: string;
    name: string;
    phone: string | null;
    score: number;
    tier: string;
    status: string;
  };
  messages: Message[];
}

function scoreColor(score: number): string {
  if (score >= 80) return 'var(--green)';
  if (score >= 50) return 'var(--accent)';
  if (score >= 30) return 'var(--amber)';
  return 'var(--red)';
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [messageText, setMessageText] = useState('');
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [sendError, setSendError] = useState<string | null>(null);

  const MESSAGE_LIMIT = 1600;

  const { data, isLoading, isError } = useQuery<ConversationDetail>({
    queryKey: ['conversation', params.id],
    queryFn: () => apiClient.get(`/conversations/${params.id}`),
  });

  // Seed local messages from query data on first load
  useEffect(() => {
    if (data?.messages) {
      setLocalMessages(data.messages);
    }
  }, [data?.messages]);

  // Subscribe to realtime message:new events — no more polling
  const { on, joinConversation } = useRealtime();

  useEffect(() => {
    if (params.id) joinConversation(params.id);
  }, [params.id, joinConversation]);

  useEffect(() => {
    const off = on('message:new', (event: MessageNewEvent) => {
      if (event.conversationId !== params.id) return;
      setLocalMessages(prev => {
        if (prev.some(m => m.id === event.messageId)) return prev;
        return [
          ...prev,
          {
            id: event.messageId,
            role: event.role,
            content: event.content,
            createdAt: event.createdAt,
          },
        ];
      });
      // Invalidate the query so conversation header data stays fresh (status, aiActive)
      void qc.invalidateQueries({ queryKey: ['conversation', params.id] });
    });
    return off;
  }, [on, params.id, qc]);

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/conversations/${params.id}/message`, { content }),
    onMutate: async (content: string) => {
      setSendError(null);
      setMessageText('');
      // Optimistic update — add the message locally immediately
      const optimistic: Message = {
        id: `optimistic-${Date.now()}`,
        role: 'HUMAN',
        content,
        createdAt: new Date().toISOString(),
      };
      setLocalMessages(prev => [...prev, optimistic]);
      return { content };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['conversation', params.id] });
    },
    onError: (err, _content, context) => {
      // Remove optimistic message and restore the input content on failure
      setLocalMessages(prev => prev.filter(m => !m.id.startsWith('optimistic-')));
      if (context?.content) setMessageText(context.content);
      setSendError(err instanceof Error ? err.message : 'Failed to send message. Try again.');
    },
  });

  const takeover = useMutation({
    mutationFn: () => apiClient.post(`/conversations/${params.id}/takeover`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversation', params.id] }),
  });

  const releaseToAI = useMutation({
    mutationFn: () => apiClient.post(`/conversations/${params.id}/release`, {}),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['conversation', params.id] }),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [localMessages]);

  const handleSend = useCallback(() => {
    const text = messageText.trim();
    if (text && text.length <= MESSAGE_LIMIT) sendMessage.mutate(text);
  }, [messageText, sendMessage]);

  // Auto-grow textarea up to 4 lines
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const lineHeight = 21; // ~14px * 1.5 line-height
    const maxHeight = lineHeight * 4 + 20; // 4 lines + padding
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, [messageText]);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Skeleton style={{ height: 32, width: 240 }} />
        <Skeleton style={{ height: 600 }} />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        illustration={<Icon name="x-circle" size={32} stroke={1.5} style={{ color: 'var(--red)' }} />}
        title="Conversation not found"
        description="This conversation may have been deleted or you don't have access."
        action={
          <button
            onClick={() => router.push('/conversations')}
            className="btn-primary"
          >
            Back to conversations
          </button>
        }
      />
    );
  }

  const isAIActive = data.aiActive;
  const score = data.lead.score;
  const sColor = scoreColor(score);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 130px)' }}>
      {/* Header card */}
      <div
        className="surface-card"
        style={{
          padding: 18,
          marginBottom: 16,
          display: 'flex',
          alignItems: 'center',
          gap: 18,
        }}
      >
        <button
          onClick={() => router.push('/conversations')}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--bg-3)',
            border: '1px solid var(--border)',
            color: 'var(--text-2)',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text)'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
        >
          <Icon name="arrow-left" size={15} stroke={1.8} />
        </button>

        {/* Score ring */}
        <ScoreRing score={score} />

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <h1 className="serif" style={{ fontSize: 24, color: 'var(--text)', margin: 0, fontWeight: 400, letterSpacing: '-0.02em' }}>
              {data.lead.name || `Lead · ${data.lead.id.slice(-6)}`}
            </h1>
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 4,
                background: `${sColor}1f`,
                color: sColor,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {data.lead.tier}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-3)' }}>
            <StatusBadge status={data.lead.status} />
            {data.lead.phone && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                <Icon name="phone" size={11} stroke={1.6} />
                {data.lead.phone}
              </span>
            )}
          </div>
        </div>

        {/* Realtime indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 10, color: 'var(--green)', fontFamily: "'JetBrains Mono', monospace" }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
          Live
        </div>

        {isAIActive ? (
          <button
            onClick={() => takeover.mutate()}
            disabled={takeover.isPending}
            className="btn-primary"
          >
            <Icon name="user" size={13} stroke={2} />
            Take over
          </button>
        ) : (
          <button
            onClick={() => releaseToAI.mutate()}
            disabled={releaseToAI.isPending}
            className="btn-ghost"
          >
            <Icon name="bot" size={13} stroke={1.8} />
            Release to AI
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        className="surface-card"
        style={{
          flex: 1,
          padding: '20px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
          overflowY: 'auto',
          minHeight: 0,
        }}
      >
        <AnimatePresence initial={false}>
          {localMessages.map(msg => {
            if (msg.role === 'SYSTEM') {
              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  style={{ display: 'flex', justifyContent: 'center', margin: '4px 0' }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      color: 'var(--text-3)',
                      fontStyle: 'italic',
                      padding: '4px 12px',
                      borderRadius: 100,
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      fontFamily: "'Instrument Serif', serif",
                    }}
                  >
                    {msg.content}
                  </span>
                </motion.div>
              );
            }

            const isHuman = msg.role === 'HUMAN';
            const isOptimistic = msg.id.startsWith('optimistic-');
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: isOptimistic ? 0.7 : 1, y: 0 }}
                transition={{ duration: 0.25 }}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: isHuman ? 'flex-end' : 'flex-start',
                  gap: 4,
                }}
              >
                <div
                  style={{
                    maxWidth: '76%',
                    padding: '10px 14px',
                    borderRadius: isHuman ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    fontSize: 14,
                    lineHeight: 1.5,
                    color: isHuman ? '#0a0a0b' : 'var(--text)',
                    background: isHuman
                      ? 'linear-gradient(135deg, var(--accent), var(--accent-2))'
                      : 'var(--bg-3)',
                    border: isHuman ? 'none' : '1px solid var(--border)',
                    boxShadow: isHuman ? '0 4px 14px rgba(232,255,71,0.18)' : 'none',
                  }}
                >
                  {!isHuman && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                      <Icon name="bot" size={11} stroke={1.8} style={{ color: 'var(--purple)' }} />
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: 'var(--purple)',
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                          fontFamily: "'JetBrains Mono', monospace",
                        }}
                      >
                        AI
                      </span>
                    </div>
                  )}
                  {msg.content}
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-4)',
                    fontFamily: "'JetBrains Mono', monospace",
                    padding: '0 4px',
                  }}
                >
                  {isOptimistic ? 'Sending…' : formatMessageTime(msg.createdAt)}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isAIActive ? (
        <div className="surface-card" style={{ marginTop: 12, padding: 12 }}>
          {sendError && (
            <div style={{ marginBottom: 8, padding: '8px 12px', borderRadius: 8, background: 'rgba(255,71,71,0.08)', border: '1px solid rgba(255,71,71,0.25)', fontSize: 12, color: 'var(--red)' }}>
              {sendError}
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
            <textarea
              ref={textareaRef}
              value={messageText}
              onChange={e => {
                if (e.target.value.length <= MESSAGE_LIMIT) setMessageText(e.target.value);
              }}
              onKeyDown={e => {
                const isSendCombo = (e.metaKey || e.ctrlKey) && e.key === 'Enter';
                const isPlainEnter = e.key === 'Enter' && !e.shiftKey && !e.metaKey && !e.ctrlKey;
                if ((isSendCombo || isPlainEnter) && messageText.trim()) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message… (Cmd/Ctrl+Enter to send)"
              rows={1}
              style={{
                flex: 1,
                resize: 'none',
                fontSize: 14,
                fontFamily: 'inherit',
                background: 'transparent',
                outline: 'none',
                border: 'none',
                color: 'var(--text)',
                caretColor: 'var(--accent)',
                lineHeight: 1.5,
                maxHeight: 104,
                overflowY: 'auto',
              }}
            />
            <button
              onClick={handleSend}
              disabled={!messageText.trim() || messageText.length > MESSAGE_LIMIT || sendMessage.isPending}
              className="btn-primary"
              style={{ width: 40, padding: 0, height: 40, borderRadius: '50%', flexShrink: 0 }}
            >
              {sendMessage.isPending ? (
                <Icon name="loader" size={14} style={{ animation: 'spin 0.9s linear infinite' }} />
              ) : (
                <Icon name="send" size={14} stroke={2} />
              )}
            </button>
          </div>
          {messageText.length > 1400 && (
            <div style={{ textAlign: 'right', marginTop: 6, fontSize: 11, color: messageText.length > MESSAGE_LIMIT ? 'var(--red)' : 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
              {messageText.length}/{MESSAGE_LIMIT}
            </div>
          )}
        </div>
      ) : (
        <div
          style={{
            marginTop: 12,
            padding: '12px 16px',
            borderRadius: 12,
            background: 'rgba(179,155,255,0.08)',
            border: '1px solid rgba(179,155,255,0.20)',
            color: 'var(--purple)',
            fontSize: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon name="bot" size={14} stroke={1.8} />
          <span>AI is handling this conversation. Take over to send a manual message.</span>
        </div>
      )}
    </div>
  );
}

function ScoreRing({ score }: { score: number }) {
  const size = 56;
  const r = (size - 6) / 2;
  const circ = 2 * Math.PI * r;
  const color = scoreColor(score);
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--bg-4)" strokeWidth={4} />
        <motion.circle
          cx={size/2}
          cy={size/2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={4}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(score/100)*circ} ${circ}` }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          transform={`rotate(-90 ${size/2} ${size/2})`}
          style={{ filter: `drop-shadow(0 0 6px ${color})` }}
        />
      </svg>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 14,
          fontWeight: 600,
          color,
        }}
      >
        {score}
      </div>
    </div>
  );
}
