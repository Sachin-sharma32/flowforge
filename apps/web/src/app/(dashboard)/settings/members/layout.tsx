import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Workspace Members',
  description: 'Manage workspace member access, roles, and collaboration permissions in FlowForge.',
  path: '/settings/members',
  noIndex: true,
});

export default function SettingsMembersLayout({ children }: { children: ReactNode }) {
  return children;
}
