'use client';
import React from 'react';

interface Props { children: React.ReactNode; fallback?: React.ReactNode; }
interface State { hasError: boolean; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 300, gap: 16, padding: 32, textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,92,92,0.10)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', margin: '0 0 6px' }}>Something went wrong</p>
            <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>Try refreshing the page. If this persists, contact support.</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => window.location.reload()} style={{ padding: '8px 18px', background: 'var(--bg-3)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', cursor: 'pointer' }}>Refresh page</button>
            <a href="mailto:hello@conversionops.in" style={{ padding: '8px 18px', background: 'transparent', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, color: 'var(--text-3)', textDecoration: 'none' }}>Contact support</a>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
