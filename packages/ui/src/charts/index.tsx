import React from 'react';

export interface BarChartProps {
  data: { label: string; value: number }[];
  color?: string;
  height?: number;
}

export function BarChart({ data, color = 'var(--accent)', height = 120 }: BarChartProps) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height }}>
      {data.map((d) => (
        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
          <div
            style={{
              width: '100%',
              height: `${(d.value / max) * (height - 20)}px`,
              background: color,
              borderRadius: '4px 4px 0 0',
              opacity: 0.85,
              minHeight: 2,
            }}
          />
          <span style={{ fontSize: 10, color: 'var(--text-4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '100%' }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export interface LineChartProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
}

export function LineChart({ data, color = 'var(--accent)', height = 60, width = 200 }: LineChartProps) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  });

  return (
    <svg width={width} height={height} style={{ overflow: 'visible' }}>
      <polyline
        points={points.join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export interface DonutChartProps {
  segments: { label: string; value: number; color?: string }[];
  size?: number;
}

const DEFAULT_COLORS = ['var(--accent)', 'var(--blue)', 'var(--purple)', 'var(--green)', 'var(--amber)'];

export function DonutChart({ segments, size = 120 }: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 12;
  const innerR = r * 0.6;

  let cumulativeAngle = -Math.PI / 2;
  const paths = segments.map((seg, i) => {
    const angle = (seg.value / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(cumulativeAngle);
    const y1 = cy + r * Math.sin(cumulativeAngle);
    cumulativeAngle += angle;
    const x2 = cx + r * Math.cos(cumulativeAngle);
    const y2 = cy + r * Math.sin(cumulativeAngle);
    const ix1 = cx + innerR * Math.cos(cumulativeAngle - angle);
    const iy1 = cy + innerR * Math.sin(cumulativeAngle - angle);
    const ix2 = cx + innerR * Math.cos(cumulativeAngle);
    const iy2 = cy + innerR * Math.sin(cumulativeAngle);
    const large = angle > Math.PI ? 1 : 0;
    const d = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
    return { d, color: seg.color ?? DEFAULT_COLORS[i % DEFAULT_COLORS.length] };
  });

  return (
    <svg width={size} height={size}>
      {paths.map((path, i) => (
        <path key={i} d={path.d} fill={path.color ?? 'var(--accent)'} />
      ))}
    </svg>
  );
}
