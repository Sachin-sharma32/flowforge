import { cn } from '@/lib/utils';
import { Spinner } from './spinner';

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
      <Spinner />
    </div>
  );
}
