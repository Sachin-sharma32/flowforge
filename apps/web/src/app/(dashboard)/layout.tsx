import { buildPageMetadata } from '@/lib/seo';
import DashboardShell from './dashboard-shell';

export const dynamic = 'force-dynamic';

export const metadata = buildPageMetadata({
  title: 'Workspace Dashboard',
  description:
    'Track workflow health, execution trends, and operational metrics from your FlowForge workspace dashboard.',
  path: '/dashboard',
  noIndex: true,
});

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
