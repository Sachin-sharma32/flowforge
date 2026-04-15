import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Templates',
  description: 'Browse pre-built automation templates and customize them for your workspace.',
  path: '/templates',
  noIndex: true,
});

export default function TemplatesLayout({ children }: { children: ReactNode }) {
  return children;
}
