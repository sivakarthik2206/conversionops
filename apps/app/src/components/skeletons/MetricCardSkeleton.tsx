import { Skeleton } from '@conversionops/ui';

export function MetricCardSkeleton() {
  return (
    <div style={{
      padding: 20,
      background: 'var(--bg-2)',
      border: '1px solid var(--border)',
      borderRadius: 12,
    }}>
      <Skeleton width="50%" height={12} style={{ marginBottom: 12, borderRadius: 4 }} />
      <Skeleton width="40%" height={32} style={{ marginBottom: 12, borderRadius: 4 }} />
      <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40 }}>
        {Array.from({ length: 12 }, (_, i) => {
          const heights = [20, 35, 15, 40, 28, 10, 38, 25, 32, 18, 42, 22];
          return (
            <Skeleton
              key={i}
              variant="rect"
              width={12}
              height={heights[i % heights.length]}
            />
          );
        })}
      </div>
    </div>
  );
}
