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
        fullscreen ? 'min-h-screen bg-background' : 'min-h-[52vh] rounded-lg bg-muted/50',
        className,
      )}
    >
      <div className="relative z-10 flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
