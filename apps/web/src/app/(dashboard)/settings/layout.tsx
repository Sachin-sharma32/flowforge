import type { ReactNode } from 'react';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'Workspace Settings',
  description:
    'Update workspace profile, billing preferences, and account-level automation settings.',
  path: '/settings',
  noIndex: true,
});

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return children;
}
