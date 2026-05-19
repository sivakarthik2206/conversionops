'use client';
import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Card, PageHeader, Modal, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

const TIMEZONES = ['America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Phoenix','America/Anchorage','Pacific/Honolulu'];

interface Workspace { name: string; timezone: string; twilioNumber: string | null; aiPaused: boolean; }

export default function WorkspaceSettingsPage() {
  const { addToast } = useToast();
  const { data: workspace, refetch } = useQuery<Workspace>({ queryKey: ['workspace'], queryFn: () => apiClient.get('/workspaces/me') });
  const [name, setName] = useState('');
  const [timezone, setTimezone] = useState('America/New_York');
  const [saving, setSaving] = useState(false);
  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [toggling, setToggling] = useState(false);

  useEffect(() => {
    if (workspace) { setName(workspace.name); setTimezone(workspace.timezone); }
  }, [workspace]);

  const save = async () => {
    setSaving(true);
    try { await apiClient.patch('/workspaces/me', { name, timezone }); addToast('Settings saved', 'success'); await refetch(); }
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
    finally { setToggling(false); setPauseModalOpen(false); }
  };

  return (
    <div className="max-w-[640px]">
      <PageHeader title="Workspace Settings" />
      <div className="flex flex-col gap-6">
        <Card>
          <div className="flex flex-col gap-4">
            <Input label="Workspace Name" value={name} onChange={e => setName(e.target.value)} />
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>Timezone</label>
              <select value={timezone} onChange={e => setTimezone(e.target.value)}
                className="h-9 px-3 text-sm rounded-lg focus:outline-none focus:ring-1"
                style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>
            {workspace?.twilioNumber && (
              <div>
                <p className="text-[11px] uppercase tracking-widest font-medium mb-1.5" style={{ color: 'var(--text-3)' }}>Twilio Number</p>
                <p className="text-sm font-mono px-3 py-2 rounded-lg" style={{ background: 'var(--bg-3)', color: 'var(--text)' }}>{workspace.twilioNumber}</p>
              </div>
            )}
          </div>
        </Card>
        <Button loading={saving} onClick={save} className="self-start">Save Changes</Button>

        {/* Danger zone */}
        <div className="rounded-[10px] border p-5" style={{ borderColor: 'var(--red-dim)', background: 'rgba(255,71,71,0.03)' }}>
          <h3 className="text-sm font-semibold mb-1" style={{ color: 'var(--red)' }}>AI Control</h3>
          <p className="text-xs mb-4" style={{ color: 'var(--text-2)' }}>
            {workspace?.aiPaused ? 'AI is currently paused. All new messages require manual response.' : 'AI is active and responding to all incoming leads.'}
          </p>
          <Button variant={workspace?.aiPaused ? 'secondary' : 'destructive'} size="sm" onClick={() => setPauseModalOpen(true)}>
            {workspace?.aiPaused ? 'Resume AI' : 'Pause AI'}
          </Button>
        </div>
      </div>

      <Modal open={pauseModalOpen} onClose={() => setPauseModalOpen(false)} title={workspace?.aiPaused ? 'Resume AI?' : 'Pause AI?'}>
        <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>
          {workspace?.aiPaused ? 'AI will resume responding to all leads immediately.' : 'AI will stop responding. You will need to manually handle all incoming messages.'}
        </p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setPauseModalOpen(false)}>Cancel</Button>
          <Button variant={workspace?.aiPaused ? 'primary' : 'destructive'} size="sm" loading={toggling} onClick={toggleAI}>
            {workspace?.aiPaused ? 'Resume' : 'Pause AI'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
