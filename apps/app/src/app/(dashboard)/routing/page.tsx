'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, GripVertical } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button, Badge, Modal, Input, PageHeader, EmptyState, Skeleton, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

interface RoutingRule {
  id: string; name: string; strategy: string; priority: number;
  isActive: boolean; description?: string | null;
}

const STRATEGY_VARIANT: Record<string, 'accent' | 'info' | 'success' | 'neutral'> = {
  LANGUAGE: 'accent', GEOGRAPHY: 'info', AVAILABILITY: 'success',
  PERFORMANCE_BASED: 'accent', ROUND_ROBIN: 'neutral', CUSTOM: 'neutral',
};

export default function RoutingPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [strategy, setStrategy] = useState('ROUND_ROBIN');
  const [creating, setCreating] = useState(false);

  const { data: rules, isLoading } = useQuery<RoutingRule[]>({
    queryKey: ['routing-rules'],
    queryFn: () => apiClient.get<{ items?: RoutingRule[] }>('/routing-rules').then(r => (r as RoutingRule[]) ?? []),
  });

  const handleCreate = async () => {
    if (!ruleName.trim()) return;
    setCreating(true);
    try {
      await apiClient.post('/routing-rules', { name: ruleName, strategy });
      await queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      addToast('Routing rule created', 'success');
      setCreateOpen(false); setRuleName(''); setStrategy('ROUND_ROBIN');
    } catch { addToast('Failed to create rule', 'error'); }
    finally { setCreating(false); }
  };

  const toggleActive = async (rule: RoutingRule) => {
    try {
      await apiClient.patch(`/routing-rules/${rule.id}`, { isActive: !rule.isActive });
      await queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
    } catch { addToast('Failed to update rule', 'error'); }
  };

  const deleteRule = async (id: string) => {
    try {
      await apiClient.delete(`/routing-rules/${id}`);
      await queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      addToast('Rule deleted', 'info');
    } catch { addToast('Failed to delete', 'error'); }
  };

  const sortedRules = [...(rules ?? [])].sort((a, b) => b.priority - a.priority);

  return (
    <div>
      <PageHeader title="Routing Rules" subtitle="Control how leads are assigned to agents"
        action={<Button size="sm" onClick={() => setCreateOpen(true)}><Plus size={14} />Create rule</Button>} />
      {isLoading
        ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rect" height={64} className="mb-3" />)
        : sortedRules.length === 0
          ? <EmptyState title="No routing rules" description="Create your first rule to control how leads are assigned." action={<Button onClick={() => setCreateOpen(true)}>Create rule</Button>} />
          : (
            <div className="rounded-[10px] border overflow-hidden" style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
              {sortedRules.map((rule, i) => (
                <motion.div key={rule.id} layout
                  className="flex items-center gap-4 px-5 py-4 border-b"
                  style={{ borderColor: 'var(--border)', background: i % 2 === 0 ? 'transparent' : 'var(--bg-3)' }}>
                  <GripVertical size={14} style={{ color: 'var(--text-4)', cursor: 'grab' }} />
                  <Badge variant="neutral" size="sm" className="font-mono">{String(rule.priority).padStart(2, '0')}</Badge>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{rule.name}</p>
                    {rule.description && <p className="text-xs truncate" style={{ color: 'var(--text-3)' }}>{rule.description}</p>}
                  </div>
                  <Badge variant={STRATEGY_VARIANT[rule.strategy] ?? 'neutral'} size="sm">
                    {rule.strategy.replace('_', ' ')}
                  </Badge>
                  <button
                    onClick={() => void toggleActive(rule)}
                    className="w-8 h-4 rounded-full relative transition-colors"
                    style={{ background: rule.isActive ? 'var(--accent)' : 'var(--bg-4)' }}>
                    <span className="absolute top-0.5 w-3 h-3 rounded-full bg-[var(--bg-2)] transition-all"
                      style={{ left: rule.isActive ? '18px' : '2px' }} />
                  </button>
                  <button onClick={() => void deleteRule(rule.id)} className="text-xs hover:underline" style={{ color: 'var(--red)' }}>Delete</button>
                </motion.div>
              ))}
            </div>
          )}
      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create routing rule">
        <div className="flex flex-col gap-4 mb-6">
          <Input label="Rule Name" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g. Spanish-speaking leads" autoFocus />
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] uppercase tracking-widest font-medium" style={{ color: 'var(--text-3)' }}>Strategy</label>
            <select value={strategy} onChange={e => setStrategy(e.target.value)} className="h-9 px-3 text-sm rounded-lg" style={{ background: 'var(--bg-3)', border: '1px solid var(--border)', color: 'var(--text)' }}>
              {['LANGUAGE','GEOGRAPHY','AVAILABILITY','PERFORMANCE_BASED','ROUND_ROBIN'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button size="sm" loading={creating} onClick={handleCreate}>Create rule</Button>
        </div>
      </Modal>
    </div>
  );
}
