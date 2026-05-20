'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, UserCheck, Bot, Send, AlertCircle, Loader2 } from 'lucide-react';
import { Skeleton, StatusBadge, EmptyState } from '@conversionops/ui';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

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
  if (score >= 30) return 'var(--amber)';
  return 'var(--red)';
}

export default function ConversationDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const qc = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messageText, setMessageText] = useState('');

  const { data, isLoading, isError } = useQuery<ConversationDetail>({
    queryKey: ['conversation', params.id],
    queryFn: () => apiClient.get(`/conversations/${params.id}`),
    refetchInterval: 5000,
  });

  const sendMessage = useMutation({
    mutationFn: (content: string) =>
      apiClient.post(`/conversations/${params.id}/message`, { content }),
    onSuccess: () => {
      setMessageText('');
      void qc.invalidateQueries({ queryKey: ['conversation', params.id] });
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
  }, [data?.messages]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <EmptyState
        illustration={<AlertCircle size={32} style={{ color: 'var(--red)' }} />}
        title="Conversation not found"
        description="This conversation may have been deleted or you don't have access."
        action={
          <button
            onClick={() => router.push('/conversations')}
            className="px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            Back to conversations
          </button>
        }
      />
    );
  }

  const isAIActive = data.aiActive;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col h-[calc(100vh-130px)] -mt-2"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/conversations')}
            className="p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            <ArrowLeft size={18} style={{ color: 'var(--text-3)' }} />
          </button>
          <div>
            <h1 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{data.lead.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <StatusBadge status={data.lead.status} />
              <span className="text-xs" style={{ color: 'var(--text-3)' }}>{data.lead.phone ?? 'No phone'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold"
            style={{ background: `${scoreColor(data.lead.score)}20`, color: scoreColor(data.lead.score), border: `2px solid ${scoreColor(data.lead.score)}` }}
          >
            {data.lead.score}
          </div>
          {isAIActive ? (
            <button
              onClick={() => takeover.mutate()}
              disabled={takeover.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--accent)', color: 'var(--bg)' }}
            >
              <UserCheck size={14} />
              Take over
            </button>
          ) : (
            <button
              onClick={() => releaseToAI.mutate()}
              disabled={releaseToAI.isPending}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--bg-4)', color: 'var(--text)' }}
            >
              <Bot size={14} />
              Release to AI
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto rounded-[10px] p-4 space-y-3"
        style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
      >
        <AnimatePresence initial={false}>
          {data.messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex ${msg.role === 'HUMAN' ? 'justify-end' : msg.role === 'SYSTEM' ? 'justify-center' : 'justify-start'}`}
            >
              {msg.role === 'SYSTEM' ? (
                <span className="text-xs italic px-3 py-1 rounded-full" style={{ color: 'var(--text-3)', background: 'var(--bg-4)' }}>
                  {msg.content}
                </span>
              ) : (
                <div
                  className="max-w-[75%] rounded-[10px] px-4 py-2.5 text-sm"
                  style={{
                    background: msg.role === 'HUMAN' ? 'var(--accent-dim)' : 'var(--bg-3)',
                    borderLeft: msg.role === 'AI' ? '2px solid var(--purple)' : undefined,
                    borderRight: msg.role === 'HUMAN' ? '2px solid var(--accent)' : undefined,
                    color: 'var(--text)',
                  }}
                >
                  {msg.role === 'AI' && (
                    <div className="flex items-center gap-1.5 mb-1">
                      <Bot size={11} style={{ color: 'var(--purple)' }} />
                      <span className="text-xs font-medium" style={{ color: 'var(--purple)' }}>AI</span>
                    </div>
                  )}
                  {msg.content}
                  <div className="text-[10px] mt-1" style={{ color: 'var(--text-4)' }}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {!isAIActive && (
        <div
          className="mt-3 flex items-end gap-2 rounded-[10px] p-3"
          style={{ background: 'var(--bg-2)', border: '1px solid var(--border)' }}
        >
          <textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && messageText.trim()) {
                e.preventDefault();
                sendMessage.mutate(messageText.trim());
              }
            }}
            placeholder="Type a message… (Enter to send)"
            rows={2}
            className="flex-1 resize-none text-sm bg-transparent outline-none"
            style={{ color: 'var(--text)' }}
          />
          <button
            onClick={() => messageText.trim() && sendMessage.mutate(messageText.trim())}
            disabled={!messageText.trim() || sendMessage.isPending}
            className="p-2 rounded-lg transition-colors"
            style={{ background: 'var(--accent)', color: 'var(--bg)' }}
          >
            {sendMessage.isPending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      )}
      {isAIActive && (
        <div className="mt-3 text-center text-xs py-2 rounded-lg" style={{ background: 'var(--accent-dim-2)', color: 'var(--accent)' }}>
          <Bot size={12} className="inline mr-1" />
          AI is handling this conversation. Take over to send a manual message.
        </div>
      )}
    </motion.div>
  );
}
