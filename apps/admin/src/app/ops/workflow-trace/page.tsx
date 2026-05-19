'use client';
import { useState } from 'react';

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

function hallucinationBadge(score: number | undefined): JSX.Element | null {
  if (score === undefined) return null;
  const cls = score > 0.6 ? 'badge-red' : score > 0.3 ? 'badge-amber' : 'badge-green';
  return <span className={`badge ${cls}`} style={{ marginLeft: 8 }}>H:{score.toFixed(2)}</span>;
}

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
    try {
      const res = await fetch(`${API}/admin/leads/${leadId.trim()}/trace`, {
        headers: { 'x-admin-api-key': ADMIN_KEY },
      });
      if (!res.ok) { setError('Lead not found'); setTrace(null); return; }
      setTrace(await res.json() as TraceData);
    } catch {
      setError('Failed to fetch trace');
    } finally {
      setLoading(false);
    }
  }

  const allMessages = trace?.conversations?.flatMap((c) => c.messages) ?? [];

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Workflow Trace</h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <input
            type="text"
            placeholder="Enter Lead ID..."
            value={leadId}
            onChange={(e) => setLeadId(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') void fetchTrace(); }}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={() => { void fetchTrace(); }} disabled={loading}>
            {loading ? 'Loading...' : 'Trace'}
          </button>
        </div>
        {error && <div style={{ color: 'var(--red)', fontSize: 13, marginTop: 8 }}>{error}</div>}
      </div>

      {trace && (
        <>
          <div className="card" style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 8 }}>LEAD</div>
            <div style={{ fontWeight: 600 }}>{trace.lead.name ?? 'Unknown'}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 4 }}>
              {trace.lead.phone} · Status: <strong>{trace.lead.status}</strong>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Event Timeline ({trace.leadEvents.length})</h3>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {trace.leadEvents.map((ev) => (
                  <div
                    key={ev.id}
                    style={{ marginBottom: 8, cursor: 'pointer' }}
                    onClick={() => setExpandedEvent(expandedEvent === ev.id ? null : ev.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 10, color: 'var(--text-3)', minWidth: 24 }}>#{ev.sequence}</span>
                      <span style={{
                        fontSize: 11, fontWeight: 600, color: eventColor(ev.type),
                        background: eventColor(ev.type) + '18', padding: '2px 8px', borderRadius: 4,
                      }}>
                        {ev.type}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-3)' }}>
                        {new Date(ev.occurredAt).toLocaleTimeString()}
                      </span>
                    </div>
                    {expandedEvent === ev.id && (
                      <pre style={{
                        fontSize: 11, color: 'var(--text-2)', background: 'var(--bg-3)',
                        padding: 8, borderRadius: 6, marginTop: 4, overflow: 'auto',
                      }}>
                        {JSON.stringify(ev.payload, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Workflow Executions ({trace.workflowExecutions.length})</h3>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {trace.workflowExecutions.map((ex) => (
                  <div key={ex.id} style={{ marginBottom: 12, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>{ex.workflowName}</div>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                      <span className={`badge ${ex.status === 'COMPLETED' ? 'badge-green' : ex.status === 'FAILED' ? 'badge-red' : 'badge-blue'}`}>
                        {ex.status}
                      </span>
                      {ex.currentState && (
                        <span className="badge badge-muted">{ex.currentState}</span>
                      )}
                    </div>
                    {ex.lastError && (
                      <div style={{ color: 'var(--red)', fontSize: 11, marginTop: 4 }}>{ex.lastError}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {allMessages.length > 0 && (
            <div className="card">
              <h3 style={{ fontWeight: 600, marginBottom: 16 }}>AI Messages ({allMessages.length})</h3>
              <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                {allMessages.map((msg) => (
                  <div key={msg.id} style={{
                    marginBottom: 8, padding: '8px 12px', background: 'var(--bg-3)', borderRadius: 8,
                    borderLeft: `3px solid ${msg.role === 'AI' ? 'var(--accent)' : 'var(--blue)'}`,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: msg.role === 'AI' ? 'var(--accent)' : 'var(--blue)' }}>
                        {msg.role}
                      </span>
                      {msg.evalResults?.[0] && hallucinationBadge(msg.evalResults[0].hallucinationScore)}
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>
                        {new Date(msg.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{msg.content.slice(0, 300)}</div>
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
