import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

interface WorkflowEditLayoutProps {
  children: ReactNode;
  params: { id: string };
}

function compactId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

export function generateMetadata({ params }: WorkflowEditLayoutProps): Metadata {
  const safeId = encodeURIComponent(params.id);

  return buildPageMetadata({
    title: `Edit Workflow ${compactId(params.id)}`,
    description:
      'Modify workflow nodes, step configuration, and branching logic in the visual editor.',
    path: `/workflows/${safeId}/edit`,
    noIndex: true,
  });
}

export default function WorkflowEditLayout({ children }: WorkflowEditLayoutProps) {
  return children;
}
