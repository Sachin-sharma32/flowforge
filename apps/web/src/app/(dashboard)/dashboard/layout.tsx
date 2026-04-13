import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Dashboard Overview',
  description:
    'Get an at-a-glance view of workflow throughput, success rates, and recent execution activity.',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardOverviewLayout({ children }: { children: ReactNode }) {
  return children;
}
