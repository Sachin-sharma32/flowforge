'use client';

import React, { useState } from 'react';
import { MoreVertical, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// --- Verified check icon --- //

const VerifiedIcon = () => (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="hsl(var(--success))"
    xmlns="http://www.w3.org/2000/svg"
  >
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
        className="gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg border-border/60 bg-muted/30 text-foreground/80 hover:bg-muted cursor-default"
      >
        {app.name}
      </Badge>
      {showExtra && app.extraApps && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 flex flex-col gap-1.5 rounded-xl border border-border/60 bg-popover p-3 shadow-soft-lg z-20 whitespace-nowrap animate-in fade-in zoom-in-95 duration-100 min-w-[160px]">
          <p className="label-uppercase text-muted-foreground px-1 pb-1 border-b border-border/50">
            Also connects to
          </p>
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
    <div className="group relative flex h-full min-h-[220px] flex-col rounded-3xl border border-border/60 bg-card/80 text-card-foreground shadow-soft backdrop-blur-xl supports-[backdrop-filter]:bg-card/60 p-7 transition-all duration-300 ease-spring cursor-pointer hover:shadow-soft-lg hover:border-border">
      {/* Title + menu */}
      <div className="mb-auto flex items-start justify-between gap-3">
        <h3 className="text-lg font-semibold leading-snug tracking-tight text-foreground line-clamp-3">
          {title}
        </h3>
        <div
          className="relative shrink-0"
          tabIndex={-1}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDropdown(false);
          }}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => setIsDropdown(!isDropdown)}
          >
            <MoreVertical className="h-4.5 w-4.5" />
          </Button>
          {isDropdown && (
            <div className="absolute right-0 top-9 w-36 rounded-xl border border-border/60 bg-popover p-1 shadow-soft-lg z-10 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDropdown(false);
                  onDismiss?.(id);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
              >
                <X className="h-4 w-4" /> Dismiss
              </button>
            </div>
          )}
        </div>
      </div>

      {/* App badges */}
      <div className="mt-6">
        <p className="mb-3 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          Works great with
        </p>
        <div className="flex flex-wrap gap-2.5">
          {apps.map((app, i) => {
            if (app.extraApps) {
              return <ExtraAppsBadge key={i} app={app} />;
            }
            return (
              <Badge
                key={i}
                variant="outline"
                className="gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg border-border/60 bg-background/50 text-foreground/80 hover:bg-muted"
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
