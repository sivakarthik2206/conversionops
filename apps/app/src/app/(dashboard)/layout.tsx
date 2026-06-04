'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import { CommandPalette } from '@/components/CommandPalette';
import { RealtimeProvider } from '@/components/realtime/RealtimeProvider';
import { apiClient } from '@/lib/api-client';

interface WorkspaceContext {
  id: string;
  name: string;
  plan: string;
  status: string;
  aiPaused: boolean;
  tokenUsageCurrentMonth: number;
  tokenQuotaMonthly: number;
  ownerEmail: string;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [cmdOpen, setCmdOpen] = useState(false);

  const { data: workspace } = useQuery<WorkspaceContext>({
    queryKey: ['workspace-context'],
    queryFn: () => apiClient.get('/workspaces/me'),
    staleTime: 60_000,
  });

  const aiQuotaWarning = workspace
    ? workspace.tokenQuotaMonthly > 0 && workspace.tokenUsageCurrentMonth / workspace.tokenQuotaMonthly > 0.8
    : false;

  useEffect(() => {
    if (typeof window !== 'undefined' && !localStorage.getItem('co_token')) {
      router.replace('/login');
    }
  }, [router]);

  // ⌘K / Ctrl+K global shortcut
  const openCmd = useCallback(() => setCmdOpen(true), []);
  const closeCmd = useCallback(() => setCmdOpen(false), []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <RealtimeProvider workspaceId={workspace?.id}>
      <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)', position: 'relative', zIndex: 1 }}>
        <Sidebar
          onSearchClick={openCmd}
          workspaceName={workspace?.name}
          plan={workspace?.plan}
        />
        <div style={{ flex: 1, marginLeft: 248, minWidth: 0 }}>
          <Topbar
            onSearchClick={openCmd}
            userName={workspace?.ownerEmail ?? ''}
            aiPaused={workspace?.aiPaused ?? false}
            aiQuotaWarning={aiQuotaWarning}
          />
          {workspace?.status === 'CANCELLED' && (
            <div style={{ background: 'rgba(255,92,92,0.10)', borderBottom: '1px solid rgba(255,92,92,0.25)', padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 64 }}>
              <span style={{ fontSize: 13, color: 'var(--red)' }}>
                Your subscription has been cancelled. Renew your plan to restore full access.
              </span>
              <a href="/settings/billing" style={{ fontSize: 13, fontWeight: 600, color: 'var(--red)', textDecoration: 'none', padding: '5px 12px', border: '1px solid rgba(255,92,92,0.4)', borderRadius: 7 }}>
                Renew →
              </a>
            </div>
          )}
          <main style={{ paddingTop: workspace?.status === 'CANCELLED' ? 0 : 64, minHeight: '100vh' }}>
            <div style={{ padding: '32px 32px 64px', maxWidth: 1400, margin: '0 auto' }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={pathname}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>
          </main>
        </div>
        <div className="grain" />
        <CommandPalette open={cmdOpen} onClose={closeCmd} />
      </div>
    </RealtimeProvider>
  );
}
