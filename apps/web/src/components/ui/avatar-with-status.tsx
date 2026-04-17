import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

interface AvatarWithStatusProps {
  name: string;
  imageUrl?: string;
  status?: 'online' | 'offline' | 'busy';
  className?: string;
}

export function AvatarWithStatus({
  name,
  imageUrl,
  status = 'offline',
  className,
}: AvatarWithStatusProps) {
  const initials = name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="relative">
      <Avatar className={cn(className)}>
        {imageUrl ? <AvatarImage src={imageUrl} alt={name} /> : null}
        <AvatarFallback>{initials || 'U'}</AvatarFallback>
      </Avatar>
      <span
        className={cn(
          'absolute bottom-0 right-0 h-3 w-3 rounded-full border border-background',
          status === 'online' && 'bg-green-600',
          status === 'busy' && 'bg-red-600',
          status === 'offline' && 'bg-muted-foreground',
        )}
      />
    </div>
  );
}
