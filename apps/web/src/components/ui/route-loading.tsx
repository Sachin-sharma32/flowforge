import { cn } from '@/lib/utils';

interface RouteLoadingProps {
  className?: string;
  fullscreen?: boolean;
  label?: string;
}

export function RouteLoading({
  className,
  fullscreen = false,
  label = 'Loading next page',
}: RouteLoadingProps) {
  return (
    <div
      className={cn(
        'relative flex items-center justify-center overflow-hidden',
        fullscreen
          ? 'app-background min-h-screen'
          : 'min-h-[52vh] rounded-xl bg-surface-container-low',
        className,
      )}
    >
      {fullscreen ? (
        <div className="dot-grid pointer-events-none absolute inset-0 opacity-50" />
      ) : null}

      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 animate-pulse-ring rounded-full" />
          <div className="h-12 w-12 animate-spin rounded-full border-2 border-foreground/20 border-t-primary" />
        </div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
