'use client';
import { Suspense, useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { apiClient } from '@/lib/api-client';
import { formatMessageTime } from '@/lib/format-time';
import { IntegrationCard } from '@/components/integrations/IntegrationCard';
import { ConnectModal } from '@/components/integrations/ConnectModal';
import { Icon } from '@/components/Icon';

interface Integration {
  provider: string;
  status: 'connected' | 'disconnected' | 'error';
  lastTestedAt: string | null;
  lastTestResult: string | null;
  config: Record<string, string>;
}

interface WorkspaceCtx { id: string; name: string; }

type ProviderKey = 'twilio' | 'zillow' | 'realtor_com' | 'website' | 'follow_up_boss' | 'calcom' | 'zapier';

const PROVIDER_META: Record<ProviderKey, { name: string; description: string; logo: React.ReactNode }> = {
  twilio: {
    name: 'Twilio SMS',
    description: 'Your dedicated phone number for AI-powered lead conversations.',
    logo: <span style={{ fontSize: 18, fontWeight: 700, color: '#f22f46', fontFamily: "'JetBrains Mono', monospace" }}>T</span>,
  },
  zillow: {
    name: 'Zillow Premier Agent',
    description: 'Capture leads from your Zillow listings automatically.',
    logo: <span style={{ fontSize: 16, fontWeight: 700, color: '#006aff' }}>Z</span>,
  },
  realtor_com: {
    name: 'Realtor.com',
    description: 'Import leads from your Realtor.com profile in real time.',
    logo: <span style={{ fontSize: 14, fontWeight: 700, color: '#d9231d' }}>R.</span>,
  },
  website: {
    name: 'Website Form',
    description: 'Capture contact form submissions from your personal website.',
    logo: <Icon name="globe" size={18} stroke={1.8} style={{ color: 'var(--text-3)' }} />,
  },
  follow_up_boss: {
    name: 'Follow Up Boss',
    description: 'Sync qualified leads and notes directly into your CRM.',
    logo: <span style={{ fontSize: 14, fontWeight: 700, color: '#2563eb' }}>FUB</span>,
  },
  calcom: {
    name: 'Cal.com',
    description: 'Let the AI send booking links when a lead is ready to meet.',
    logo: <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Cal</span>,
  },
  zapier: {
    name: 'Zapier',
    description: 'Connect any CRM or tool — kvCORE, BoomTown, HubSpot, and 5,000+ more.',
    logo: <span style={{ fontSize: 18, fontWeight: 700, color: '#ff4a00' }}>⚡</span>,
  },
};

const LEAD_SOURCES: ProviderKey[] = ['twilio', 'zillow', 'realtor_com', 'website'];
const CRM_BOOKING: ProviderKey[] = ['follow_up_boss', 'calcom', 'zapier'];

function SectionHeading({ children }: { children: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
      <span className="serif" style={{ fontSize: 18, fontWeight: 400, color: 'var(--text)', letterSpacing: '-0.01em' }}>{children}</span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function getConfigSummary(provider: ProviderKey, config: Record<string, string>): string | undefined {
  switch (provider) {
    case 'twilio':        return config['phoneNumber'] ? `${config['phoneNumber']} · ${config['accountSid'] ?? ''}` : undefined;
    case 'calcom':        return config['username'] ? `cal.com/${config['username']}` : undefined;
    case 'zapier':        return config['webhookUrl'] ? config['webhookUrl'].slice(0, 48) + '…' : undefined;
    case 'follow_up_boss': return config['apiKey'] ? `API key: ${config['apiKey']}` : undefined;
    default:              return undefined;
  }
}

export default function IntegrationsPage() {
  return (
    <Suspense fallback={null}>
      <IntegrationsPageInner />
    </Suspense>
  );
}

function IntegrationsPageInner() {
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const [modalProvider, setModalProvider] = useState<ProviderKey | null>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const { data: workspace } = useQuery<WorkspaceCtx>({
    queryKey: ['workspace-context'],
    queryFn: () => apiClient.get('/workspaces/me'),
    staleTime: 60_000,
  });

  const { data, isLoading, dataUpdatedAt } = useQuery<{ integrations: Integration[] }>({
    queryKey: ['integrations'],
    queryFn: () => apiClient.get('/integrations'),
    staleTime: 30_000,
  });

  // Auto-open modal from ?modal= query param (used by onboarding)
  useEffect(() => {
    const m = searchParams.get('modal') as ProviderKey | null;
    if (m && PROVIDER_META[m]) setModalProvider(m);
  }, [searchParams]);

  const integrations = data?.integrations ?? [];
  const getInt = (p: ProviderKey): Integration =>
    integrations.find(i => i.provider === p) ?? { provider: p, status: 'disconnected', lastTestedAt: null, lastTestResult: null, config: {} };

  const handleConnect = async (provider: string, formData: Record<string, string>): Promise<{ success: boolean; error?: string }> => {
    try {
      await apiClient.post(`/integrations/${provider}/connect`, formData);
      return { success: true };
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Connection failed';
      return { success: false, error: msg };
    }
  };

  const handleDisconnect = async (provider: ProviderKey) => {
    await apiClient.post(`/integrations/${provider}/disconnect`, {});
    void qc.invalidateQueries({ queryKey: ['integrations'] });
    showToast(`${PROVIDER_META[provider].name} disconnected.`);
  };

  const handleTest = async (provider: ProviderKey) => {
    const r = await apiClient.post<{ success: boolean; message: string; latencyMs: number }>(`/integrations/${provider}/test`, {});
    void qc.invalidateQueries({ queryKey: ['integrations'] });
    return r;
  };

  const handleSuccess = (provider: ProviderKey) => {
    setModalProvider(null);
    void qc.invalidateQueries({ queryKey: ['integrations'] });
    showToast(`✓ ${PROVIDER_META[provider].name} connected successfully`);
  };

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const lastSync = dataUpdatedAt > 0 ? formatMessageTime(dataUpdatedAt) : null;

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 32 }}>
        <div>
          <h1 className="serif" style={{ fontSize: 32, fontWeight: 400, color: 'var(--text)', margin: 0, letterSpacing: '-0.02em' }}>Integrations</h1>
          <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '6px 0 0' }}>Connect your lead sources, CRM, and communications tools.</p>
        </div>
        {lastSync && (
          <span style={{ fontSize: 12, color: 'var(--text-4)', marginTop: 6, fontFamily: "'JetBrains Mono', monospace" }}>
            Last synced {lastSync}
          </span>
        )}
      </div>

      {isLoading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ height: 100, borderRadius: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          ))}
        </div>
      ) : (
        <>
          {/* Lead sources */}
          <div style={{ marginBottom: 36 }}>
            <SectionHeading>Lead sources</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
              {LEAD_SOURCES.map(p => {
                const int = getInt(p);
                const meta = PROVIDER_META[p];
                return (
                  <IntegrationCard
                    key={p}
                    provider={p}
                    name={meta.name}
                    description={meta.description}
                    logo={meta.logo}
                    status={int.status}
                    configSummary={getConfigSummary(p, int.config)}
                    badge={(p === 'zillow' || p === 'realtor_com') ? 'Powered by Zapier — takes 5 minutes to set up' : undefined}
                    onConnect={() => setModalProvider(p)}
                    onDisconnect={() => handleDisconnect(p)}
                    onTest={() => handleTest(p)}
                  />
                );
              })}
            </div>
          </div>

          {/* CRM & Booking */}
          <div style={{ marginBottom: 36 }}>
            <SectionHeading>CRM &amp; booking</SectionHeading>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 12 }}>
              {CRM_BOOKING.map(p => {
                const int = getInt(p);
                const meta = PROVIDER_META[p];
                return (
                  <IntegrationCard
                    key={p}
                    provider={p}
                    name={meta.name}
                    description={meta.description}
                    logo={meta.logo}
                    status={int.status}
                    configSummary={getConfigSummary(p, int.config)}
                    onConnect={() => setModalProvider(p)}
                    onDisconnect={() => handleDisconnect(p)}
                    onTest={() => handleTest(p)}
                  />
                );
              })}
            </div>
          </div>

          {/* Communications */}
          <div>
            <SectionHeading>Communications</SectionHeading>
            <div style={{ maxWidth: 420 }}>
              <IntegrationCard
                provider="resend"
                name="Resend email"
                description="Transactional email for agent alerts and notifications. Configured at the infrastructure level."
                logo={<span style={{ fontWeight: 700, color: '#000', background: '#fff', borderRadius: 4, padding: '1px 4px', fontSize: 12 }}>R</span>}
                status="connected"
                onConnect={() => {}}
                onDisconnect={async () => {}}
                onTest={async () => ({ success: true, message: 'Resend is active', latencyMs: 0 })}
                readOnly
              />
            </div>
          </div>
        </>
      )}

      {/* Connect modal */}
      <AnimatePresence>
        {modalProvider && workspace && (
          <ConnectModal
            key={modalProvider}
            provider={modalProvider}
            name={PROVIDER_META[modalProvider].name}
            workspaceId={workspace.id}
            onClose={() => setModalProvider(null)}
            onSuccess={() => handleSuccess(modalProvider)}
            onConnect={handleConnect}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', background: 'var(--bg-2)', border: '1px solid var(--border-light)', borderRadius: 10, padding: '12px 20px', fontSize: 13, color: 'var(--text)', boxShadow: 'var(--shadow-lg)', zIndex: 300, whiteSpace: 'nowrap' }}
          >
            {toastMsg}
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
    </div>
  );
}
