import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <Skeleton className="h-8 w-32" />

      {/* Form fields */}
      <div className="flex max-w-lg flex-col gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
        <Skeleton className="mt-2 h-9 w-24 rounded-md" />
      </div>
    </div>
  );
}
