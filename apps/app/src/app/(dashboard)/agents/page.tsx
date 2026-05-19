'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Trash2, Mail, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Badge, Avatar, Modal, Input, PageHeader, EmptyState, Skeleton, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

interface Agent {
  id: string; userId: string; role: string; displayName?: string | null;
  isAvailable: boolean; totalLeadsAssigned: number; conversionRate: number;
  languages: string[]; serviceAreas: string[];
  user?: { name?: string | null; email: string; } | null;
}

interface AgentPage { items: Agent[]; nextCursor: string | null; }

const ROLE_VARIANT: Record<string, 'accent' | 'info' | 'neutral'> = {
  OWNER: 'accent', ADMIN: 'info', AGENT: 'neutral', VIEWER: 'neutral',
};

export default function AgentsPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('AGENT');
  const [inviting, setInviting] = useState(false);
  const [removeId, setRemoveId] = useState<string | null>(null);
  const [removing, setRemoving] = useState(false);

  const { data, isLoading } = useQuery<AgentPage>({ queryKey: ['agents'], queryFn: () => apiClient.get('/agents') });
  const agents = data?.items ?? [];

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      await apiClient.post('/agents/invite', { email: inviteEmail, role: inviteRole });
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast(`Invitation sent to ${inviteEmail}`, 'success');
      setInviteOpen(false); setInviteEmail('');
    } catch { addToast('Failed to send invitation', 'error'); }
    finally { setInviting(false); }
  };

  const handleRemove = async (id: string) => {
    setRemoving(true);
    try {
      await apiClient.delete(`/agents/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['agents'] });
      addToast('Agent removed', 'info');
      setRemoveId(null);
    } catch { addToast('Failed to remove agent', 'error'); }
    finally { setRemoving(false); }
  };

  return (
    <div>
      <PageHeader title="Agents" subtitle={`${agents.length} team members`}
        action={<Button size="sm" onClick={() => setInviteOpen(true)}><UserPlus size={14} />Invite agent</Button>} />
      {isLoading
        ? <div className="grid grid-cols-3 gap-4">{Array.from({length:6}).map((_,i)=><Skeleton key={i} variant="rect" height={160} />)}</div>
        : agents.length === 0
          ? <EmptyState title="No agents yet" description="Invite your first team member to get started." action={<Button onClick={() => setInviteOpen(true)}>Invite agent</Button>} />
          : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <AnimatePresence>
                {agents.map((agent, i) => (
                  <motion.div key={agent.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                    className="rounded-[10px] border p-5 flex flex-col gap-4" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <Avatar name={agent.displayName ?? agent.user?.name ?? agent.user?.email} size="lg" online={agent.isAvailable} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{agent.displayName ?? agent.user?.name ?? 'Agent'}</p>
                          <p className="text-xs truncate max-w-[150px]" style={{ color: 'var(--text-3)' }}>{agent.user?.email}</p>
                        </div>
                      </div>
                      <Badge variant={ROLE_VARIANT[agent.role] ?? 'neutral'} size="sm">{agent.role}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-3)' }}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Leads</p>
                        <p className="text-lg font-display" style={{ color: 'var(--text)' }}>{agent.totalLeadsAssigned}</p>
                      </div>
                      <div className="rounded-lg px-3 py-2" style={{ background: 'var(--bg-3)' }}>
                        <p className="text-[10px] uppercase tracking-wide mb-1" style={{ color: 'var(--text-3)' }}>Conv. Rate</p>
                        <p className="text-lg font-display" style={{ color: 'var(--green)' }}>{(agent.conversionRate * 100).toFixed(0)}%</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between pt-1" style={{ borderTop: '1px solid var(--border)' }}>
                      <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full" style={{ background: agent.isAvailable ? 'var(--green)' : 'var(--text-4)' }} />
                        <span className="text-xs" style={{ color: 'var(--text-3)' }}>{agent.isAvailable ? 'Available' : 'Unavailable'}</span>
                      </div>
                      <button onClick={() => setRemoveId(agent.id)} className="p-1 rounded hover:bg-[var(--red-dim)] transition-colors" style={{ color: 'var(--text-4)' }}>
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite agent">
        <div className="flex flex-col gap-4 mb-6">
          <Input label="Email" type="email" value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} placeholder="agent@brokerage.com" autoFocus />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>Role</label>
            <select value={inviteRole} onChange={e => setInviteRole(e.target.value)} className="h-9 px-3 text-sm rounded-lg" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              <option value="AGENT">Agent</option>
              <option value="ADMIN">Admin</option>
              <option value="VIEWER">Viewer</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button size="sm" loading={inviting} onClick={handleInvite}><Mail size={13} />Send invitation</Button>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal open={!!removeId} onClose={() => setRemoveId(null)} title="Remove agent?">
        <p className="text-sm mb-6" style={{ color: 'var(--text-2)' }}>This agent will lose access to ConversionOps. Their assigned leads will be unassigned.</p>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setRemoveId(null)}>Cancel</Button>
          <Button variant="destructive" size="sm" loading={removing} onClick={() => removeId && void handleRemove(removeId)}>Remove</Button>
        </div>
      </Modal>
    </div>
  );
}
