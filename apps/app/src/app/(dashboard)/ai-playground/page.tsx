'use client';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface WorkspaceOption {
  id: string;
  name: string;
  slug: string;
  plan: string;
}

interface WorkspacesResponse {
  items: WorkspaceOption[];
}

interface DebugResult {
  ok: boolean;
  content: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  systemPromptLength: number;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  latencyMs?: number;
  tokens?: { input: number; output: number };
  ok?: boolean;
}

export default function AIPlaygroundPage() {
  const [workspaceId, setWorkspaceId] = useState('');
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { data: wsData, isLoading: wsLoading } = useQuery<WorkspacesResponse>({
    queryKey: ['admin-workspaces'],
    queryFn: () => apiClient.get('/admin/workspaces', { limit: 100 }),
  });

  const workspaces = wsData?.items ?? [];

  const { mutate: runDebug, isPending } = useMutation<DebugResult, Error, { workspaceId: string; messages: string[] }>({
    mutationFn: (body) => apiClient.post('/admin/ai/debug', body),
    onSuccess: (result) => {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: result.content ?? result.error ?? 'No response',
          latencyMs: result.latencyMs,
          tokens: { input: result.inputTokens, output: result.outputTokens },
          ok: result.ok,
        },
      ]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    },
  });

  const send = () => {
    const text = input.trim();
    if (!text || !workspaceId || isPending) return;

    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    runDebug({
      workspaceId,
      messages: [...messages.filter(m => m.role === 'user').map(m => m.content), text],
    });
  };

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const clear = () => setMessages([]);

  const selectedWs = workspaces.find(w => w.id === workspaceId);

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 160px)' }}>
      {/* Header */}
      <div style={{ marginBottom: 20, flexShrink: 0 }}>
        <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, letterSpacing: '-0.02em', color: 'var(--text)', margin: 0 }}>
          AI Playground
        </h2>
        <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
          Test prompts against any workspace's AI config using Vertex AI Gemini
        </p>
      </div>

      {/* Workspace selector */}
      <div style={{ marginBottom: 16, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
            {wsLoading ? (
              <Skeleton style={{ height: 38, borderRadius: 10 }} />
            ) : (
              <select
                value={workspaceId}
                onChange={e => { setWorkspaceId(e.target.value); setMessages([]); }}
                style={{
                  width: '100%',
                  height: 38,
                  padding: '0 32px 0 12px',
                  borderRadius: 10,
                  background: 'var(--bg-2)',
                  border: `1px solid ${workspaceId ? 'rgba(232,255,71,0.30)' : 'var(--border)'}`,
                  color: workspaceId ? 'var(--text)' : 'var(--text-4)',
                  fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace",
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                }}
              >
                <option value="">Select workspace…</option>
                {workspaces.map(w => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.plan})
                  </option>
                ))}
              </select>
            )}
            <Icon name="chevron-down" size={12} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)', pointerEvents: 'none' }} />
          </div>

          {selectedWs && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: 'rgba(179,155,255,0.08)', border: '1px solid rgba(179,155,255,0.20)' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--purple)', boxShadow: '0 0 6px var(--purple)' }} />
              <span style={{ fontSize: 11, color: 'var(--purple)', fontFamily: "'JetBrains Mono', monospace" }}>{selectedWs.slug}</span>
            </div>
          )}

          {messages.length > 0 && (
            <button
              onClick={clear}
              style={{ padding: '6px 12px', borderRadius: 8, background: 'none', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 11, cursor: 'pointer' }}
            >
              clear
            </button>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 16,
        padding: '4px 0 16px',
        minHeight: 0,
      }}>
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, color: 'var(--text-4)' }}>
            <Icon name="bot" size={36} stroke={1.2} style={{ opacity: 0.3 }} />
            <p style={{ fontSize: 13, margin: 0, textAlign: 'center', maxWidth: 300 }}>
              {workspaceId
                ? 'Send a message to test the AI agent response'
                : 'Select a workspace to start testing'}
            </p>
            {workspaceId && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', maxWidth: 500 }}>
                {[
                  'Hi, I\'m interested in buying a home',
                  'What\'s the market like right now?',
                  'Can I schedule a showing?',
                  'Tell me about financing options',
                ].map(suggestion => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); textareaRef.current?.focus(); }}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 20,
                      background: 'var(--bg-2)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-3)',
                      fontSize: 12,
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-light)'; e.currentTarget.style.color = 'var(--text-2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-3)'; }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                gap: 4,
              }}
            >
              <div style={{
                maxWidth: '80%',
                padding: '12px 16px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user'
                  ? 'linear-gradient(135deg, rgba(232,255,71,0.15), rgba(232,255,71,0.08))'
                  : msg.ok === false
                    ? 'rgba(255,92,92,0.08)'
                    : 'var(--bg-2)',
                border: `1px solid ${msg.role === 'user' ? 'rgba(232,255,71,0.25)' : msg.ok === false ? 'rgba(255,92,92,0.25)' : 'var(--border)'}`,
                fontSize: 14,
                color: msg.role === 'user' ? 'var(--accent)' : msg.ok === false ? 'var(--red)' : 'var(--text)',
                lineHeight: 1.6,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
              }}>
                {msg.content}
              </div>
              {msg.role === 'assistant' && msg.latencyMs !== undefined && (
                <div style={{ display: 'flex', gap: 10, fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", paddingLeft: 4 }}>
                  <span>{msg.latencyMs}ms</span>
                  {msg.tokens && <span>{msg.tokens.input}→{msg.tokens.output} tokens</span>}
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {isPending && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}
          >
            <div style={{ display: 'flex', gap: 4, padding: '10px 14px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    opacity: 0.6,
                    animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        flexShrink: 0,
        padding: '12px 0 0',
        borderTop: '1px solid var(--border)',
      }}>
        <div style={{
          display: 'flex',
          gap: 10,
          background: 'var(--bg-2)',
          border: `1px solid ${workspaceId ? 'var(--border-light)' : 'var(--border)'}`,
          borderRadius: 14,
          padding: '8px 8px 8px 14px',
          transition: 'border-color 0.2s',
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={!workspaceId || isPending}
            placeholder={workspaceId ? 'Send a test message… (Enter to send, Shift+Enter for newline)' : 'Select a workspace first'}
            rows={2}
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: 14,
              color: 'var(--text)',
              resize: 'none',
              lineHeight: 1.5,
              fontFamily: 'inherit',
              caretColor: 'var(--accent)',
            }}
          />
          <button
            onClick={send}
            disabled={!input.trim() || !workspaceId || isPending}
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: input.trim() && workspaceId && !isPending ? 'var(--accent)' : 'var(--bg-4)',
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: input.trim() && workspaceId && !isPending ? 'pointer' : 'not-allowed',
              flexShrink: 0,
              alignSelf: 'flex-end',
              transition: 'background 0.2s',
            }}
          >
            <Icon
              name={isPending ? 'loader' : 'arrow-right'}
              size={15}
              stroke={2}
              style={{
                color: input.trim() && workspaceId ? '#0a0a0b' : 'var(--text-4)',
                animation: isPending ? 'spin 0.8s linear infinite' : 'none',
              }}
            />
          </button>
        </div>
        <p style={{ margin: '6px 0 0', fontSize: 10, color: 'var(--text-4)', paddingLeft: 4 }}>
          Queries go directly to Vertex AI Gemini using the selected workspace's AI configuration and system prompt.
        </p>
      </div>
    </div>
  );
}
