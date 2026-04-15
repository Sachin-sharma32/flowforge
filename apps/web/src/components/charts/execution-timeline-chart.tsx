'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import type { IExecutionTimelinePoint } from '@flowforge/shared';

interface ExecutionTimelineChartProps {
  data: IExecutionTimelinePoint[];
}

const formatDay = (date: string) => {
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export function ExecutionTimelineChart({ data }: ExecutionTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No execution history available
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="failedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--destructive))" stopOpacity={0.35} />
            <stop offset="100%" stopColor="hsl(var(--destructive))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--outline-variant) / 0.25)"
          vertical={false}
        />
        <XAxis
          dataKey="date"
          tickFormatter={formatDay}
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--outline-variant) / 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={(label) => formatDay(label as string)}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        />
        <Area
          type="monotone"
          dataKey="completed"
          name="Completed"
          stroke="hsl(var(--success))"
          strokeWidth={2}
          fill="url(#completedGradient)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="failed"
          name="Failed"
          stroke="hsl(var(--destructive))"
          strokeWidth={2}
          fill="url(#failedGradient)"
          stackId="1"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
