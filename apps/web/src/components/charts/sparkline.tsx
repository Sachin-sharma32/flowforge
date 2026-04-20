'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface SparklineProps extends React.SVGAttributes<SVGSVGElement> {
  data: number[];
  color?: string;
  width?: number;
  height?: number;
  strokeWidth?: number;
  showDots?: boolean;
}

export function Sparkline({
  data,
  color = 'hsl(var(--primary))',
  width = 92,
  height = 28,
  strokeWidth = 1.5,
  showDots = false,
  className,
  ...props
}: SparklineProps) {
  const points = React.useMemo(() => {
    if (!data || data.length === 0) {
      return [] as Array<{ x: number; y: number; value: number }>;
    }

    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min || 1;
    const stepX = data.length === 1 ? 0 : width / (data.length - 1);
    const padding = 2;
    const usableHeight = height - padding * 2;

    return data.map((value, index) => {
      const normalized = (value - min) / range;
      const x = index * stepX;
      const y = height - padding - normalized * usableHeight;
      return { x, y, value };
    });
  }, [data, width, height]);

  if (points.length === 0) {
    return null;
  }

  const pathD = points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');

  return (
    <svg
      className={cn('overflow-visible', className)}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d={pathD}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {showDots
        ? points.map((point, index) => (
            <circle key={index} cx={point.x} cy={point.y} r={1.5} fill={color} />
          ))
        : null}
    </svg>
  );
}

interface HistogramBarsProps {
  data: Array<{ total: number; completed: number; failed: number }>;
  width?: number;
  height?: number;
}

export function HistogramBars({ data, width = 140, height = 24 }: HistogramBarsProps) {
  if (!data || data.length === 0) {
    return null;
  }

  const max = Math.max(1, ...data.map((bucket) => bucket.total));
  const gap = 2;
  const barWidth = Math.max(2, (width - gap * (data.length - 1)) / data.length);

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden="true"
      className="overflow-visible"
    >
      {data.map((bucket, index) => {
        const x = index * (barWidth + gap);
        const total = bucket.total;
        const failedRatio = total > 0 ? bucket.failed / total : 0;
        const completedRatio = total > 0 ? bucket.completed / total : 0;
        const barHeight = Math.max(3, (total / max) * height);
        const y = height - barHeight;
        const failedHeight = barHeight * failedRatio;
        const completedHeight = barHeight * completedRatio;
        const neutralHeight = barHeight - failedHeight - completedHeight;

        if (total === 0) {
          return (
            <rect
              key={index}
              x={x}
              y={height - 3}
              width={barWidth}
              height={3}
              rx={1.5}
              className="fill-muted-foreground/25"
            />
          );
        }

        return (
          <g key={index}>
            {failedHeight > 0 ? (
              <rect x={x} y={y} width={barWidth} height={failedHeight} className="fill-red-500" />
            ) : null}
            {neutralHeight > 0 ? (
              <rect
                x={x}
                y={y + failedHeight}
                width={barWidth}
                height={neutralHeight}
                className="fill-amber-400"
              />
            ) : null}
            {completedHeight > 0 ? (
              <rect
                x={x}
                y={y + failedHeight + neutralHeight}
                width={barWidth}
                height={completedHeight}
                className="fill-emerald-500"
              />
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
