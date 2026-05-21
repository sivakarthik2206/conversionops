'use client';
import { useState, useEffect } from 'react';
import { Icon } from '@/components/Icon';

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
    void fetch(`${API}/admin/workspaces`, { headers: { 'x-admin-api-key': ADMIN_KEY } })
      .then(r => r.json())
      .then((data: Workspace[]) => {
        setWorkspaces(data);
        if (data[0]) setSelectedWs(data[0].id);
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
      setResult((await res.json()) as DebugResult);
    } catch (err) {
      setResult({
        ok: false,
        content: null,
        error: String(err),
        inputTokens: 0,
        outputTokens: 0,
        latencyMs: 0,
        systemPromptLength: 0,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Prompt testing · Vertex AI</p>
        <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 4px', fontWeight: 400, letterSpacing: '-0.025em' }}>
          AI playground
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>
          Run the qualification chain against any workspace&apos;s config. Inputs are real — no caching.
        </p>
      </div>

      <div className="card" style={{ marginBottom: 16, padding: 22 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Workspace</label>
            <select value={selectedWs} onChange={e => setSelectedWs(e.target.value)}>
              {workspaces.length === 0 && <option>Loading…</option>}
              {workspaces.map(w => (
                <option key={w.id} value={w.id}>
                  {w.name} ({w.slug})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Simulated lead messages · one per line</label>
            <textarea
              value={messages}
              onChange={e => setMessages(e.target.value)}
              rows={6}
              style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 1.55, resize: 'vertical' }}
            />
          </div>

          <div>
            <button
              className="btn-primary"
              onClick={() => void runDebug()}
              disabled={loading || !selectedWs}
            >
              {loading ? (
                <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} />
              ) : (
                <Icon name="play" size={11} stroke={2} />
              )}
              {loading ? 'Generating…' : 'Generate AI response'}
            </button>
          </div>
        </div>
      </div>

      {result && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 12 }}>
          {/* Response */}
          <div className="card" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 180,
                height: 180,
                borderRadius: '50%',
                background: result.ok
                  ? 'radial-gradient(circle, rgba(179,155,255,0.10), transparent 70%)'
                  : 'radial-gradient(circle, rgba(255,92,92,0.10), transparent 70%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
              }}
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, position: 'relative' }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  background: result.ok ? 'rgba(179,155,255,0.14)' : 'rgba(255,92,92,0.14)',
                  border: result.ok ? '1px solid rgba(179,155,255,0.30)' : '1px solid rgba(255,92,92,0.30)',
                  color: result.ok ? 'var(--purple)' : 'var(--red)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Icon name={result.ok ? 'bot' : 'x-circle'} size={14} stroke={1.8} />
              </div>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>AI response</h3>
              {!result.ok && (
                <span
                  style={{
                    marginLeft: 'auto',
                    padding: '2px 8px',
                    borderRadius: 6,
                    background: 'rgba(255,92,92,0.12)',
                    color: 'var(--red)',
                    fontSize: 10,
                    fontWeight: 700,
                    fontFamily: "'JetBrains Mono', monospace",
                    letterSpacing: '0.06em',
                  }}
                >
                  ERROR
                </span>
              )}
            </div>

            {result.ok ? (
              <div
                style={{
                  fontSize: 14,
                  lineHeight: 1.65,
                  color: 'var(--text)',
                  whiteSpace: 'pre-wrap',
                  position: 'relative',
                  padding: '14px 16px',
                  borderRadius: 10,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  borderLeft: '3px solid var(--purple)',
                }}
              >
                {result.content}
              </div>
            ) : (
              <div
                style={{
                  color: 'var(--red)',
                  fontSize: 12,
                  fontFamily: "'JetBrains Mono', monospace",
                  padding: '12px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,92,92,0.06)',
                  border: '1px solid rgba(255,92,92,0.20)',
                  lineHeight: 1.55,
                  position: 'relative',
                }}
              >
                {result.error}
              </div>
            )}
          </div>

          {/* Perf */}
          <div className="card" style={{ padding: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <Icon name="activity" size={14} stroke={1.8} style={{ color: 'var(--accent)' }} />
              <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Performance</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { label: 'Latency',         value: `${result.latencyMs}ms`,                color: result.latencyMs < 800 ? 'var(--green)' : result.latencyMs < 2000 ? 'var(--amber)' : 'var(--red)' },
                { label: 'Input tokens',    value: result.inputTokens.toLocaleString(),    color: 'var(--text)' },
                { label: 'Output tokens',   value: result.outputTokens.toLocaleString(),   color: 'var(--text)' },
                { label: 'System prompt',   value: `${result.systemPromptLength} chars`,   color: 'var(--text-2)' },
              ].map((row, i) => (
                <div
                  key={row.label}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '10px 0',
                    borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  }}
                >
                  <span className="eyebrow" style={{ color: 'var(--text-3)' }}>{row.label}</span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: row.color,
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {row.value}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
