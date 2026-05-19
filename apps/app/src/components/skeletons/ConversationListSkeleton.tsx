import { Skeleton } from '@conversionops/ui';

export function ConversationListSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} style={{
          padding: '12px 16px',
          background: 'var(--bg-2)',
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <Skeleton variant="circle" width={40} height={40} />
          <div style={{ flex: 1 }}>
            <Skeleton width="60%" height={14} style={{ marginBottom: 8, borderRadius: 4 }} />
            <Skeleton width="90%" height={12} style={{ borderRadius: 4 }} />
          </div>
          <Skeleton width={40} height={12} style={{ borderRadius: 4 }} />
        </div>
      ))}
    </div>
  );
}
