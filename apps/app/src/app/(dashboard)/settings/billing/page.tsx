'use client';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, PageHeader, useToast } from '@conversionops/ui';
import { apiClient } from '@/lib/api-client';

interface UsageData { used: number; quota: number; percent: number; }

const PLANS = [
  { id: 'SOLO', label: 'Solo', price: '$99/mo', features: ['2M tokens/month', '1 agent', 'SMS + AI response'] },
  { id: 'BROKERAGE', label: 'Brokerage', price: '$299/mo', features: ['10M tokens/month', '10 agents', 'CRM sync', 'Priority support'] },
  { id: 'ENTERPRISE', label: 'Enterprise', price: 'Custom', features: ['Unlimited tokens', 'Unlimited agents', 'Custom integrations', 'Dedicated support'] },
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
    <div>
      <PageHeader title="Billing" subtitle="Manage your subscription and token usage." />

      {usage && (
        <Card style={{ marginBottom: 24 }}>
          <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Token Usage This Month</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1, height: 12, background: 'var(--bg-4)', borderRadius: 6, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, usage.percent)}%`,
                background: usage.percent > 80 ? 'var(--red)' : usage.percent > 60 ? 'var(--amber)' : 'var(--accent)',
                borderRadius: 6,
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 14, color: 'var(--text-2)', minWidth: 80, textAlign: 'right' }}>
              {usage.percent}% used
            </span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {usage.used.toLocaleString()} / {usage.quota.toLocaleString()} tokens
            </span>
            <Button variant="ghost" size="sm" loading={loading === 'portal'} onClick={() => { void handleManage(); }}>
              Manage Subscription
            </Button>
          </div>
        </Card>
      )}

      <h3 style={{ fontWeight: 600, marginBottom: 16 }}>Plans</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {PLANS.map((plan) => (
          <Card key={plan.id} style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 4 }}>{plan.label}</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--accent)', marginBottom: 16 }}>{plan.price}</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 24px', flex: 1 }}>
              {plan.features.map((f) => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, fontSize: 13, color: 'var(--text-2)' }}>
                  <span style={{ color: 'var(--green)' }}>✓</span> {f}
                </li>
              ))}
            </ul>
            {plan.id !== 'ENTERPRISE' ? (
              <Button
                variant={plan.id === 'SOLO' ? 'ghost' : 'primary'}
                loading={loading === plan.id}
                disabled={!!loading}
                onClick={() => { void handleUpgrade(plan.id); }}
              >
                {plan.id === 'SOLO' ? 'Current Plan' : `Upgrade to ${plan.label}`}
              </Button>
            ) : (
              <Button variant="ghost" onClick={() => window.open('mailto:sales@conversionops.io')}>
                Contact Sales
              </Button>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
