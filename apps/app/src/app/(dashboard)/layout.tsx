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
    if (typeof window !== 'undefined' && !localStorage.getItem('auth_token')) {
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
          <main style={{ paddingTop: 64, minHeight: '100vh' }}>
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
