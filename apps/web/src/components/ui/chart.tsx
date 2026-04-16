'use client';

import * as React from 'react';
import { Legend, type LegendProps, Tooltip, type TooltipProps } from 'recharts';
import { cn } from '@/lib/utils';

export type ChartConfig = Record<
  string,
  {
    label?: string;
    color?: string;
  }
>;

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error('useChart must be used within a <ChartContainer />');
  }
  return context;
}

function ChartContainer({
  config,
  className,
  children,
}: React.PropsWithChildren<{ config: ChartConfig; className?: string }>) {
  const styleVariables = Object.entries(config).reduce<Record<string, string>>(
    (acc, [key, value]) => {
      if (!value.color) return acc;
      acc[`--color-${key}`] = value.color;
      return acc;
    },
    {},
  );

  return (
    <ChartContext.Provider value={{ config }}>
      <div className={cn('h-full w-full', className)} style={styleVariables as React.CSSProperties}>
        {children}
      </div>
    </ChartContext.Provider>
  );
}

const ChartTooltip = Tooltip;
const ChartLegend = Legend;

function ChartTooltipContent({
  active,
  payload,
  label,
  formatter,
  labelFormatter,
  className,
}: TooltipProps<number, string> & { className?: string }) {
  const { config } = useChart();
  if (!active || !payload || payload.length === 0) return null;
  const resolvedLabel = labelFormatter ? labelFormatter(label, payload) : label;

  return (
    <div className={cn('rounded-lg border bg-background p-2.5 shadow-sm', className)}>
      {resolvedLabel ? <p className="mb-1 text-xs font-semibold">{String(resolvedLabel)}</p> : null}
      <div className="space-y-1">
        {payload.map((item, index) => {
          const key = String(item.dataKey || item.name || '');
          const labelText = config[key]?.label || item.name || key;
          const color = item.color || config[key]?.color || 'currentColor';
          const formattedValue = formatter
            ? formatter(item.value ?? 0, item.name ?? key, item, index, payload)
            : item.value;
          const valueText = Array.isArray(formattedValue)
            ? String(formattedValue[0])
            : String(formattedValue ?? 0);
          const nameText = Array.isArray(formattedValue) ? String(formattedValue[1]) : labelText;
          return (
            <div key={key} className="flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
                <span className="text-muted-foreground">{nameText}</span>
              </div>
              <span className="font-medium text-foreground">{valueText}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ChartLegendContent({ payload, className }: LegendProps & { className?: string }) {
  const { config } = useChart();
  if (!payload || payload.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap items-center gap-3 pt-2', className)}>
      {payload.map((item) => {
        const key = String(item.dataKey || item.value || '');
        const label = config[key]?.label || String(item.value || key);
        const color = String(item.color || config[key]?.color || 'currentColor');
        return (
          <div key={key} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {label}
          </div>
        );
      })}
    </div>
  );
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
