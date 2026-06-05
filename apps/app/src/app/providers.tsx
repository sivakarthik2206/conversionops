'use client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { ToastProvider, useToast } from '@conversionops/ui';

function GlobalToastBridge() {
  const { addToast } = useToast();
  useEffect(() => {
    const handler = (e: Event) => {
      const { message, type } = (e as CustomEvent<{ message: string; type: 'error' | 'info' | 'success' }>).detail;
      addToast(message, type);
    };
    window.addEventListener('co:toast', handler);
    return () => window.removeEventListener('co:toast', handler);
  }, [addToast]);
  return null;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
  }));
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <GlobalToastBridge />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
