'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Icon } from '@/components/Icon';

const API = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/v1';
const ADMIN_KEY = process.env['NEXT_PUBLIC_ADMIN_API_KEY'] ?? '';

interface TracePayload {
  lead?: { id: string; status: string; name: string | null; phone: string | null };
  [key: string]: unknown;
}

export default function WorkflowTraceByLeadPage() {
  const params = useParams();
  const leadId = typeof params['leadId'] === 'string' ? params['leadId'] : '';

  const [data, setData] = useState<TracePayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    let cancelled = false;
    const fetchTrace = async (): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`${API}/admin/leads/${encodeURIComponent(leadId)}/trace`, {
          headers: { 'x-admin-api-key': ADMIN_KEY },
          cache: 'no-store',
        });
        if (!response.ok) throw new Error(`Failed to load trace: ${response.status}`);
        const payload = (await response.json()) as TracePayload;
        if (!cancelled) setData(payload);
      } catch {
        if (!cancelled) setError(`Failed to load workflow trace for lead ${leadId}.`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchTrace();

    return () => {
      cancelled = true;
    };
  }, [leadId]);

  const prettyPayload = useMemo(() => {
    if (!data) return '';
    return JSON.stringify(data, null, 2);
  }, [data]);

  function copyJson() {
    if (!prettyPayload) return;
    void navigator.clipboard.writeText(prettyPayload);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  if (!leadId) {
    return (
      <div className="card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-3)' }}>
        Missing lead id in route.
      </div>
    );
  }

  return (
    <div>
      <Link
        href="/ops/workflow-trace"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          color: 'var(--text-3)',
          textDecoration: 'none',
          padding: 0,
          marginBottom: 18,
          fontFamily: "'JetBrains Mono', monospace",
        }}
      >
        <Icon name="arrow-left" size={12} stroke={1.8} />
        Back to workflow trace
      </Link>

      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Lead trace · raw payload</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 6px', fontWeight: 400, letterSpacing: '-0.025em' }}>
            Workflow trace
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-4)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
            Lead ID · {leadId}
          </p>
        </div>
        {data && (
          <button onClick={copyJson} className="btn-ghost">
            <Icon name={copied ? 'check' : 'copy'} size={12} stroke={1.8} style={{ color: copied ? 'var(--green)' : undefined }} />
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <Icon name="loader" size={22} style={{ animation: 'spin 1s linear infinite', color: 'var(--accent)' }} />
          Loading workflow trace&hellip;
        </div>
      ) : error ? (
        <div
          className="card"
          style={{
            padding: 24,
            color: 'var(--red)',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            borderColor: 'rgba(255,92,92,0.20)',
            background: 'rgba(255,92,92,0.04)',
          }}
        >
          <Icon name="x-circle" size={18} stroke={1.8} />
          {error}
        </div>
      ) : (
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div
            style={{
              padding: '10px 16px',
              borderBottom: '1px solid var(--border)',
              background: 'var(--bg-3)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--red)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--amber)' }} />
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)' }} />
            <span
              className="eyebrow"
              style={{
                marginLeft: 12,
                color: 'var(--text-3)',
              }}
            >
              trace.json
            </span>
          </div>
          <pre
            style={{
              margin: 0,
              padding: '18px 22px',
              fontSize: 12,
              lineHeight: 1.6,
              color: 'var(--text-2)',
              fontFamily: "'JetBrains Mono', monospace",
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 'calc(100vh - 280px)',
              overflowY: 'auto',
              background: 'var(--bg)',
            }}
          >
            {prettyPayload}
          </pre>
        </div>
      )}
    </div>
  );
}
