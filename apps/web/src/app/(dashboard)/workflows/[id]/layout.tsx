import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

interface WorkflowLayoutProps {
  children: ReactNode;
  params: { id: string };
}

function compactId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

export function generateMetadata({ params }: WorkflowLayoutProps): Metadata {
  const safeId = encodeURIComponent(params.id);

  return buildPageMetadata({
    title: `Workflow ${compactId(params.id)}`,
    description: 'Inspect workflow structure, trigger configuration, and execution controls.',
    path: `/workflows/${safeId}`,
    noIndex: true,
  });
}

export default function WorkflowDetailLayout({ children }: WorkflowLayoutProps) {
  return children;
}
