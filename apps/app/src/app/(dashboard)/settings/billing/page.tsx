'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';
import { Icon } from '@/components/Icon';
import { SettingsNav } from '@/components/layout/SettingsNav';

interface UsageData { used: number; quota: number; percent: number; }

const PLANS = [
  {
    id: 'SOLO',
    label: 'Solo',
    setup: '$3,500',
    price: '$750',
    features: ['2M tokens / month', '1 AI agent', 'SMS + AI response', 'Email support'],
    accent: 'var(--text-2)',
  },
  {
    id: 'BROKERAGE',
    label: 'Brokerage',
    setup: '$12,000',
    price: '$2,500',
    features: ['10M tokens / month', 'Up to 15 agents', 'CRM sync', 'Priority support · 4hr SLA'],
    accent: 'var(--accent)',
    badge: 'Most popular',
  },
  {
    id: 'ENTERPRISE',
    label: 'Enterprise',
    setup: 'Custom',
    price: "Let's talk",
    features: ['Unlimited tokens', 'Unlimited agents', 'Custom integrations', 'Dedicated success manager'],
    accent: 'var(--purple)',
  },
];

export default function BillingPage() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const { data: usage } = useQuery<UsageData>({
    queryKey: ['billing-usage'],
    queryFn: () => apiClient.get<UsageData>('/billing/usage'),
    refetchInterval: 60000,
  });

  async function handleUpgrade(priceId: string) {
    setLoading(priceId);
    try {
      const { url } = await apiClient.post<{ url: string }>('/billing/checkout', { priceId });
      window.location.href = url;
    } catch {
      addToast('Failed to start checkout. Please try again.', 'error');
    } finally {
      setLoading(null);
    }
  }

  async function handleManage() {
    setLoading('portal');
    try {
      const { url } = await apiClient.post<{ url: string }>('/billing/portal', {});
      window.location.href = url;
    } catch {
      addToast('Failed to open billing portal.', 'error');
    } finally {
      setLoading(null);
    }
  }

  return (
    <div style={{ display: 'flex', gap: 32 }}>
      <SettingsNav />

      <div style={{ flex: 1, maxWidth: 880 }}>
        <div style={{ marginBottom: 24 }}>
          <p className="eyebrow" style={{ color: 'var(--text-3)' }}>Settings · Billing</p>
          <h1 className="serif" style={{ fontSize: 28, color: 'var(--text)', margin: '4px 0 0', fontWeight: 400, letterSpacing: '-0.02em' }}>
            Billing &amp; usage
          </h1>
        </div>

        {/* Usage */}
        {usage && (
          <div
            className="surface-card"
            style={{ padding: 22, marginBottom: 18, position: 'relative', overflow: 'hidden' }}
          >
            <div
              style={{
                position: 'absolute',
                top: -50,
                right: -50,
                width: 200,
                height: 200,
                borderRadius: '50%',
                background:
                  usage.percent > 80 ? 'radial-gradient(circle, rgba(255,92,92,0.10), transparent 70%)' :
                  usage.percent > 60 ? 'radial-gradient(circle, rgba(255,181,71,0.10), transparent 70%)' :
                                       'radial-gradient(circle, rgba(232,255,71,0.10), transparent 70%)',
                filter: 'blur(25px)',
                pointerEvents: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, position: 'relative' }}>
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', margin: 0 }}>Token usage this month</h3>
                <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>Resets on the 1st of each month.</p>
              </div>
              <button
                onClick={() => { void handleManage(); }}
                disabled={loading === 'portal'}
                className="btn-ghost"
                style={{ height: 32, padding: '0 12px', fontSize: 11 }}
              >
                Manage subscription
                <Icon name="external" size={11} stroke={1.8} />
              </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, position: 'relative' }}>
              <div style={{ flex: 1 }}>
                <div style={{ height: 10, borderRadius: 100, background: 'var(--bg-3)', border: '1px solid var(--border)', overflow: 'hidden', position: 'relative' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, usage.percent)}%`,
                      background: usage.percent > 80 ? 'linear-gradient(90deg, var(--amber), var(--red))' :
                                  usage.percent > 60 ? 'linear-gradient(90deg, var(--accent), var(--amber))' :
                                                        'linear-gradient(90deg, var(--green), var(--accent))',
                      borderRadius: 100,
                      transition: 'width 0.9s var(--ease-out-quart)',
                      boxShadow: '0 0 12px rgba(232,255,71,0.30)',
                    }}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-3)', fontFamily: "'JetBrains Mono', monospace" }}>
                    {usage.used.toLocaleString()} / {usage.quota.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>tokens used</span>
                </div>
              </div>
              <div
                className="serif"
                style={{
                  fontSize: 40,
                  lineHeight: 1,
                  color: usage.percent > 80 ? 'var(--red)' : usage.percent > 60 ? 'var(--amber)' : 'var(--accent)',
                  fontWeight: 400,
                  fontFamily: "'JetBrains Mono', monospace",
                  textShadow: '0 0 16px currentColor',
                  flexShrink: 0,
                }}
              >
                {usage.percent}<span style={{ fontSize: 16, color: 'var(--text-4)' }}>%</span>
              </div>
            </div>
          </div>
        )}

        {/* Plans */}
        <div style={{ marginBottom: 14 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', margin: 0, letterSpacing: '-0.005em' }}>
            Plans
          </h2>
          <p style={{ fontSize: 12, color: 'var(--text-3)', margin: '4px 0 0' }}>Setup is one-time. Monthly fees pause when you cancel.</p>
        </div>

        <div className="plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {PLANS.map((plan) => {
            const isFeatured = plan.id === 'BROKERAGE';
            return (
              <div
                key={plan.id}
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  padding: 20,
                  background: isFeatured
                    ? 'linear-gradient(180deg, rgba(232,255,71,0.06) 0%, var(--bg-2) 80%)'
                    : 'linear-gradient(180deg, var(--bg-2), var(--bg))',
                  border: '1px solid',
                  borderColor: isFeatured ? 'var(--accent)' : 'var(--border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                  boxShadow: isFeatured ? '0 16px 48px rgba(232,255,71,0.12)' : 'var(--shadow-sm)',
                  overflow: 'hidden',
                }}
              >
                {plan.badge && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 14,
                      right: 14,
                      padding: '3px 8px',
                      borderRadius: 100,
                      background: 'linear-gradient(180deg, var(--accent-soft), var(--accent))',
                      color: '#0a0a0b',
                      fontSize: 9,
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      fontFamily: "'JetBrains Mono', monospace",
                    }}
                  >
                    {plan.badge}
                  </div>
                )}

                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: plan.accent,
                      fontFamily: "'JetBrains Mono', monospace",
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      marginBottom: 12,
                    }}
                  >
                    {plan.label}
                  </div>
                  <div className="serif" style={{ fontSize: 32, lineHeight: 1, color: 'var(--text)', fontWeight: 400 }}>
                    {plan.setup}
                    {plan.setup !== 'Custom' && (
                      <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>setup</span>
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                    then <span style={{ color: 'var(--text)', fontWeight: 600 }}>{plan.price}</span>
                    {plan.price !== "Let's talk" && <span style={{ marginLeft: 4 }}>/ month</span>}
                  </div>
                </div>

                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                  {plan.features.map(f => (
                    <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      <span
                        style={{
                          width: 14,
                          height: 14,
                          borderRadius: '50%',
                          background: isFeatured ? 'var(--accent)' : 'rgba(77,255,165,0.18)',
                          color: isFeatured ? '#0a0a0b' : 'var(--green)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        <Icon name="check" size={9} stroke={3} />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>

                {plan.id !== 'ENTERPRISE' ? (
                  <button
                    onClick={() => { void handleUpgrade(plan.id); }}
                    disabled={!!loading}
                    className={isFeatured ? 'btn-primary' : 'btn-ghost'}
                    style={{ width: '100%' }}
                  >
                    {loading === plan.id ? <Icon name="loader" size={13} style={{ animation: 'spin 0.8s linear infinite' }} /> : null}
                    {plan.id === 'SOLO' ? 'Current plan' : `Upgrade to ${plan.label}`}
                  </button>
                ) : (
                  <a
                    href="mailto:sales@conversionops.io"
                    className="btn-ghost"
                    style={{ width: '100%' }}
                  >
                    Contact sales
                    <Icon name="arrow-right" size={12} stroke={2} />
                  </a>
                )}
              </div>
            );
          })}
        </div>

        <style>{`
          @media (max-width: 960px) { .plans-grid { grid-template-columns: 1fr !important; } }
        `}</style>
      </div>
    </div>
  );
}
