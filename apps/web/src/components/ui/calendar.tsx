'use client';

import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-2', className)}
      classNames={{
        months: 'flex flex-col gap-4 sm:flex-row sm:gap-4',
        month: 'space-y-4',
        month_caption: 'relative flex items-center justify-center pt-1',
        caption_label: 'text-sm font-semibold',
        nav: 'flex items-center gap-1',
        button_previous: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        button_next: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        month_grid: 'w-full border-collapse space-y-1',
        weekdays: 'flex',
        weekday: 'w-9 rounded-md text-[0.75rem] font-medium text-muted-foreground',
        week: 'mt-2 flex w-full',
        day: 'relative h-9 w-9 p-0 text-center text-sm focus-within:relative focus-within:z-20',
        day_button: cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'h-9 w-9 p-0 font-normal aria-selected:opacity-100',
        ),
        selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        today: 'bg-surface-container-high text-foreground',
        outside: 'text-muted-foreground opacity-50',
        disabled: 'text-muted-foreground opacity-40',
        range_start:
          'bg-surface-container-high text-foreground rounded-l-md [&>button]:bg-primary [&>button]:text-primary-foreground',
        range_end:
          'bg-surface-container-high text-foreground rounded-r-md [&>button]:bg-primary [&>button]:text-primary-foreground',
        range_middle: 'bg-surface-container-high text-foreground',
        hidden: 'invisible',
        // Keep deprecated keys to avoid style regressions during migration.
        caption: 'flex justify-center pt-1 relative items-center',
        nav_button: cn(
          buttonVariants({ variant: 'outline', size: 'icon' }),
          'h-8 w-8 bg-transparent p-0 opacity-70 hover:opacity-100',
        ),
        nav_button_previous: 'absolute left-1',
        nav_button_next: 'absolute right-1',
        table: 'w-full border-collapse space-y-1',
        head_row: 'flex',
        head_cell: 'text-muted-foreground rounded-md w-9 font-medium text-[0.75rem]',
        row: 'flex w-full mt-2',
        day_selected:
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
        day_today: 'bg-surface-container-high text-foreground',
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-40',
        day_range_start:
          'bg-surface-container-high text-foreground rounded-l-md [&>button]:bg-primary [&>button]:text-primary-foreground',
        day_range_end:
          'bg-surface-container-high text-foreground rounded-r-md [&>button]:bg-primary [&>button]:text-primary-foreground',
        day_range_middle: 'bg-surface-container-high text-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className, ...iconProps }) => {
          const iconClassName = cn('h-4 w-4', className);

          if (orientation === 'left') {
            return <ChevronLeft className={iconClassName} {...iconProps} />;
          }
          if (orientation === 'right') {
            return <ChevronRight className={iconClassName} {...iconProps} />;
          }
          if (orientation === 'up') {
            return <ChevronUp className={iconClassName} {...iconProps} />;
          }
          return <ChevronDown className={iconClassName} {...iconProps} />;
        },
      }}
      {...props}
    />
  );
}
Calendar.displayName = 'Calendar';

export { Calendar };
