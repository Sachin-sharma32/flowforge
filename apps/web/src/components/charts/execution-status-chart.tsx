'use client';

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { IExecutionStats } from '@flowforge/shared';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';

const STATUS_COLORS = {
  completed: '#10b981',
  failed: 'hsl(var(--destructive))',
  running: 'hsl(var(--secondary))',
  pending: 'hsl(var(--muted))',
  cancelled: 'hsl(var(--muted))',
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

  const chartConfig = {
    Completed: { label: 'Completed', color: STATUS_COLORS.completed },
    Failed: { label: 'Failed', color: STATUS_COLORS.failed },
    Other: { label: 'Other', color: STATUS_COLORS.pending },
  };

  return (
    <ChartContainer config={chartConfig} className="h-full w-full ">
      <ResponsiveContainer width="100%" height="100%">
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
          <ChartTooltip content={<ChartTooltipContent className="min-w-[150px]" />} />
          <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" height={36} />
        </PieChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}
