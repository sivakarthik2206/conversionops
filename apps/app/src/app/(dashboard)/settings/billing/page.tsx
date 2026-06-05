'use client';
import { useEffect, useRef, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

interface BillingStatus {
  plan: string;
  status: string;
  trialEndsAt: string | null;
  paddleConfigured: boolean;
  paddlePriceIds: { solo: string | null; brokerage: string | null; enterprise: string | null };
  customerId: string | null;
}

interface WorkspaceCtx { id: string; ownerEmail: string; }

interface UsageData { used: number; quota: number; percent: number; }

declare global {
  interface Window {
    Paddle?: {
      Initialize: (opts: { token: string }) => void;
      Environment: { set: (env: string) => void };
      Checkout: {
        open: (opts: {
          items: Array<{ priceId: string; quantity: number }>;
          customData?: Record<string, string>;
          customer?: { email: string };
        }) => void;
      };
    };
  }
}

const PLANS = [
  {
    key: 'solo' as const,
    label: 'Solo',
    price: '$750',
    period: '/month',
    tagline: 'For individual agents',
    features: ['AI SMS response', 'Lead scoring', 'Cal.com booking', '1 user'],
    featured: false,
  },
  {
    key: 'brokerage' as const,
    label: 'Brokerage',
    price: '$2,500',
    period: '/month',
    tagline: 'For teams up to 15 agents',
    features: ['Everything in Solo', 'Team dashboard', 'Full analytics', 'Up to 15 agents'],
    featured: true,
  },
  {
    key: 'enterprise' as const,
    label: 'Enterprise',
    price: '$5,000',
    period: '/month',
    tagline: 'For large brokerages',
    features: ['Everything in Brokerage', 'Custom routing rules', 'Dedicated support', 'Unlimited agents'],
    featured: false,
  },
];

function PricingCards({ status, workspaceId, userEmail }: { status: BillingStatus; workspaceId: string; userEmail: string }) {
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);
  const qc = useQueryClient();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const paddleReady = typeof window !== 'undefined' && !!window.Paddle;

  const handleSubscribe = (planKey: 'solo' | 'brokerage') => {
    if (!paddleReady || !window.Paddle) return;
    const priceId = status.paddlePriceIds[planKey];
    if (!priceId) {
      alert('Billing is not yet configured. Contact hello@conversionops.in');
      return;
    }
    window.Paddle.Checkout.open({
      items: [{ priceId, quantity: 1 }],
      customData: { workspaceId },
      customer: { email: userEmail },
    });
    setActivating(true);
    let attempts = 0;
    pollRef.current = setInterval(async () => {
      attempts++;
      await qc.invalidateQueries({ queryKey: ['billing-status'] });
      const fresh = qc.getQueryData<BillingStatus>(['billing-status']);
      if (fresh?.status === 'ACTIVE' || attempts >= 10) {
        if (pollRef.current) clearInterval(pollRef.current);
        setActivating(false);
        if (fresh?.status === 'ACTIVE') setActivated(true);
      }
    }, 3000);
  };

  if (activated) {
    return (
      <div style={{ textAlign: 'center', padding: '48px 0' }}>
        <div style={{ width: 60, height: 60, background: 'rgba(77,255,165,0.12)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
          <Icon name="check-circle" size={28} stroke={2} style={{ color: 'var(--green)' }} />
        </div>
        <h2 style={{ fontSize: 24, color: 'var(--text)', fontWeight: 600, margin: '0 0 8px' }}>Plan activated!</h2>
        <p style={{ fontSize: 14, color: 'var(--text-3)' }}>Your workspace is now active. Enjoy ConversionOps.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
      {PLANS.map(plan => (
        <div
          key={plan.key}
          style={{
            borderRadius: 14,
            padding: 22,
            background: plan.featured
              ? 'linear-gradient(180deg, rgba(232,255,71,0.06) 0%, var(--bg-2) 80%)'
              : 'var(--bg-2)',
            border: `1px solid ${plan.featured ? 'var(--accent)' : 'var(--border)'}`,
            boxShadow: plan.featured ? '0 16px 48px rgba(232,255,71,0.10)' : 'var(--shadow-sm)',
            display: 'flex',
            flexDirection: 'column',
            gap: 18,
          }}
        >
          {plan.featured && (
            <div style={{ alignSelf: 'flex-start', padding: '2px 8px', background: 'var(--accent)', color: '#000', borderRadius: 6, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace" }}>
              Most popular
            </div>
          )}
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: plan.featured ? 'var(--accent)' : 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', fontFamily: "'JetBrains Mono', monospace", marginBottom: 10 }}>
              {plan.label}
            </div>
            <div style={{ fontSize: 32, fontWeight: 400, color: 'var(--text)', fontFamily: "'DM Serif Display', serif" }}>
              {plan.price}
              <span style={{ fontSize: 14, color: 'var(--text-3)', fontFamily: 'inherit', fontWeight: 400 }}>{plan.period}</span>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>{plan.tagline}</div>
          </div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
            {plan.features.map(f => (
              <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: plan.featured ? 'var(--accent)' : 'rgba(77,255,165,0.18)', color: plan.featured ? '#000' : 'var(--green)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <Icon name="check" size={9} stroke={3} />
                </span>
                {f}
              </li>
            ))}
          </ul>

          {plan.key === 'enterprise' ? (
            <a
              href="mailto:hello@conversionops.in"
              style={{ display: 'block', width: '100%', padding: '12px', textAlign: 'center', borderRadius: 9, border: '1px solid var(--border)', color: 'var(--text-2)', fontSize: 14, textDecoration: 'none', boxSizing: 'border-box' }}
            >
              Contact us →
            </a>
          ) : (
            <button
              onClick={() => handleSubscribe(plan.key as 'solo' | 'brokerage')}
              disabled={activating || !paddleReady}
              style={{
                width: '100%',
                padding: '12px',
                background: plan.featured ? 'var(--accent)' : 'transparent',
                color: plan.featured ? '#000' : 'var(--text-2)',
                border: plan.featured ? 'none' : '1px solid var(--border)',
                borderRadius: 9,
                fontSize: 14,
                fontWeight: plan.featured ? 600 : 400,
                cursor: activating ? 'not-allowed' : 'pointer',
                opacity: activating ? 0.7 : 1,
              }}
            >
              {activating ? 'Processing...' : `Subscribe to ${plan.label} →`}
            </button>
          )}
        </div>
      ))}
      <style>{`@media(max-width:900px){.plans-grid{grid-template-columns:1fr!important}}`}</style>
    </div>
  );
}

export default function BillingPage() {
  const paddleLoaded = useRef(false);

  const { data: workspace } = useQuery<WorkspaceCtx>({
    queryKey: ['workspace-context'],
    queryFn: () => apiClient.get<WorkspaceCtx>('/workspaces/me'),
    staleTime: 60_000,
  });

  const { data: billingStatus } = useQuery<BillingStatus>({
    queryKey: ['billing-status'],
    queryFn: () => apiClient.get<BillingStatus>('/billing/status'),
    staleTime: 30_000,
  });

  const { data: usage } = useQuery<UsageData>({
    queryKey: ['billing-usage'],
    queryFn: () => apiClient.get<UsageData>('/billing/usage'),
    refetchInterval: 60_000,
  });

  // Load Paddle.js
  useEffect(() => {
    if (paddleLoaded.current) return;
    paddleLoaded.current = true;
    const script = document.createElement('script');
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js';
    script.onload = () => {
      if (!window.Paddle) return;
      if (process.env.NODE_ENV !== 'production') {
        window.Paddle.Environment.set('sandbox');
      }
      const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
      if (token) window.Paddle.Initialize({ token });
    };
    document.head.appendChild(script);
  }, []);

  const isActive = billingStatus?.status === 'ACTIVE' || billingStatus?.status === 'TRIAL';

  return (
    <ErrorBoundary>
      <div style={{ display: 'flex', gap: 32 }}>
        <SettingsNav />
        <div style={{ flex: 1, maxWidth: 920 }}>
          <div style={{ marginBottom: 24 }}>
            <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · Billing</p>
            <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
              Billing &amp; usage
            </h1>
          </div>

          {/* Usage bar */}
          {usage && (
            <div className="surface-card" style={{ padding: 20, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 }}>
                <div>
                  <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>AI token usage this month</h3>
                  <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '3px 0 0' }}>Resets on the 1st of each month</p>
                </div>
                <span style={{ fontSize: 28, fontWeight: 700, color: usage.percent > 80 ? 'var(--red)' : 'var(--accent)', fontFamily: "'JetBrains Mono', monospace" }}>
                  {usage.percent}%
                </span>
              </div>
              <div style={{ height: 8, borderRadius: 100, background: 'var(--bg-3)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, usage.percent)}%`, background: usage.percent > 80 ? 'var(--red)' : 'var(--accent)', borderRadius: 100 }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                <span>{usage.used.toLocaleString()} tokens used</span>
                <span>{usage.quota.toLocaleString()} limit</span>
              </div>
            </div>
          )}

          {isActive ? (
            // Active plan view
            <div className="surface-card" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--green)', boxShadow: '0 0 6px var(--green)' }} />
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Plan active</h2>
              </div>
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 6px' }}>
                Current plan: <strong style={{ color: 'var(--text)' }}>{billingStatus?.plan ?? '—'}</strong>
              </p>
              <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 20px' }}>
                Status: <strong style={{ color: 'var(--green)' }}>{billingStatus?.status}</strong>
              </p>
              <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
                To cancel or change your plan, email{' '}
                <a href="mailto:hello@conversionops.in" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  hello@conversionops.in
                </a>
              </p>
            </div>
          ) : (
            // Pricing cards for unpaid workspaces
            <div>
              <div style={{ marginBottom: 18 }}>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Choose a plan</h2>
                <p style={{ fontSize: 13, color: 'var(--text-3)', margin: '4px 0 0' }}>Payments processed securely by Paddle. Cancel anytime.</p>
              </div>
              {billingStatus && (
                <PricingCards
                  status={billingStatus}
                  workspaceId={workspace?.id ?? ''}
                  userEmail={workspace?.ownerEmail ?? ''}
                />
              )}
              <p style={{ marginTop: 20, fontSize: 13, color: 'var(--text-3)', textAlign: 'center' }}>
                Questions?{' '}
                <a href="mailto:hello@conversionops.in" style={{ color: 'var(--accent)', textDecoration: 'none' }}>
                  Email us at hello@conversionops.in
                </a>
              </p>
            </div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
}
