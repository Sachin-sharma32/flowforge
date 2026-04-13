import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Create Workflow',
  description:
    'Create a new FlowForge workflow with triggers and action steps tailored to your automation needs.',
  path: '/workflows/new',
  noIndex: true,
});

export default function NewWorkflowLayout({ children }: { children: ReactNode }) {
  return children;
}
