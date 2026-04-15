import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Folders',
  description: 'Organize workflows into folders and configure role-based folder access controls.',
  path: '/folders',
  noIndex: true,
});

export default function FoldersLayout({ children }: { children: ReactNode }) {
  return children;
}
