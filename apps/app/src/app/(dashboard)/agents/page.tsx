'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Button, Avatar, Modal, Input, EmptyState, Skeleton, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface Agent {
  id: string;
  userId: string;
  role: string;
  displayName?: string | null;
  isAvailable: boolean;
  totalLeadsAssigned: number;
  conversionRate: number;
  languages: string[];
  serviceAreas: string[];
  user?: { name?: string | null; email: string; } | null;
}

interface AgentPage { items: Agent[]; nextCursor: string | null; }

const ROLE_META: Record<string, { color: string; bg: string }> = {
  OWNER:  { color: 'var(--accent)', bg: 'rgba(232,255,71,0.12)' },
  ADMIN:  { color: 'var(--blue)',   bg: 'rgba(90,163,255,0.12)' },
  AGENT:  { color: 'var(--text-2)', bg: 'rgba(255,255,255,0.04)' },
  VIEWER: { color: 'var(--text-3)', bg: 'rgba(255,255,255,0.03)' },
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Team</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Agents
            <span style={{ color: 'var(--text-4)', fontFamily: "'JetBrains Mono', monospace", fontSize: 16, marginLeft: 8 }}>
              {agents.length}
            </span>
          </h1>
        </div>
        <button onClick={() => setInviteOpen(true)} className="btn-primary">
          <Icon name="plus" size={13} stroke={2.2} />
          Invite agent
        </button>
      </div>

      {isLoading ? (
        <div className="agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} variant="rect" height={180} />)}
        </div>
      ) : agents.length === 0 ? (
        <EmptyState
          illustration={<Icon name="agent" size={32} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
          title="No agents yet"
          description="Invite your first team member to get started."
          action={
            <button onClick={() => setInviteOpen(true)} className="btn-primary">
              <Icon name="plus" size={13} stroke={2.2} />
              Invite agent
            </button>
          }
        />
      ) : (
        <div className="agent-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          <AnimatePresence>
            {agents.map((agent, i) => {
              const roleMeta = ROLE_META[agent.role] ?? ROLE_META['AGENT']!;
              const name = agent.displayName ?? agent.user?.name ?? 'Agent';
              return (
                <motion.div
                  key={agent.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="surface-card"
                  style={{
                    padding: 20,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 16,
                    position: 'relative',
                    overflow: 'hidden',
                    transition: 'border-color 0.3s, transform 0.3s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = 'var(--border-light)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.transform = 'translateY(0)';
                  }}
                >
                  {/* Top */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0, flex: 1 }}>
                      <div style={{ position: 'relative' }}>
                        <Avatar name={name} size="lg" online={agent.isAvailable} />
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 150 }}>
                          {agent.user?.email}
                        </div>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: '3px 8px',
                        borderRadius: 100,
                        background: roleMeta.bg,
                        border: `1px solid ${roleMeta.color}33`,
                        color: roleMeta.color,
                        fontSize: 10,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        flexShrink: 0,
                      }}
                    >
                      {agent.role}
                    </span>
                  </div>

                  {/* Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--bg-3)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div className="eyebrow" style={{ color: 'var(--text-4)', marginBottom: 4 }}>Leads</div>
                      <div
                        className="serif"
                        style={{ fontSize: 22, lineHeight: 1, color: 'var(--text)', fontWeight: 400 }}
                      >
                        {agent.totalLeadsAssigned}
                      </div>
                    </div>
                    <div
                      style={{
                        padding: '10px 12px',
                        borderRadius: 10,
                        background: 'var(--bg-3)',
                        border: '1px solid rgba(77,255,165,0.18)',
                      }}
                    >
                      <div className="eyebrow" style={{ color: 'var(--text-4)', marginBottom: 4 }}>Conv. rate</div>
                      <div
                        className="serif"
                        style={{ fontSize: 22, lineHeight: 1, color: 'var(--green)', fontWeight: 400, textShadow: '0 0 12px rgba(77,255,165,0.20)' }}
                      >
                        {(agent.conversionRate * 100).toFixed(0)}%
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      paddingTop: 12,
                      borderTop: '1px solid var(--border)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--text-3)' }}>
                      <span
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: '50%',
                          background: agent.isAvailable ? 'var(--green)' : 'var(--text-5)',
                          boxShadow: agent.isAvailable ? '0 0 6px var(--green)' : 'none',
                        }}
                      />
                      {agent.isAvailable ? 'Available' : 'Offline'}
                    </div>
                    <button
                      onClick={() => setRemoveId(agent.id)}
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 7,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-4)',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,92,92,0.08)'; e.currentTarget.style.color = 'var(--red)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-4)'; }}
                    >
                      <Icon name="trash" size={12} stroke={1.6} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Invite modal */}
      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite agent">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
          <Input
            label="Email"
            type="email"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            placeholder="agent@brokerage.com"
            autoFocus
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Role</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
              {(['AGENT', 'ADMIN', 'VIEWER'] as const).map(r => {
                const meta = ROLE_META[r]!;
                const active = inviteRole === r;
                return (
                  <button
                    key={r}
                    onClick={() => setInviteRole(r)}
                    style={{
                      padding: 12,
                      borderRadius: 10,
                      background: active ? meta.bg : 'var(--bg-3)',
                      border: '1px solid',
                      borderColor: active ? meta.color : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'center',
                    }}
                  >
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: active ? meta.color : 'var(--text-2)',
                        fontFamily: "'JetBrains Mono', monospace",
                        letterSpacing: '0.04em',
                      }}
                    >
                      {r}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => setInviteOpen(false)}>Cancel</Button>
          <Button size="sm" loading={inviting} onClick={handleInvite}>
            Send invite
          </Button>
        </div>
      </Modal>

      {/* Remove confirmation */}
      <Modal open={!!removeId} onClose={() => setRemoveId(null)} title="Remove agent?">
        <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 22, lineHeight: 1.55 }}>
          This agent will lose access to ConversionOps immediately. Their assigned leads will be unassigned and routed back to the queue.
        </p>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => setRemoveId(null)}>Cancel</Button>
          <Button variant="destructive" size="sm" loading={removing} onClick={() => removeId && void handleRemove(removeId)}>
            Remove
          </Button>
        </div>
      </Modal>

      <style>{`
        @media (max-width: 960px) { .agent-grid { grid-template-columns: repeat(2, 1fr) !important; } }
        @media (max-width: 560px) { .agent-grid { grid-template-columns: 1fr !important; } }
      `}</style>
    </div>
  );
}
