'use client';

import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type ViewMode = 'grid' | 'table';

const STORAGE_KEY = 'flowforge.view_mode';

export function getStoredViewMode(page: string): ViewMode {
  if (typeof window === 'undefined') return 'grid';
  try {
    const stored = localStorage.getItem(`${STORAGE_KEY}.${page}`);
    return stored === 'table' ? 'table' : 'grid';
  } catch {
    return 'grid';
  }
}

export function storeViewMode(page: string, mode: ViewMode) {
  try {
    localStorage.setItem(`${STORAGE_KEY}.${page}`, mode);
  } catch {
    // ignore
  }
}

interface ViewToggleProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
  className?: string;
}

export function ViewToggle({ value, onChange, className }: ViewToggleProps) {
  return (
    <div className={cn('flex items-center rounded-md border', className)}>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-none rounded-l-md', value === 'grid' && 'bg-muted')}
        onClick={() => onChange('grid')}
        aria-label="Grid view"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-8 w-8 rounded-none rounded-r-md', value === 'table' && 'bg-muted')}
        onClick={() => onChange('table')}
        aria-label="Table view"
      >
        <List className="h-4 w-4" />
      </Button>
    </div>
  );
}
