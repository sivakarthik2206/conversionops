'use client';
import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { Skeleton } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface Workspace {
  twilioNumber: string | null;
  aiConfig: { followUpBossApiKey?: string; calComUsername?: string };
  agentName?: string;
}

interface LeadsPage { items: unknown[] }

function CheckCircle({ done }: { done: boolean }) {
  return (
    <div
      style={{
        width: 32,
        height: 32,
        borderRadius: '50%',
        background: done ? 'var(--green)' : 'transparent',
        border: `2px solid ${done ? 'var(--green)' : 'var(--border-light)'}`,
        color: done ? '#0a0a0b' : 'var(--text-4)',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        transition: 'all 0.35s var(--ease-out-quart)',
        boxShadow: done ? '0 0 12px rgba(71,255,142,0.30)' : 'none',
      }}
    >
      {done && <Icon name="check" size={14} stroke={2.5} />}
    </div>
  );
}

interface CheckItemProps {
  done: boolean;
  title: string;
  description: string;
  action?: React.ReactNode;
}

function CheckItem({ done, title, description, action }: CheckItemProps) {
  return (
    <motion.div
      layout
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 16,
        padding: '18px 22px',
        borderRadius: 12,
        background: done ? 'rgba(71,255,142,0.04)' : 'var(--bg-2)',
        border: `1px solid ${done ? 'rgba(71,255,142,0.15)' : 'var(--border)'}`,
        transition: 'background 0.35s, border-color 0.35s',
      }}
    >
      <CheckCircle done={done} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: done ? 'var(--text-2)' : 'var(--text)',
              textDecoration: done ? 'line-through' : 'none',
              textDecorationColor: 'var(--text-4)',
              transition: 'all 0.3s',
            }}
          >
            {title}
          </span>
        </div>
        <p style={{ fontSize: 12.5, color: 'var(--text-3)', margin: 0, lineHeight: 1.55 }}>{description}</p>
        {!done && action && <div style={{ marginTop: 12 }}>{action}</div>}
      </div>
    </motion.div>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [testSent, setTestSent] = useState(false);

  const { data: workspace, isLoading: wLoading } = useQuery<Workspace>({
    queryKey: ['workspace'],
    queryFn: () => apiClient.get('/workspaces/me'),
  });

  const { data: leadsPage, isLoading: lLoading } = useQuery<LeadsPage>({
    queryKey: ['leads', 'onboarding-check'],
    queryFn: () => apiClient.get('/leads', { limit: 1 }),
  });

  const sendTestLead = useMutation({
    mutationFn: () => apiClient.post('/leads', {
      source: 'MANUAL',
      firstName: 'Test',
      lastName: 'Lead',
      phone: '+15555555555',
    }),
    onSuccess: async () => {
      setTestSent(true);
      await queryClient.invalidateQueries({ queryKey: ['leads', 'onboarding-check'] });
    },
  });

  const isLoading = wLoading || lLoading;

  const hasPhone = !!(workspace?.twilioNumber);
  const hasSource = !!(workspace?.aiConfig.followUpBossApiKey || workspace?.aiConfig.calComUsername || workspace?.twilioNumber);
  const hasAI = !!(workspace?.aiConfig && ((workspace.aiConfig as Record<string, unknown>)['agentName'] as string));
  const hasLeads = !!(leadsPage?.items?.length ?? 0 > 0) || testSent;

  const checks = [true, hasPhone, hasSource, hasAI, hasLeads];
  const completedCount = checks.filter(Boolean).length;
  const allDone = completedCount === 5;
  const progressPct = (completedCount / 5) * 100;

  if (isLoading) {
    return (
      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Skeleton style={{ height: 32, marginBottom: 24 }} />
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} style={{ height: 80, marginBottom: 12 }} />)}
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 600, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Setup</p>
        <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 8px', fontWeight: 400, letterSpacing: '-0.02em' }}>
          Getting started
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
          {completedCount} of 5 steps complete
        </p>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: 6,
          borderRadius: 100,
          background: 'var(--bg-3)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
          marginBottom: 24,
        }}
      >
        <motion.div
          style={{ height: '100%', background: 'var(--accent)', borderRadius: 100, boxShadow: '0 0 10px rgba(232,255,71,0.40)' }}
          initial={{ width: 0 }}
          animate={{ width: `${progressPct}%` }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>

      {/* Celebration */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              marginBottom: 24,
              padding: 28,
              borderRadius: 16,
              background: 'linear-gradient(135deg, rgba(71,255,142,0.12), rgba(232,255,71,0.06))',
              border: '1px solid rgba(71,255,142,0.30)',
              textAlign: 'center',
            }}
          >
            <div
              style={{
                width: 56, height: 56, borderRadius: '50%',
                background: 'var(--green)', color: '#0a0a0b',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px', boxShadow: '0 8px 24px rgba(71,255,142,0.35)',
              }}
            >
              <Icon name="check" size={22} stroke={2.5} />
            </div>
            <h2 className="serif" style={{ fontSize: 26, color: 'var(--green)', margin: '0 0 8px', fontWeight: 400, fontStyle: 'italic' }}>
              You are live!
            </h2>
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 0 20px', lineHeight: 1.6, maxWidth: 380, marginInline: 'auto' }}>
              ConversionOps is active. Every inbound lead will get an AI response in 60 seconds.
            </p>
            <button onClick={() => router.push('/')} className="btn-primary" style={{ fontSize: 13 }}>
              Go to dashboard
              <Icon name="arrow-right" size={13} stroke={2} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checklist */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <CheckItem
          done={true}
          title="Workspace created"
          description="Your workspace is set up and ready."
        />

        <CheckItem
          done={hasPhone}
          title="Phone number connected"
          description="Connect a Twilio phone number to enable SMS lead response."
          action={
            <Link href="/settings/phone" className="btn-ghost" style={{ fontSize: 12, height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Add phone number
              <Icon name="arrow-right" size={11} stroke={2} />
            </Link>
          }
        />

        <CheckItem
          done={hasSource}
          title="Lead source connected"
          description="Connect Zillow, your website, or another lead source to start receiving leads."
          action={
            <Link href="/integrations" className="btn-ghost" style={{ fontSize: 12, height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Set up integrations
              <Icon name="arrow-right" size={11} stroke={2} />
            </Link>
          }
        />

        <CheckItem
          done={hasAI}
          title="AI persona configured"
          description="Set your AI agent's name and tone so it sounds like you."
          action={
            <Link href="/settings/ai" className="btn-ghost" style={{ fontSize: 12, height: 34, display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
              Configure AI
              <Icon name="arrow-right" size={11} stroke={2} />
            </Link>
          }
        />

        <CheckItem
          done={hasLeads}
          title="Send a test lead"
          description="Test the full flow by sending yourself a test lead through the AI pipeline."
          action={
            <button
              onClick={() => sendTestLead.mutate()}
              disabled={sendTestLead.isPending}
              className="btn-primary"
              style={{ fontSize: 12, height: 34 }}
            >
              {sendTestLead.isPending
                ? <><Icon name="loader" size={12} style={{ animation: 'spin 0.8s linear infinite' }} /> Sending…</>
                : <><Icon name="send" size={12} stroke={2} /> Send test lead</>
              }
            </button>
          }
        />
      </div>
    </div>
  );
}
