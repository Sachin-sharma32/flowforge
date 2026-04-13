import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Create Account',
  description:
    'Create a FlowForge account and start designing visual workflows with real-time execution observability.',
  path: '/register',
  noIndex: true,
});

export default function RegisterLayout({ children }: { children: ReactNode }) {
  return children;
}
