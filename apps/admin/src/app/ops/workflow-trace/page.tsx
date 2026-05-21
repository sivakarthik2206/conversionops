'use client';
import { useState } from 'react';
import { Icon } from '@/components/Icon';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface LeadEvent {
  id: string;
  sequence: number;
  type: string;
  occurredAt: string;
  triggeredBy: string | null;
  payload: Record<string, unknown>;
}

interface WorkflowExecution {
  id: string;
  workflowName: string;
  status: string;
  currentState: string | null;
  startedAt: string | null;
  completedAt: string | null;
  lastError: string | null;
}

interface Message {
  id: string;
  role: string;
  content: string;
  createdAt: string;
  evalResults?: Array<{
    hallucinationScore?: number;
    relevanceScore?: number;
    overallScore?: number;
  }>;
}

interface TraceData {
  lead: { id: string; status: string; name: string | null; phone: string | null };
  leadEvents: LeadEvent[];
  workflowExecutions: WorkflowExecution[];
  conversations?: Array<{ messages: Message[] }>;
}

function eventColor(type: string): string {
  if (type.includes('CONVERTED') || type.includes('QUALIFIED') || type.includes('BOOKED')) return 'var(--green)';
  if (type.includes('ERROR') || type.includes('FAILED') || type.includes('OPT_OUT')) return 'var(--red)';
  return 'var(--blue)';
}

function HallucinationBadge({ score }: { score: number | undefined }) {
  if (score === undefined) return null;
  const cls = score > 0.6 ? 'badge-red' : score > 0.3 ? 'badge-amber' : 'badge-green';
  return <span className={`badge ${cls}`} style={{ marginLeft: 8 }}>H {score.toFixed(2)}</span>;
}

const STATUS_TONE: Record<string, string> = {
  COMPLETED: 'badge-green',
  RUNNING:   'badge-blue',
  FAILED:    'badge-red',
  PENDING:   'badge-amber',
};

export default function WorkflowTracePage() {
  const [leadId, setLeadId] = useState('');
  const [trace, setTrace] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  async function fetchTrace() {
    if (!leadId.trim()) return;
    setLoading(true);
    setError(null);
    setExpandedEvent(null);
    try {
      const res = await fetch(`${API}/admin/leads/${leadId.trim()}/trace`, {
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
      if (!res.ok) {
        setError('Lead not found');
        setTrace(null);
        return;
      }
      setTrace((await res.json()) as TraceData);
    } catch {
      setError('Failed to fetch trace');
    } finally {
      setLoading(false);
    }
  }

  const allMessages = trace?.conversations?.flatMap(c => c.messages) ?? [];

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Debug · lead lifecycle</p>
        <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 4px', fontWeight: 400, letterSpacing: '-0.025em' }}>
          Workflow trace
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
          Inspect events, XState executions, and AI messages for any lead.
        </p>
      </div>

      {/* Search */}
      <div className="card" style={{ marginBottom: 16, padding: 18 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'stretch' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Icon name="search" size={13} stroke={1.8} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-4)' }} />
            <input
              type="text"
              placeholder="Lead ID (cuid)…"
              value={leadId}
              onChange={e => setLeadId(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') void fetchTrace(); }}
              style={{ paddingLeft: 34, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
            />
          </div>
          <button className="btn-primary" onClick={() => void fetchTrace()} disabled={loading || !leadId.trim()}>
            {loading ? <Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Icon name="arrow-right" size={11} stroke={2.2} />}
            {loading ? 'Loading' : 'Trace'}
          </button>
        </div>
        {error && (
          <div
            style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: 'rgba(255,92,92,0.06)',
              border: '1px solid rgba(255,92,92,0.20)',
              color: 'var(--red)',
              fontSize: 12,
              display: 'flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Icon name="x-circle" size={13} stroke={1.8} />
            {error}
          </div>
        )}
      </div>

      {trace && (
        <>
          {/* Lead summary */}
          <div className="card" style={{ marginBottom: 16, padding: 22, display: 'flex', alignItems: 'center', gap: 18, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(232,255,71,0.10), transparent 70%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
              }}
            />
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 11,
                background: 'linear-gradient(135deg, var(--accent), var(--accent-2))',
                color: '#0a0a0b',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                boxShadow: '0 6px 20px rgba(232,255,71,0.25), inset 0 1px 0 rgba(255,255,255,0.45)',
              }}
            >
              <Icon name="user" size={18} stroke={2} />
            </div>
            <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
              <div className="eyebrow" style={{ color: 'var(--text-3)', marginBottom: 2 }}>Lead</div>
              <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.01em' }}>
                {trace.lead.name ?? 'Unknown'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace" }}>
                {trace.lead.phone ?? '—'} · ID {trace.lead.id.slice(-12)}
              </div>
            </div>
            <span className="badge badge-accent">{trace.lead.status}</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            {/* Events */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon name="activity" size={13} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Event timeline</h3>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {trace.leadEvents.length}
                </span>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', position: 'relative', paddingLeft: 18 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: 8,
                    bottom: 8,
                    width: 1,
                    background: 'linear-gradient(180deg, var(--accent-glow), transparent)',
                  }}
                />
                {trace.leadEvents.map(ev => {
                  const color = eventColor(ev.type);
                  const isOpen = expandedEvent === ev.id;
                  return (
                    <div
                      key={ev.id}
                      style={{ position: 'relative', paddingBottom: 14, paddingLeft: 14, cursor: 'pointer' }}
                      onClick={() => setExpandedEvent(isOpen ? null : ev.id)}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          left: -7,
                          top: 4,
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: 'var(--bg-2)',
                          border: `2px solid ${color}`,
                          boxShadow: `0 0 8px ${color}55`,
                        }}
                      />
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span
                          style={{
                            fontSize: 9,
                            color: 'var(--text-4)',
                            fontFamily: "'JetBrains Mono', monospace",
                            minWidth: 22,
                          }}
                        >
                          #{ev.sequence}
                        </span>
                        <span
                          style={{
                            fontSize: 10.5,
                            fontWeight: 700,
                            color,
                            background: `${color}14`,
                            border: `1px solid ${color}33`,
                            padding: '2px 8px',
                            borderRadius: 100,
                            fontFamily: "'JetBrains Mono', monospace",
                            letterSpacing: '0.04em',
                          }}
                        >
                          {ev.type}
                        </span>
                        <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                          {new Date(ev.occurredAt).toLocaleTimeString()}
                        </span>
                      </div>
                      {isOpen && Object.keys(ev.payload).length > 0 && (
                        <pre
                          style={{
                            margin: '8px 0 0',
                            fontSize: 11,
                            color: 'var(--text-2)',
                            background: 'var(--bg-3)',
                            border: '1px solid var(--border)',
                            padding: 10,
                            borderRadius: 8,
                            overflow: 'auto',
                            fontFamily: "'JetBrains Mono', monospace",
                            lineHeight: 1.5,
                            maxHeight: 200,
                          }}
                        >
                          {JSON.stringify(ev.payload, null, 2)}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Workflow executions */}
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon name="cpu" size={13} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Workflow executions</h3>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {trace.workflowExecutions.length}
                </span>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {trace.workflowExecutions.map(ex => (
                  <div
                    key={ex.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 9,
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
                      {ex.workflowName}
                    </div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <span className={`badge ${STATUS_TONE[ex.status] ?? 'badge-muted'}`}>{ex.status}</span>
                      {ex.currentState && <span className="badge badge-muted">{ex.currentState}</span>}
                    </div>
                    {ex.lastError && (
                      <div
                        style={{
                          color: 'var(--red)',
                          fontSize: 11,
                          marginTop: 8,
                          padding: '6px 10px',
                          borderRadius: 6,
                          background: 'rgba(255,92,92,0.06)',
                          border: '1px solid rgba(255,92,92,0.18)',
                          fontFamily: "'JetBrains Mono', monospace",
                          lineHeight: 1.5,
                        }}
                      >
                        {ex.lastError.slice(0, 200)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          {allMessages.length > 0 && (
            <div className="card" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                <Icon name="message" size={13} stroke={1.8} style={{ color: 'var(--accent)' }} />
                <h3 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', margin: 0 }}>AI messages</h3>
                <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {allMessages.length}
                </span>
              </div>
              <div style={{ maxHeight: 420, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {allMessages.map(msg => (
                  <div
                    key={msg.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-3)',
                      border: '1px solid var(--border)',
                      borderRadius: 9,
                      borderLeft: `3px solid ${msg.role === 'AI' ? 'var(--purple)' : 'var(--blue)'}`,
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: msg.role === 'AI' ? 'var(--purple)' : 'var(--blue)',
                          fontFamily: "'JetBrains Mono', monospace",
                          letterSpacing: '0.04em',
                        }}
                      >
                        {msg.role}
                      </span>
                      {msg.evalResults?.[0] && <HallucinationBadge score={msg.evalResults[0].hallucinationScore} />}
                      <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace" }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>
                      {msg.content.slice(0, 320)}
                      {msg.content.length > 320 && <span style={{ color: 'var(--text-4)' }}>…</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
