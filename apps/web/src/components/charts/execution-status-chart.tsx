'use client';

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import type { IExecutionStats } from '@flowforge/shared';

const STATUS_COLORS = {
  completed: 'hsl(var(--primary))',
  failed: 'hsl(var(--on-surface-variant))',
  running: 'hsl(var(--secondary))',
  pending: 'hsl(var(--surface-container-highest))',
  cancelled: 'hsl(var(--surface-container))',
};

interface ExecutionStatusChartProps {
  stats: IExecutionStats;
  totalExecutions?: number;
}

export function ExecutionStatusChart({ stats, totalExecutions }: ExecutionStatusChartProps) {
  const pending = (totalExecutions ?? stats.total) - stats.completed - stats.failed;
  const data = [
    { name: 'Completed', value: stats.completed, color: STATUS_COLORS.completed },
    { name: 'Failed', value: stats.failed, color: STATUS_COLORS.failed },
    ...(pending > 0 ? [{ name: 'Other', value: pending, color: STATUS_COLORS.pending }] : []),
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
        No execution data
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
          strokeWidth={0}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--outline-variant) / 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          formatter={(value: number, name: string) => [`${value} executions`, name]}
        />
        <Legend
          verticalAlign="bottom"
          height={36}
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
