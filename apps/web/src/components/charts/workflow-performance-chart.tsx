'use client';

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import type { IWorkflowExecutionStats } from '@flowforge/shared';

interface WorkflowPerformanceChartProps {
  data: IWorkflowExecutionStats[];
}

const truncate = (s: string, n = 18) => (s.length > n ? `${s.slice(0, n)}…` : s);

export function WorkflowPerformanceChart({ data }: WorkflowPerformanceChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No workflow data yet
      </div>
    );
  }

  const chartData = data.map((w) => ({
    name: truncate(w.workflowName),
    fullName: w.workflowName,
    completed: w.completed,
    failed: w.failed,
    successRate: w.successRate,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(260, chartData.length * 40)}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 10, right: 16, left: 0, bottom: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="hsl(var(--outline-variant) / 0.25)"
          horizontal={false}
        />
        <XAxis
          type="number"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <YAxis
          type="category"
          dataKey="name"
          stroke="hsl(var(--muted-foreground))"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={120}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--outline-variant) / 0.2)',
            borderRadius: '8px',
            fontSize: '12px',
          }}
          labelFormatter={(_, payload) => {
            const item = payload?.[0]?.payload as { fullName?: string } | undefined;
            return item?.fullName ?? '';
          }}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        />
        <Bar
          dataKey="completed"
          name="Completed"
          stackId="a"
          fill="hsl(var(--success))"
          radius={[0, 0, 0, 0]}
        >
          {chartData.map((_, i) => (
            <Cell key={`c-${i}`} />
          ))}
        </Bar>
        <Bar
          dataKey="failed"
          name="Failed"
          stackId="a"
          fill="hsl(var(--destructive))"
          radius={[0, 4, 4, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}
