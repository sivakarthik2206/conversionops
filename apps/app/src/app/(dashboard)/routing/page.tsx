'use client';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Button, Modal, Input, EmptyState, Skeleton, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';

interface RoutingRule {
  id: string;
  name: string;
  strategy: string;
  priority: number;
  isActive: boolean;
  description?: string | null;
  conditions?: Record<string, unknown> | null;
}

const STRATEGY_META: Record<string, { color: string; icon: Parameters<typeof Icon>[0]['name'] }> = {
  LANGUAGE:          { color: 'var(--accent)', icon: 'message' },
  GEOGRAPHY:         { color: 'var(--blue)',   icon: 'globe' },
  AVAILABILITY:      { color: 'var(--green)',  icon: 'clock' },
  PERFORMANCE_BASED: { color: 'var(--purple)', icon: 'star' },
  ROUND_ROBIN:       { color: 'var(--amber)',  icon: 'reload' },
  CUSTOM:            { color: 'var(--text-3)', icon: 'sliders' },
};

/** Human-readable summary of a rule's match conditions. */
function conditionSummary(conditions?: Record<string, unknown> | null): string | null {
  if (!conditions) return null;
  const parts: string[] = [];
  if (typeof conditions['language'] === 'string') parts.push(`lang=${conditions['language']}`);
  if (typeof conditions['area'] === 'string') parts.push(`area~${conditions['area']}`);
  if (typeof conditions['minScore'] === 'number') parts.push(`score≥${conditions['minScore']}`);
  if (typeof conditions['maxScore'] === 'number') parts.push(`score≤${conditions['maxScore']}`);
  return parts.length ? parts.join(' · ') : null;
}

export default function RoutingPage() {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [strategy, setStrategy] = useState('ROUND_ROBIN');
  const [creating, setCreating] = useState(false);
  const [minScore, setMinScore] = useState('');
  const [maxScore, setMaxScore] = useState('');
  const [language, setLanguage] = useState('');
  const [area, setArea] = useState('');
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const { data: rules, isLoading } = useQuery<RoutingRule[]>({
    queryKey: ['routing-rules'],
    queryFn: () => apiClient.get<{ items?: RoutingRule[] }>('/routing-rules').then(r => (r as RoutingRule[]) ?? []),
  });

  const buildConditions = (): Record<string, unknown> => {
    const c: Record<string, unknown> = {};
    if (minScore.trim() && !Number.isNaN(Number(minScore))) c['minScore'] = Number(minScore);
    if (maxScore.trim() && !Number.isNaN(Number(maxScore))) c['maxScore'] = Number(maxScore);
    if (language.trim()) c['language'] = language.trim();
    if (area.trim()) c['area'] = area.trim();
    return c;
  };

  const resetForm = () => {
    setRuleName(''); setStrategy('ROUND_ROBIN');
    setMinScore(''); setMaxScore(''); setLanguage(''); setArea('');
  };

  const handleCreate = async () => {
    if (!ruleName.trim()) return;
    setCreating(true);
    try {
      const conditions = buildConditions();
      const nextPriority = (rules?.length ?? 0) + 1;
      await apiClient.post('/routing-rules', {
        name: ruleName,
        strategy,
        priority: nextPriority,
        ...(Object.keys(conditions).length ? { conditions } : {}),
      });
      await queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
      addToast('Routing rule created', 'success');
      setCreateOpen(false); resetForm();
    } catch { addToast('Failed to create rule', 'error'); }
    finally { setCreating(false); }
  };

  // Reorder by reassigning distinct descending priorities so order is deterministic
  // regardless of starting values. Used by both drag-and-drop and the up/down controls.
  const reorder = async (from: number, to: number) => {
    if (from === to) return;
    const arr = [...sortedRules];
    const moved = arr.splice(from, 1)[0];
    if (!moved) return;
    arr.splice(to, 0, moved);
    const updates = arr.map((r, i) => ({ id: r.id, priority: arr.length - i }));
    try {
      await Promise.all(updates.map(u => apiClient.patch(`/routing-rules/${u.id}`, { priority: u.priority })));
      await queryClient.invalidateQueries({ queryKey: ['routing-rules'] });
    } catch { addToast('Failed to reorder rules', 'error'); }
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
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Operations</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Routing rules
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '6px 0 0' }}>
            Control how leads flow to agents. Rules run top to bottom by priority.
          </p>
        </div>
        <button onClick={() => setCreateOpen(true)} className="btn-primary">
          <Icon name="plus" size={13} stroke={2.2} />
          Create rule
        </button>
      </div>

      {isLoading ? (
        Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} variant="rect" height={72} style={{ marginBottom: 10 }} />)
      ) : sortedRules.length === 0 ? (
        <EmptyState
          illustration={<Icon name="route" size={32} stroke={1.5} style={{ color: 'var(--text-4)' }} />}
          title="No routing rules"
          description="Create your first rule to control how leads are assigned to agents."
          action={
            <button onClick={() => setCreateOpen(true)} className="btn-primary">
              <Icon name="plus" size={13} stroke={2.2} />
              Create rule
            </button>
          }
        />
      ) : (
        <div className="surface-card" style={{ overflow: 'hidden' }}>
          {sortedRules.map((rule, i) => {
            const meta = STRATEGY_META[rule.strategy] ?? STRATEGY_META['CUSTOM']!;
            return (
              <motion.div
                key={rule.id}
                layout
                draggable
                onDragStart={() => setDragIndex(i)}
                onDragOver={e => { e.preventDefault(); if (overIndex !== i) setOverIndex(i); }}
                onDrop={e => {
                  e.preventDefault();
                  if (dragIndex !== null && dragIndex !== i) void reorder(dragIndex, i);
                  setDragIndex(null); setOverIndex(null);
                }}
                onDragEnd={() => { setDragIndex(null); setOverIndex(null); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  padding: '16px 20px',
                  borderTop: i === 0 ? 'none' : '1px solid var(--border)',
                  transition: 'background 0.2s',
                  background: overIndex === i && dragIndex !== null && dragIndex !== i ? 'rgba(232,255,71,0.05)' : 'transparent',
                  borderTopColor: overIndex === i && dragIndex !== null && dragIndex !== i ? 'var(--accent)' : undefined,
                  opacity: dragIndex === i ? 0.4 : 1,
                }}
              >
                <Icon name="grip" size={14} style={{ color: 'var(--text-5)', cursor: 'grab', flexShrink: 0 }} />

                {/* Priority */}
                <div
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    background: 'var(--bg-3)',
                    border: '1px solid var(--border)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 11,
                    fontWeight: 600,
                    color: 'var(--text-3)',
                    flexShrink: 0,
                  }}
                >
                  {String(rule.priority).padStart(2, '0')}
                </div>

                {/* Strategy icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: `${meta.color}14`,
                    border: `1px solid ${meta.color}33`,
                    color: meta.color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Icon name={meta.icon} size={14} stroke={1.8} />
                </div>

                {/* Body */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 2 }}>{rule.name}</div>
                  <div
                    style={{
                      fontSize: 11,
                      color: meta.color,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.04em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {rule.strategy.replace(/_/g, ' ')}
                  </div>
                  {conditionSummary(rule.conditions) && (
                    <div style={{ fontSize: 10.5, color: 'var(--text-3)', marginTop: 4, fontFamily: "'JetBrains Mono', monospace", display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon name="sliders" size={10} stroke={1.8} style={{ color: 'var(--text-4)' }} />
                      {conditionSummary(rule.conditions)}
                    </div>
                  )}
                  {rule.description && (
                    <div style={{ fontSize: 11, color: 'var(--text-4)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {rule.description}
                    </div>
                  )}
                </div>

                {/* Reorder up/down */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flexShrink: 0 }}>
                  <button
                    onClick={() => void reorder(i, i - 1)}
                    disabled={i === 0}
                    aria-label="Increase priority"
                    style={{ width: 22, height: 16, borderRadius: 5, border: 'none', background: 'transparent', color: i === 0 ? 'var(--text-5)' : 'var(--text-3)', cursor: i === 0 ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <Icon name="chevron-up" size={12} stroke={2} />
                  </button>
                  <button
                    onClick={() => void reorder(i, i + 1)}
                    disabled={i === sortedRules.length - 1}
                    aria-label="Decrease priority"
                    style={{ width: 22, height: 16, borderRadius: 5, border: 'none', background: 'transparent', color: i === sortedRules.length - 1 ? 'var(--text-5)' : 'var(--text-3)', cursor: i === sortedRules.length - 1 ? 'default' : 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}
                  >
                    <Icon name="chevron-down" size={12} stroke={2} />
                  </button>
                </div>

                {/* Toggle */}
                <button
                  onClick={() => void toggleActive(rule)}
                  aria-label={rule.isActive ? 'Pause rule' : 'Activate rule'}
                  style={{
                    width: 36,
                    height: 20,
                    borderRadius: 100,
                    border: 'none',
                    background: rule.isActive ? 'var(--accent)' : 'var(--bg-4)',
                    boxShadow: rule.isActive ? '0 0 12px rgba(232,255,71,0.35)' : 'none',
                    cursor: 'pointer',
                    position: 'relative',
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      width: 16,
                      height: 16,
                      borderRadius: '50%',
                      background: rule.isActive ? '#0a0a0b' : 'var(--text-3)',
                      transition: 'left 0.25s var(--ease-out-quart)',
                      left: rule.isActive ? 18 : 2,
                    }}
                  />
                </button>

                {/* Delete */}
                <button
                  onClick={() => void deleteRule(rule.id)}
                  aria-label="Delete rule"
                  style={{
                    width: 28,
                    height: 28,
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
                  <Icon name="trash" size={13} stroke={1.6} />
                </button>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Create routing rule">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 22 }}>
          <Input label="Rule name" value={ruleName} onChange={e => setRuleName(e.target.value)} placeholder="e.g. Spanish-speaking leads" autoFocus />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Strategy</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {(['LANGUAGE','GEOGRAPHY','AVAILABILITY','PERFORMANCE_BASED','ROUND_ROBIN','CUSTOM'] as const).map(s => {
                const meta = STRATEGY_META[s]!;
                const active = strategy === s;
                return (
                  <button
                    key={s}
                    onClick={() => setStrategy(s)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '10px 12px',
                      borderRadius: 10,
                      background: active ? `${meta.color}14` : 'var(--bg-3)',
                      border: '1px solid',
                      borderColor: active ? meta.color : 'var(--border)',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      textAlign: 'left',
                    }}
                  >
                    <Icon name={meta.icon} size={13} stroke={1.8} style={{ color: active ? meta.color : 'var(--text-3)' }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: active ? meta.color : 'var(--text-2)' }}>
                      {s.replace(/_/g, ' ')}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Condition builder */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <label className="eyebrow" style={{ color: 'var(--text-3)' }}>Match conditions <span style={{ textTransform: 'none', letterSpacing: 0, color: 'var(--text-5)' }}>· optional, rule only applies when all match</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <Input label="Language" value={language} onChange={e => setLanguage(e.target.value)} placeholder="es, en, …" />
              <Input label="Area contains" value={area} onChange={e => setArea(e.target.value)} placeholder="Coral Gables" />
              <Input label="Min score" type="number" value={minScore} onChange={e => setMinScore(e.target.value)} placeholder="0" />
              <Input label="Max score" type="number" value={maxScore} onChange={e => setMaxScore(e.target.value)} placeholder="100" />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <Button variant="ghost" size="sm" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button size="sm" loading={creating} onClick={handleCreate}>Create rule</Button>
        </div>
      </Modal>
    </div>
  );
}
