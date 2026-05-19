import { Skeleton } from '@conversionops/ui';

export function LeadCardSkeleton() {
  return (
    <div style={{
      padding: 16,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <Skeleton variant="circle" width={48} height={48} />
        <div style={{ flex: 1 }}>
          <Skeleton width="55%" height={14} style={{ marginBottom: 6, borderRadius: 4 }} />
          <Skeleton width="35%" height={12} style={{ borderRadius: 4 }} />
        </div>
        <Skeleton variant="circle" width={48} height={48} />
      </div>
      <Skeleton width="80%" height={12} style={{ marginBottom: 6, borderRadius: 4 }} />
      <Skeleton width="65%" height={12} style={{ marginBottom: 12, borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 8 }}>
        <Skeleton variant="rect" width={60} height={24} />
        <Skeleton variant="rect" width={80} height={24} />
      </div>
    </div>
  );
}
