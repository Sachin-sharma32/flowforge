import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

interface ExecutionLayoutProps {
  children: ReactNode;
  params: { id: string };
}

function compactId(id: string): string {
  return id.length > 10 ? `${id.slice(0, 10)}...` : id;
}

export function generateMetadata({ params }: ExecutionLayoutProps): Metadata {
  const safeId = encodeURIComponent(params.id);

  return buildPageMetadata({
    title: `Execution ${compactId(params.id)}`,
    description: 'Inspect step-by-step execution logs, payloads, and outcomes for this run.',
    path: `/executions/${safeId}`,
    noIndex: true,
  });
}

export default function ExecutionDetailLayout({ children }: ExecutionLayoutProps) {
  return children;
}
