import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Executions',
  description:
    'Review workflow execution runs, statuses, durations, and recent operational activity.',
  path: '/executions',
  noIndex: true,
});

export default function ExecutionsLayout({ children }: { children: ReactNode }) {
  return children;
}
