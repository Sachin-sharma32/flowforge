import { RouteLoading } from '@/components/ui/route-loading';

export default function Loading() {
  return (
    <RouteLoading
      className="mx-auto my-8 min-h-[22rem] w-full max-w-md"
      label="Preparing secure access"
    />
  );
}
