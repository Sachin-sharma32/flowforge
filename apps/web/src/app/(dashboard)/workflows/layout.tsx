import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Workflows',
  description: 'Manage, search, and organize automation workflows across your FlowForge workspace.',
  path: '/workflows',
  noIndex: true,
});

export default function WorkflowsLayout({ children }: { children: ReactNode }) {
  return children;
}
