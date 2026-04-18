import { Skeleton } from '@/components/ui/skeleton';

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6">
      {/* KPI cards row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4">
            <Skeleton className="mb-2 h-4 w-24" />
            <Skeleton className="mb-1 h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>

      {/* Chart placeholders */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-lg border p-4">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
        <div className="rounded-lg border p-4">
          <Skeleton className="mb-4 h-5 w-32" />
          <Skeleton className="h-48 w-full" />
        </div>
      </div>

      {/* Alerts list */}
      <div className="rounded-lg border p-4">
        <Skeleton className="mb-4 h-5 w-28" />
        <div className="flex flex-col gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="ml-auto h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
