'use client';
import React from 'react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  reset() {
    this.setState({ hasError: false, error: null });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 320,
          gap: 16,
          padding: 32,
        }}>
          <div style={{
            background: 'rgba(255,71,71,0.08)',
            border: '1px solid rgba(255,71,71,0.2)',
            borderRadius: 12,
            padding: '24px 32px',
            textAlign: 'center',
            maxWidth: 480,
          }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠</div>
            <h3 style={{ fontWeight: 700, marginBottom: 8, fontSize: 18 }}>Something went wrong</h3>
            <p style={{ color: 'var(--text-2)', fontSize: 13, marginBottom: 20 }}>
              {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
            </p>
            <button
              onClick={() => this.reset()}
              style={{
                background: 'var(--accent)',
                color: '#000',
                border: 'none',
                borderRadius: 8,
                padding: '8px 20px',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: 14,
              }}
            >
              Try again
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
