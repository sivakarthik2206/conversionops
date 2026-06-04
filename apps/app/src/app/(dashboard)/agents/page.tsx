'use client';
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface Member {
  id: string;
  workspaceId: string;
  userId: string;
  role: 'OWNER' | 'ADMIN' | 'AGENT' | 'VIEWER';
  isActive: boolean;
  displayName?: string | null;
  createdAt: string;
  user: { id: string; email: string; name?: string | null };
}

interface WorkspaceCtx { id: string; name: string; plan: string; status: string; }

const ROLE_COLORS: Record<string, { color: string; bg: string; border: string }> = {
  OWNER:  { color: 'var(--purple)',  bg: 'rgba(179,155,255,0.10)', border: 'rgba(179,155,255,0.25)' },
  ADMIN:  { color: 'var(--blue)',    bg: 'rgba(71,150,255,0.10)',  border: 'rgba(71,150,255,0.25)' },
  AGENT:  { color: 'var(--green)',   bg: 'rgba(77,255,165,0.10)',  border: 'rgba(77,255,165,0.25)' },
  VIEWER: { color: 'var(--text-3)',  bg: 'rgba(161,161,170,0.08)', border: 'rgba(161,161,170,0.20)' },
};
const AVATAR_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6'];
const avatarColor = (email: string) => AVATAR_COLORS[email.charCodeAt(0) % AVATAR_COLORS.length] ?? AVATAR_COLORS[0];
const initials = (m: Member) => {
  const n = m.displayName ?? m.user.name;
  if (n) return n.split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2);
  return m.user.email.slice(0, 2).toUpperCase();
};
const timeAgo = (iso: string) => {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days < 1) return 'Today';
  if (days === 1) return '1 day ago';
  if (days < 30) return `${days} days ago`;
  return `${Math.floor(days / 30)} months ago`;
};
const ROLE_OPTIONS = [
  { value: 'ADMIN'  as const, label: 'Admin',  desc: 'Can manage leads, conversations, and team settings' },
  { value: 'AGENT'  as const, label: 'Agent',  desc: 'Can view and respond to assigned leads and conversations' },
  { value: 'VIEWER' as const, label: 'Viewer', desc: 'Read-only access to dashboard and analytics' },
];

export default function AgentsPage() {
  const qc = useQueryClient();
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'AGENT' | 'VIEWER'>('AGENT');
  const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [inviteMsg, setInviteMsg] = useState('');
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [changeRoleFor, setChangeRoleFor] = useState<Member | null>(null);
  const [newRole, setNewRole] = useState<'ADMIN' | 'AGENT' | 'VIEWER'>('AGENT');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);

  const { data: members, isLoading } = useQuery<Member[]>({
    queryKey: ['agents'],
    queryFn: () => apiClient.get<Member[]>('/agents'),
  });

  const { data: workspace } = useQuery<WorkspaceCtx>({
    queryKey: ['workspace-context'],
    queryFn: () => apiClient.get('/workspaces/me'),
    staleTime: 60_000,
  });

  const invite = useMutation({
    mutationFn: (body: { email: string; role: string }) => apiClient.post('/agents/invite', body),
    onSuccess: () => {
      setInviteStatus('success');
      setInviteMsg(`Invite sent to ${inviteEmail}`);
      void qc.invalidateQueries({ queryKey: ['agents'] });
      setTimeout(() => { setShowInvite(false); setInviteEmail(''); setInviteRole('AGENT'); setInviteStatus('idle'); setInviteMsg(''); }, 2000);
    },
    onError: () => { setInviteStatus('error'); setInviteMsg('Failed to send invite. Please try again.'); },
  });

  const updateMember = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => apiClient.patch(`/agents/${id}`, { role }),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agents'] }); setChangeRoleFor(null); },
  });

  const removeMember = useMutation({
    mutationFn: (id: string) => apiClient.delete(`/agents/${id}`),
    onSuccess: () => { void qc.invalidateQueries({ queryKey: ['agents'] }); setConfirmRemove(null); },
  });

  const isFreePlan = workspace && (workspace.plan === 'FREE' || workspace.status === 'TRIAL' || workspace.status === 'ONBOARDING');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {isFreePlan && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(232,255,71,0.06)', border: '1px solid rgba(232,255,71,0.20)', borderRadius: 10, marginBottom: 20 }}>
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>You&apos;re on the free plan. Upgrade to add more than 1 team member.</span>
          <a href="/settings/billing" style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 600, textDecoration: 'none', padding: '6px 14px', background: 'rgba(232,255,71,0.10)', borderRadius: 7, border: '1px solid rgba(232,255,71,0.25)' }}>Upgrade now</a>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 className="serif" style={{ fontSize: 28, fontWeight: 400, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Team members</h2>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>{members?.length ?? 0} member{(members?.length ?? 0) !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowInvite(true)} style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 16px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Icon name="plus" size={14} stroke={2.5} />
          Invite member
        </button>
      </div>

      <div className="surface-card" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 48px', padding: '10px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-3)' }}>
          {['Member', 'Role', 'Status', 'Joined', ''].map(h => (
            <span key={h} style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-4)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>

        {isLoading ? Array.from({ length: 3 }).map((_, i) => (
          <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 48px', padding: '16px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div style={{ width: 120, height: 13, borderRadius: 4, background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ width: 160, height: 11, borderRadius: 4, background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />
              </div>
            </div>
            {[80, 60, 80].map((w, j) => <div key={j} style={{ width: w, height: 22, borderRadius: 4, background: 'var(--bg-3)', animation: 'pulse 1.5s ease-in-out infinite' }} />)}
          </div>
        )) : (members ?? []).map((m, i) => {
          const rs = ROLE_COLORS[m.role] ?? ROLE_COLORS['VIEWER']!;
          const isRemoving = confirmRemove === m.id;
          return (
            <motion.div key={m.id} layout initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ delay: i * 0.04 }}
              style={{ display: 'grid', gridTemplateColumns: '1fr 120px 100px 120px 48px', padding: '14px 20px', borderBottom: '1px solid var(--border)', alignItems: 'center', background: isRemoving ? 'rgba(255,92,92,0.04)' : undefined }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: avatarColor(m.user.email), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{initials(m)}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{m.displayName ?? m.user.name ?? m.user.email.split('@')[0]}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.user.email}</div>
                </div>
              </div>
              <span style={{ display: 'inline-flex', alignItems: 'center', padding: '3px 8px', borderRadius: 6, background: rs.bg, border: `1px solid ${rs.border}`, fontSize: 11, fontWeight: 600, color: rs.color, letterSpacing: '0.04em', width: 'fit-content' }}>{m.role}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: m.isActive ? 'var(--green)' : 'var(--red)', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.isActive ? 'Active' : 'Suspended'}</span>
              </div>
              <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{timeAgo(m.createdAt)}</span>
              {isRemoving ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, gridColumn: '1 / -1', paddingTop: 10, borderTop: '1px solid rgba(255,92,92,0.15)', marginTop: 10 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1 }}>Remove <strong>{m.user.email}</strong>? They lose all access immediately.</span>
                  <button onClick={() => removeMember.mutate(m.id)} style={{ padding: '6px 14px', borderRadius: 7, background: 'var(--red)', color: '#fff', border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Yes, remove</button>
                  <button onClick={() => setConfirmRemove(null)} style={{ padding: '6px 14px', borderRadius: 7, background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                </div>
              ) : m.role !== 'OWNER' ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)} style={{ width: 32, height: 32, borderRadius: 7, background: 'transparent', border: '1px solid transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-4)' }}>
                    <Icon name="more-horizontal" size={14} stroke={2} />
                  </button>
                  {menuOpen === m.id && (
                    <>
                      <div style={{ position: 'fixed', inset: 0, zIndex: 50 }} onClick={() => setMenuOpen(null)} />
                      <div style={{ position: 'absolute', right: 0, top: 36, width: 160, background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 10, boxShadow: 'var(--shadow-lg)', padding: 6, zIndex: 60 }}>
                        {[
                          { label: 'Change role', icon: 'user', action: () => { setChangeRoleFor(m); setNewRole(m.role !== 'OWNER' ? m.role : 'ADMIN'); setMenuOpen(null); }, danger: false },
                          { label: 'Remove member', icon: 'trash', action: () => { setConfirmRemove(m.id); setMenuOpen(null); }, danger: true },
                        ].map(item => (
                          <button key={item.label} onClick={item.action} style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 7, background: 'transparent', border: 'none', fontSize: 13, color: item.danger ? 'var(--red)' : 'var(--text-2)', cursor: 'pointer' }}>
                            <Icon name={item.icon as never} size={13} stroke={1.6} />
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : <div />}
            </motion.div>
          );
        })}
      </div>

      {/* Invite Modal */}
      <AnimatePresence>
        {showInvite && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowInvite(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 440, background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 28, zIndex: 101, boxShadow: 'var(--shadow-xl)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h3 style={{ fontSize: 18, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Invite team member</h3>
                <button onClick={() => setShowInvite(false)} style={{ background: 'none', border: 'none', color: 'var(--text-4)', cursor: 'pointer', display: 'flex', padding: 4 }}><Icon name="x" size={16} stroke={2} /></button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Email address</label>
                  <input type="email" value={inviteEmail} onChange={e => { setInviteEmail(e.target.value); setInviteStatus('idle'); }} placeholder="colleague@brokerage.com" style={{ width: '100%', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '11px 14px', color: 'var(--text)', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)', display: 'block', marginBottom: 10 }}>Role</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {ROLE_OPTIONS.map(r => (
                      <label key={r.value} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 12px', borderRadius: 9, border: `1px solid ${inviteRole === r.value ? 'rgba(232,255,71,0.35)' : 'var(--border)'}`, background: inviteRole === r.value ? 'rgba(232,255,71,0.05)' : 'transparent', cursor: 'pointer' }}>
                        <input type="radio" name="role" value={r.value} checked={inviteRole === r.value} onChange={() => setInviteRole(r.value)} style={{ marginTop: 2, accentColor: 'var(--accent)' }} />
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{r.label}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-3)', lineHeight: 1.4 }}>{r.desc}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                {inviteStatus !== 'idle' && <p style={{ fontSize: 13, color: inviteStatus === 'success' ? 'var(--green)' : 'var(--red)', margin: 0 }}>{inviteMsg}</p>}
                <button onClick={() => { if (inviteEmail.includes('@')) invite.mutate({ email: inviteEmail, role: inviteRole }); }} disabled={invite.isPending || !inviteEmail.includes('@')} style={{ width: '100%', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 9, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  {invite.isPending ? 'Sending...' : 'Send invite →'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Change Role Modal */}
      <AnimatePresence>
        {changeRoleFor && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setChangeRoleFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 100 }} />
            <motion.div initial={{ opacity: 0, scale: 0.96, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }} style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: 380, background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 16, padding: 24, zIndex: 101, boxShadow: 'var(--shadow-xl)' }}>
              <h3 style={{ fontSize: 17, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Change role</h3>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '0 0 18px' }}>Changing role for <strong style={{ color: 'var(--text)' }}>{changeRoleFor.user.email}</strong></p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 18 }}>
                {ROLE_OPTIONS.map(r => (
                  <label key={r.value} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderRadius: 8, border: `1px solid ${newRole === r.value ? 'rgba(232,255,71,0.35)' : 'var(--border)'}`, background: newRole === r.value ? 'rgba(232,255,71,0.05)' : 'transparent', cursor: 'pointer' }}>
                    <input type="radio" name="newrole" value={r.value} checked={newRole === r.value} onChange={() => setNewRole(r.value)} style={{ accentColor: 'var(--accent)' }} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{r.label}</span>
                  </label>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => updateMember.mutate({ id: changeRoleFor.id, role: newRole })} disabled={updateMember.isPending} style={{ flex: 1, padding: '10px', background: 'var(--accent)', color: '#000', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                  {updateMember.isPending ? 'Saving...' : 'Confirm change'}
                </button>
                <button onClick={() => setChangeRoleFor(null)} style={{ padding: '10px 16px', background: 'var(--bg-3)', color: 'var(--text-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
