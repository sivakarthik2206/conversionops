'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Modal, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu'];

interface Workspace { name: string; timezone: string; twilioNumber: string | null; aiPaused: boolean; }

export default function WorkspaceSettingsPage() {
  const { addToast } = useToast();
  const { data: workspace, refetch } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [saving, setSaving] = useState(false);
  const [pauseModal, setPauseModal] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (workspace) { setName(workspace.name); setTimezone(workspace.timezone); }
  }, [workspace]);

  const save = async () => {
    setSaving(true);
    try { await apiClient.patch('/workspaces/me', { name, timezone }); addToast('Workspace settings saved', 'success'); await refetch(); }
    catch { addToast('Failed to save', 'error'); }
    finally { setSaving(false); }
  };

  const toggleAI = async () => {
    setToggling(true);
    try {
      if (workspace?.aiPaused) {
        await apiClient.post('/workspaces/me/ai/resume', {});
        addToast('AI resumed', 'success');
      } else {
        await apiClient.post('/workspaces/me/ai/pause', {});
        addToast('AI paused', 'warning');
      }
      await refetch();
    } catch { addToast('Failed to toggle AI', 'error'); }
    finally { setToggling(false); setPauseModal(false); }
  };

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 680 }}>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · Workspace</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Workspace
          </h1>
        </div>

        {/* General */}
        <SettingsCard title="General" description="Basic information about your workspace.">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Input label="Workspace name" value={name} onChange={e => setName(e.target.value)} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Timezone</label>
              <select
                value={timezone}
                onChange={e => setTimezone(e.target.value)}
                style={{
                  height: 38,
                  padding: '0 12px',
                  fontSize: 13,
                  borderRadius: 8,
                  background: 'var(--bg-3)',
                  border: '1px solid var(--border)',
                  color: 'var(--text)',
                  outline: 'none',
                }}
              >
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            {workspace?.twilioNumber && (
              <div>
                <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Twilio number</label>
                <div
                  style={{
                    marginTop: 6,
                    padding: '8px 14px',
                    borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 13,
                    color: 'var(--accent)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <Icon name="phone" size={12} stroke={1.8} />
                  {workspace.twilioNumber}
                </div>
              </div>
            )}

            <div style={{ paddingTop: 6 }}>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                {saving ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </SettingsCard>

        {/* Danger zone */}
        <div
          style={{
            marginTop: 16,
            background: workspace?.aiPaused ? 'linear-gradient(180deg, rgba(255,181,71,0.06), transparent)' : 'linear-gradient(180deg, rgba(255,92,92,0.04), transparent)',
            border: '1px solid',
            borderColor: workspace?.aiPaused ? 'rgba(255,181,71,0.18)' : 'rgba(255,92,92,0.16)',
            borderRadius: 14,
            padding: 22,
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 11,
              background: workspace?.aiPaused ? 'rgba(255,181,71,0.10)' : 'rgba(255,92,92,0.10)',
              border: '1px solid',
              borderColor: workspace?.aiPaused ? 'rgba(255,181,71,0.25)' : 'rgba(255,92,92,0.25)',
              color: workspace?.aiPaused ? 'var(--amber)' : 'var(--red)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Icon name={workspace?.aiPaused ? 'play' : 'pause'} size={16} stroke={1.8} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: workspace?.aiPaused ? 'var(--amber)' : 'var(--red)', margin: 0 }}>
              {workspace?.aiPaused ? 'AI is paused' : 'AI is active'}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '4px 0 0', lineHeight: 1.55 }}>
              {workspace?.aiPaused
                ? 'No new messages will be answered automatically. All incoming leads require manual response.'
                : 'AI is responding to all incoming leads in real time.'}
            </p>
          </div>
          <button
            onClick={() => setPauseModal(true)}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: workspace?.aiPaused ? 'rgba(255,181,71,0.10)' : 'rgba(255,92,92,0.10)',
              border: '1px solid',
              borderColor: workspace?.aiPaused ? 'rgba(255,181,71,0.30)' : 'rgba(255,92,92,0.30)',
              color: workspace?.aiPaused ? 'var(--amber)' : 'var(--red)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
          >
            {workspace?.aiPaused ? 'Resume AI' : 'Pause AI'}
          </button>
        </div>

        <Modal open={pauseModal} onClose={() => setPauseModal(false)} title={workspace?.aiPaused ? 'Resume AI?' : 'Pause AI?'}>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22, lineHeight: 1.55 }}>
            {workspace?.aiPaused
              ? 'AI will immediately resume responding to all leads. New conversations will be picked up within 60 seconds.'
              : 'AI will stop responding immediately. You will need to manually handle all incoming messages. This affects your entire workspace.'}
          </p>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <Button variant="ghost" size="sm" onClick={() => setPauseModal(false)}>Cancel</Button>
            <Button
              variant={workspace?.aiPaused ? 'primary' : 'destructive'}
              size="sm"
              loading={toggling}
              onClick={toggleAI}
            >
              {workspace?.aiPaused ? 'Resume' : 'Pause AI'}
            </Button>
          </div>
        </Modal>
      </div>
    </div>
  );
}

function SettingsCard({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="surface-card" style={{ padding: 22 }}>
      <div style={{ marginBottom: 18 }}>
        <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.005em' }}>{title}</h2>
        {description && (
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0', lineHeight: 1.55 }}>{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
