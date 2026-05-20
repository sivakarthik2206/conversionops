'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';

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

        if (!response.ok) {
          throw new Error(`Failed to load trace: ${response.status}`);
        }

        const payload = await response.json() as TracePayload;
        if (!cancelled) {
          setData(payload);
        }
      } catch {
        if (!cancelled) {
          setError(`Failed to load workflow trace for lead ${leadId}.`);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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

  if (!leadId) {
    return <div className="card">Missing lead id in route.</div>;
  }

  if (loading) {
    return <div className="card">Loading workflow trace...</div>;
  }

  if (error) {
    return <div className="card" style={{ color: 'var(--red)' }}>{error}</div>;
  }

  return (
    <div>
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Workflow Trace</h1>
      <p style={{ color: 'var(--text-3)', marginBottom: 12 }}>Lead ID: {leadId}</p>
      <div className="card" style={{ overflow: 'auto' }}>
        <pre style={{ margin: 0, fontSize: 12, lineHeight: 1.45, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>
          {prettyPayload}
        </pre>
      </div>
    </div>
  );
}

