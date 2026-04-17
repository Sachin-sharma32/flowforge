'use client';

import { AreaChart, Area, XAxis, YAxis, CartesianGrid } from 'recharts';
import type { IExecutionTimelinePoint } from '@flowforge/shared';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface ExecutionTimelineChartProps {
  data: IExecutionTimelinePoint[];
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

const shortDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
});

const longDateFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  year: 'numeric',
});

const parseDate = (value: string) => {
  const localDate = new Date(`${value}T00:00:00`);
  if (!Number.isNaN(localDate.getTime())) {
    return localDate;
  }

  return new Date(value);
};

const formatTickDate = (value: string, includeYear: boolean) => {
  const date = parseDate(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return includeYear ? longDateFormatter.format(date) : shortDateFormatter.format(date);
};

const buildIntegerTicks = (maxValue: number) => {
  if (maxValue <= 5) {
    return Array.from({ length: maxValue + 1 }, (_, index) => index);
  }

  const step = Math.ceil(maxValue / 5);
  const ticks: number[] = [0];

  for (let value = step; value < maxValue; value += step) {
    ticks.push(value);
  }

  ticks.push(maxValue);
  return ticks;
};

const chartConfig = {
  failed: {
    label: 'Failed',
    color: 'var(--chart-5)',
  },
  completed: {
    label: 'Completed',
    color: 'var(--chart-2)',
  },
};

export function ExecutionTimelineChart({ data }: ExecutionTimelineChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
        No execution history available
      </div>
    );
  }

  const sortedData = [...data].sort((a, b) => a.date.localeCompare(b.date));
  const firstDate = parseDate(sortedData[0].date);
  const lastDate = parseDate(sortedData[sortedData.length - 1].date);
  const rangeInDays =
    !Number.isNaN(firstDate.getTime()) && !Number.isNaN(lastDate.getTime())
      ? Math.max(1, Math.round((lastDate.getTime() - firstDate.getTime()) / DAY_IN_MS) + 1)
      : sortedData.length;

  const includeYearInTicks = rangeInDays > 365;
  const yMax = Math.max(
    1,
    ...sortedData.map((point) => Math.max(point.total, point.completed + point.failed)),
  );
  const yTicks = buildIntegerTicks(yMax);
  const tickCount = Math.min(7, Math.max(2, sortedData.length));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Execution Volume</CardTitle>
        <CardDescription>Completed vs failed over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer className="h-[260px] w-full" config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={sortedData}
            margin={{
              top: 8,
              left: 12,
              right: 12,
              bottom: 4,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={24}
              tickCount={tickCount}
              interval="preserveStartEnd"
              tickFormatter={(value) => formatTickDate(String(value), includeYearInTicks)}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
              domain={[0, yMax]}
              ticks={yTicks}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(label) => formatTickDate(String(label), true)}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <defs>
              <linearGradient id="fillFailed" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-failed)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-failed)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-completed)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-completed)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <Area
              dataKey="completed"
              name="Completed"
              type="monotone"
              fill="url(#fillCompleted)"
              fillOpacity={0.4}
              stroke="var(--color-completed)"
              strokeLinecap="round"
              strokeLinejoin="round"
              stackId="a"
            />
            <Area
              dataKey={'failed'}
              name="Failed"
              type="monotone"
              fill="url(#fillFailed)"
              fillOpacity={0.4}
              stroke="var(--color-failed)"
              strokeLinecap="round"
              strokeLinejoin="round"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
