'use client';
import { useState, useEffect } from 'react';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface Workspace { id: string; name: string; slug: string; }
interface DebugResult {
  ok: boolean;
  content: string | null;
  error: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  systemPromptLength: number;
}

export default function AIDebugPage() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [selectedWs, setSelectedWs] = useState('');
  const [messages, setMessages] = useState('Hello, I am interested in buying a home in Austin.');
  const [result, setResult] = useState<DebugResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch(`${API}/admin/workspaces`, { headers: { 'x-admin-api-key': ADMIN_KEY } })
      .then((r) => r.json())
      .then((data) => {
        const list = data as Workspace[];
        setWorkspaces(list);
        if (list[0]) setSelectedWs(list[0].id);
      })
      .catch(() => undefined);
  }, []);

  async function runDebug() {
    if (!selectedWs) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API}/admin/ai/debug`, {
        method: 'POST',
        headers: { 'x-admin-api-key': ADMIN_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId: selectedWs, messages: messages.split('\n').filter(Boolean) }),
      });
      setResult(await res.json() as DebugResult);
    } catch (err) {
      setResult({ ok: false, content: null, error: String(err), inputTokens: 0, outputTokens: 0, latencyMs: 0, systemPromptLength: 0 });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>AI Prompt Playground</h1>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>WORKSPACE</label>
          <select value={selectedWs} onChange={(e) => setSelectedWs(e.target.value)}>
            {workspaces.map((w) => (
              <option key={w.id} value={w.id}>{w.name} ({w.slug})</option>
            ))}
          </select>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: 'var(--text-3)', display: 'block', marginBottom: 6 }}>
            SIMULATED LEAD MESSAGES (one per line)
          </label>
          <textarea
            value={messages}
            onChange={(e) => setMessages(e.target.value)}
            rows={6}
            style={{ fontFamily: 'monospace', fontSize: 12 }}
          />
        </div>

        <button className="btn-primary" onClick={() => { void runDebug(); }} disabled={loading || !selectedWs}>
          {loading ? 'Generating...' : 'Generate AI Response'}
        </button>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="card">
            <h3 style={{ fontWeight: 600, marginBottom: 12 }}>
              AI Response
              {!result.ok && <span className="badge badge-red" style={{ marginLeft: 8 }}>Error</span>}
            </h3>
            {result.ok ? (
              <div style={{ fontSize: 14, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                {result.content}
              </div>
            ) : (
              <div style={{ color: 'var(--red)', fontSize: 13 }}>{result.error}</div>
            )}
          </div>

          <div>
            <div className="card" style={{ marginBottom: 16 }}>
              <h4 style={{ fontWeight: 600, marginBottom: 12, fontSize: 13 }}>Performance</h4>
              {[
                { label: 'Latency', value: `${result.latencyMs}ms` },
                { label: 'Input tokens', value: result.inputTokens.toLocaleString() },
                { label: 'Output tokens', value: result.outputTokens.toLocaleString() },
                { label: 'System prompt', value: `${result.systemPromptLength} chars` },
              ].map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>{label}</span>
                  <span style={{ fontWeight: 500 }}>{value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
