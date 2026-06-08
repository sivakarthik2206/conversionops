'use client';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icon } from '@/components/Icon';

export type IntegrationStatus = 'connected' | 'disconnected' | 'error';

interface Props {
  provider: string;
  name: string;
  description: string;
  logo: React.ReactNode;
  status: IntegrationStatus;
  configSummary?: string;
  badge?: string;
  onConnect: () => void;
  onDisconnect: () => Promise<void>;
  onTest: () => Promise<{ success: boolean; message: string; latencyMs: number }>;
  readOnly?: boolean;
}

const STATUS_META: Record<IntegrationStatus, { color: string; label: string; dot: string }> = {
  connected:    { color: 'var(--green)',  label: 'Connected',     dot: '#47ff8e' },
  disconnected: { color: 'var(--text-4)', label: 'Not connected', dot: '#52525b' },
  error:        { color: 'var(--red)',    label: 'Error',         dot: '#ff4747' },
};

export function IntegrationCard({ provider, name, description, logo, status, configSummary, badge, onConnect, onDisconnect, onTest, readOnly }: Props) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs: number } | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const meta = STATUS_META[status];

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const r = await onTest();
      setTestResult(r);
    } finally {
      setTesting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try { await onDisconnect(); } finally { setDisconnecting(false); setConfirmDisconnect(false); }
  };

  return (
    <motion.div
      layout
      className="surface-card"
      style={{ padding: 0, overflow: 'hidden' }}
    >
      {/* Main row */}
      <div style={{ padding: '18px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          {/* Logo */}
          <div style={{ width: 42, height: 42, borderRadius: 10, background: 'var(--bg-3)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            {logo}
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{name}</span>
              {/* Status badge */}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '2px 8px', borderRadius: 100, background: `${meta.dot}14`, border: `1px solid ${meta.dot}33`, fontSize: 11, fontWeight: 600, color: meta.color, letterSpacing: '0.04em', fontFamily: "'JetBrains Mono', monospace" }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: meta.dot, boxShadow: status === 'connected' ? `0 0 5px ${meta.dot}` : 'none' }} />
                {meta.label}
              </span>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0, lineHeight: 1.5 }}>{description}</p>
            {badge && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 6, fontSize: 11, color: 'var(--text-4)' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 14, height: 14, borderRadius: 4, background: '#ff4a00', color: '#fff', fontSize: 9, fontWeight: 700 }}>Z</span>
                {badge}
              </span>
            )}
            {configSummary && status === 'connected' && (
              <p style={{ fontSize: 12, color: 'var(--text-4)', margin: '6px 0 0', fontFamily: "'JetBrains Mono', monospace" }}>{configSummary}</p>
            )}
          </div>
        </div>
      </div>

      {/* Test result */}
      <AnimatePresence>
        {testResult && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ padding: '8px 20px', background: testResult.success ? 'rgba(71,255,142,0.06)' : 'rgba(255,71,71,0.06)', borderTop: `1px solid ${testResult.success ? 'rgba(71,255,142,0.15)' : 'rgba(255,71,71,0.15)'}` }}>
            <span style={{ fontSize: 12, color: testResult.success ? 'var(--green)' : 'var(--red)', fontFamily: "'JetBrains Mono', monospace" }}>
              {testResult.success ? '✓' : '✗'} {testResult.message}{testResult.success ? ` — ${testResult.latencyMs}ms` : ''}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Disconnect confirmation */}
      <AnimatePresence>
        {confirmDisconnect && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            style={{ padding: '12px 20px', background: 'rgba(255,71,71,0.05)', borderTop: '1px solid rgba(255,71,71,0.15)', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 200 }}>
              Disconnect <strong>{name}</strong>? This will stop all data flow from this integration.
            </span>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDisconnect(false)} style={{ padding: '6px 14px', borderRadius: 7, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleDisconnect} disabled={disconnecting} style={{ padding: '6px 14px', borderRadius: 7, background: 'rgba(255,71,71,0.12)', border: '1px solid rgba(255,71,71,0.30)', color: 'var(--red)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                {disconnecting ? 'Disconnecting...' : 'Yes, disconnect'}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Action footer */}
      {!readOnly && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10, background: 'var(--bg-3)' }}>
          {status === 'connected' ? (
            <>
              <button onClick={handleTest} disabled={testing} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px', borderRadius: 8, background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 12, cursor: testing ? 'not-allowed' : 'pointer', opacity: testing ? 0.7 : 1 }}>
                {testing ? <Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> : <Icon name="reload" size={12} stroke={2} />}
                {testing ? 'Testing...' : 'Test connection'}
              </button>
              {!confirmDisconnect && (
                <button onClick={() => setConfirmDisconnect(true)} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', border: '1px solid rgba(255,71,71,0.25)', color: 'var(--red)', fontSize: 12, cursor: 'pointer' }}>
                  Disconnect
                </button>
              )}
            </>
          ) : (
            <button onClick={onConnect} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 18px', borderRadius: 8, background: 'var(--accent)', color: '#000', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              Connect
              <Icon name="arrow-right" size={13} stroke={2.5} />
            </button>
          )}
        </div>
      )}

      {readOnly && status === 'connected' && (
        <div style={{ padding: '10px 20px', borderTop: '1px solid var(--border)', background: 'var(--bg-3)' }}>
          <span style={{ fontSize: 12, color: 'var(--text-4)' }}>Configured at infrastructure level · no action needed</span>
        </div>
      )}

      <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
    </motion.div>
  );
}
