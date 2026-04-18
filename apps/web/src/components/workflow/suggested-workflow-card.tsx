'use client';

import React, { useState } from 'react';
import { MoreVertical, TrashIcon, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { TypographyH3, TypographyMuted, TypographySmall } from '@/components/ui/typography';

// --- Verified check icon --- //

const VerifiedIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="#10b981" xmlns="http://www.w3.org/2000/svg">
    <circle cx="12" cy="12" r="10" />
    <path
      d="M8 12.5L10.5 15L16 9"
      stroke="white"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// --- Types --- //

export type AppInfo = {
  name: string;
  icon: React.ReactNode;
  verified?: boolean;
  /** When present, this app entry is treated as a "+N" overflow badge */
  extraApps?: { name: string; icon: React.ReactNode }[];
};

export interface SuggestedWorkflowCardProps {
  id: string;
  title: string;
  apps: AppInfo[];
  /** Called when the user clicks "Dismiss" from the 3-dot menu */
  onDismiss?: (id: string) => void;
}

// --- Sub-components --- //

function ExtraAppsBadge({ app }: { app: AppInfo }) {
  const [showExtra, setShowExtra] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setShowExtra(true)}
      onMouseLeave={() => setShowExtra(false)}
    >
      <Badge
        variant="outline"
        className="gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border-border bg-muted/30 text-foreground/80 hover:bg-muted cursor-default"
      >
        {app.name}
      </Badge>
      {showExtra && app.extraApps && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-1.5 rounded-xl border border-border bg-popover p-3 shadow-sm z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 min-w-[160px]">
          <TypographySmall className="text-[0.6875rem] font-semibold uppercase tracking-normal text-muted-foreground px-1 pb-1 border-b border-border">
            Also connects to
          </TypographySmall>
          {app.extraApps.map((ea) => (
            <div
              key={ea.name}
              className="flex items-center gap-2.5 text-sm font-medium px-1 py-1 text-foreground/80"
            >
              {ea.icon} <span>{ea.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// --- Main card --- //

export function SuggestedWorkflowCard({ id, title, apps, onDismiss }: SuggestedWorkflowCardProps) {
  const [isDropdown, setIsDropdown] = useState(false);

  return (
    <div className="group relative flex h-full flex-col rounded-lg border border-border bg-card text-card-foreground shadow-sm p-7 transition-all duration-300 ease-out cursor-pointer hover:shadow-sm hover:border-border">
      {/* Title + menu */}
      <div className="mb-auto flex items-start justify-between gap-3">
        <TypographyH3 className="leading-snug text-foreground line-clamp-3">{title}</TypographyH3>
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full"
              onClick={() => setIsDropdown(!isDropdown)}
            >
              <MoreVertical className="h-4.5 w-4.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuGroup>
              <DropdownMenuItem variant="destructive">
                <TrashIcon />
                Dismiss
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* App badges */}
      <div className="mt-6">
        <TypographyMuted className="mb-3 text-xs font-medium uppercase tracking-wider">
          Works great with
        </TypographyMuted>
        <div className="flex flex-wrap gap-2.5">
          {apps.map((app, i) => {
            if (app.extraApps) {
              return <ExtraAppsBadge key={i} app={app} />;
            }
            return (
              <Badge
                key={i}
                variant="outline"
                className="gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border-border bg-background text-foreground/80 hover:bg-muted"
              >
                {app.icon}
                <span>{app.name}</span>
                {app.verified && <VerifiedIcon />}
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}
