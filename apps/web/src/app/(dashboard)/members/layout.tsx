import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Members',
  description: 'Manage workspace members, roles, pending invites, and permissions in FlowForge.',
  path: '/members',
  noIndex: true,
});

export default function MembersLayout({ children }: { children: ReactNode }) {
  return children;
}
