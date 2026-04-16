'use client';

import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { CalendarIcon, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export interface DateTimeRangeValue {
  from?: Date;
  to?: Date;
}

interface DateTimeRangePickerProps {
  value: DateTimeRangeValue;
  onChange: (value: DateTimeRangeValue) => void;
  className?: string;
}

const PRESETS = [
  { label: 'Today', days: 0 },
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

function toLocalInputValue(date?: Date) {
  if (!date) return '';
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60000);
  return localDate.toISOString().slice(0, 16);
}

function parseLocalInputValue(value: string) {
  if (!value) return undefined;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function toDayStart(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}

function toDayEnd(date: Date) {
  const normalized = new Date(date);
  normalized.setHours(23, 59, 59, 999);
  return normalized;
}

export function DateTimeRangePicker({ value, onChange, className }: DateTimeRangePickerProps) {
  const [open, setOpen] = useState(false);
  const selectedRange = useMemo<DateRange>(
    () => ({
      from: value.from ? toDayStart(value.from) : undefined,
      to: value.to ? toDayStart(value.to) : undefined,
    }),
    [value.from, value.to],
  );

  const label = useMemo(() => {
    if (!value.from && !value.to) return 'Select range';
    if (value.from && !value.to) return format(value.from, 'MMM d, yyyy HH:mm');
    if (!value.from && value.to) return format(value.to, 'MMM d, yyyy HH:mm');
    return `${format(value.from as Date, 'MMM d, yyyy HH:mm')} - ${format(value.to as Date, 'MMM d, yyyy HH:mm')}`;
  }, [value.from, value.to]);

  const onPresetSelect = (days: number) => {
    const end = new Date();
    const start = new Date();
    if (days > 0) {
      start.setDate(end.getDate() - (days - 1));
      start.setHours(0, 0, 0, 0);
    }
    onChange({ from: start, to: end });
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn('w-full justify-start text-left font-normal', className)}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[min(100vw-2rem,760px)] p-3" align="start">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant="secondary"
                size="sm"
                onClick={() => onPresetSelect(preset.days)}
              >
                {preset.label}
              </Button>
            ))}
          </div>

          <Calendar
            mode="range"
            numberOfMonths={2}
            defaultMonth={selectedRange.from || new Date()}
            selected={selectedRange}
            onSelect={(range) =>
              onChange({
                from: range?.from ? toDayStart(range.from) : undefined,
                to: range?.to ? toDayEnd(range.to) : undefined,
              })
            }
            className="rounded-md border"
          />

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> From
              </label>
              <Input
                type="datetime-local"
                value={toLocalInputValue(value.from)}
                onChange={(event) =>
                  onChange({ from: parseLocalInputValue(event.target.value), to: value.to })
                }
              />
            </div>
            <div className="space-y-1">
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock3 className="h-3.5 w-3.5" /> To
              </label>
              <Input
                type="datetime-local"
                value={toLocalInputValue(value.to)}
                onChange={(event) =>
                  onChange({ from: value.from, to: parseLocalInputValue(event.target.value) })
                }
              />
            </div>
          </div>

          <div className="flex justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onChange({ from: undefined, to: undefined });
                setOpen(false);
              }}
            >
              Clear
            </Button>
            <Button size="sm" onClick={() => setOpen(false)}>
              Apply
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
