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
import { ButtonGroup } from './button-group';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTrigger,
} from '@/components/ui/dialog';

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
  };

  return (
    <div className="flex gap-2">
      <ButtonGroup>
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
      </ButtonGroup>
      <Dialog>
        <DialogTrigger>
          <Button variant="secondary" size="sm">
            <CalendarIcon className="mr-2 h-4 w-4" />
            {label}
          </Button>
        </DialogTrigger>
        <DialogContent showCloseButton={false} className="min-w-fit">
          <DialogHeader>
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
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
