'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { DotIcon } from 'lucide-react';

const LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  workflows: 'Workflows',
  executions: 'Executions',
  settings: 'Settings',
  members: 'Members',
  folders: 'Folders',
  templates: 'Templates',
  new: 'New',
  edit: 'Edit',
};

function labelFor(segment: string) {
  if (LABELS[segment]) return LABELS[segment];
  if (/^[0-9a-fA-F-]{8,}$/.test(segment)) return 'Detail';
  return segment.charAt(0).toUpperCase() + segment.slice(1);
}

export function DashboardBreadcrumbs() {
  const pathname = usePathname();

  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return null;

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {segments.map((segment, index) => {
          const href = `/${segments.slice(0, index + 1).join('/')}`;
          const isLast = index === segments.length - 1;

          return (
            <React.Fragment key={href}>
              <BreadcrumbItem>
                {index > 0 ? (
                  <BreadcrumbSeparator>
                    <DotIcon />
                  </BreadcrumbSeparator>
                ) : null}
                {isLast ? (
                  <BreadcrumbPage>{labelFor(segment)}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link href={href}>{labelFor(segment)}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
