'use client';

import { Sparkles, Shield, Search, ChevronRight, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from '@/components/ui/feedback-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useEffect, useMemo, useState } from 'react';
import { TypographyH1, TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { dismissTemplate, fetchTemplates } from '@/stores/workflow-slice';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  ViewToggle,
  getStoredViewMode,
  storeViewMode,
  type ViewMode,
} from '@/components/ui/view-toggle';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Empty, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import {
  TEMPLATE_CATEGORY_LABELS,
  TEMPLATE_FILTER_CATEGORIES,
  TemplateCategory,
  type IWorkflowListItem,
  type TemplateCategoryType,
} from '@flowforge/shared';
import { cn } from '@/lib/utils';
import { MoreVertical } from 'lucide-react';

const DISMISS_OPTIONS = [
  'Too complex',
  'Not relevant to my role',
  "Don't use these apps",
  'Already automated this',
  'Other',
];

type CategoryFilter = 'all' | TemplateCategoryType;

function formatUses(count: number): string {
  if (count < 1000) return String(count);
  const rounded = Math.round((count / 1000) * 10) / 10;
  return `${rounded.toFixed(rounded >= 10 ? 0 : 1)}K`;
}

function TemplateCard({
  template,
  featured,
  onUse,
  onDismiss,
}: {
  template: IWorkflowListItem;
  featured?: boolean;
  onUse: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const category = (template.category || 'other') as TemplateCategoryType;
  const categoryLabel = TEMPLATE_CATEGORY_LABELS[category] ?? 'Other';
  const uses = template.useCount ?? 0;

  return (
    <Card
      className={cn(
        'group flex h-full flex-col justify-between transition-all hover:border-primary/30 hover:shadow-md',
        featured && 'bg-card/80',
      )}
    >
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-xs font-normal">
              {categoryLabel}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7">
                  <MoreVertical className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onDismiss(template.id)}>
                  Dismiss from recommendations
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="space-y-1.5">
          <h3 className="text-sm font-semibold leading-tight">{template.name}</h3>
          <TypographySmall className="line-clamp-2">
            {template.description || 'No description provided.'}
          </TypographySmall>
        </div>
      </CardContent>

      <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
        <TypographySmall className="tabular-nums">
          {formatUses(uses)} {uses === 1 ? 'use' : 'uses'}
        </TypographySmall>
        <Button variant="outline" size="sm" className="h-8" onClick={() => onUse(template.id)}>
          Use template
          <ChevronRight className="ml-1 h-3.5 w-3.5" />
        </Button>
      </div>
    </Card>
  );
}

export default function TemplatesPage() {
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { templates, isLoadingTemplates } = useAppSelector((state) => state.workflow);
  const { user } = useAppSelector((state) => state.auth);
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>(() => getStoredViewMode('templates'));

  useEffect(() => {
    if (currentWorkspace?.id) {
      dispatch(fetchTemplates({ workspaceId: currentWorkspace.id }));
    }
  }, [currentWorkspace?.id, dispatch]);

  const handleDismissConfirm = async (_reason: string) => {
    if (!dismissingId || !currentWorkspace?.id) return;
    try {
      await dispatch(
        dismissTemplate({ workspaceId: currentWorkspace.id, templateId: dismissingId }),
      ).unwrap();
      toast.success('Template dismissed');
    } catch (error) {
      toast.error('Failed to dismiss template', {
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setDismissingId(null);
    }
  };

  const handleUseTemplate = (templateId: string) => {
    router.push(`/workflows/new?templateId=${encodeURIComponent(templateId)}`);
  };

  const normalizedSearch = search.trim().toLowerCase();

  const filteredTemplates = useMemo(() => {
    return templates.filter((template) => {
      if (normalizedSearch) {
        const haystack = `${template.name} ${template.description ?? ''}`.toLowerCase();
        if (!haystack.includes(normalizedSearch)) return false;
      }
      if (activeFilter === 'all') return true;
      return (template.category ?? 'other') === activeFilter;
    });
  }, [templates, normalizedSearch, activeFilter]);

  const featuredTemplates = useMemo(
    () =>
      filteredTemplates
        .filter((template) => (template.category ?? 'other') === TemplateCategory.FEATURED)
        .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0)),
    [filteredTemplates],
  );

  const otherTemplates = useMemo(
    () =>
      filteredTemplates
        .filter((template) => (template.category ?? 'other') !== TemplateCategory.FEATURED)
        .sort((a, b) => (b.useCount ?? 0) - (a.useCount ?? 0)),
    [filteredTemplates],
  );

  return (
    <div className="space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <TypographyH1>Templates</TypographyH1>
          <TypographyMuted className="mt-1.5">
            Start from a workflow that&apos;s already shaped for the job. Fork, rename, connect
            credentials, publish.
          </TypographyMuted>
        </div>
        <div className="flex items-center gap-2">
          <ViewToggle
            value={viewMode}
            onChange={(mode) => {
              setViewMode(mode);
              storeViewMode('templates', mode);
            }}
          />
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {isSuperAdmin && (
            <Button
              onClick={() => router.push('/admin/templates/new')}
              className="gap-2"
              variant="outline"
            >
              <Shield className="h-4 w-4" />
              Create Template
            </Button>
          )}
        </div>
      </div>

      {/* ── Category pills ── */}
      <div className="flex flex-wrap items-center gap-2">
        <CategoryPill
          label="All"
          active={activeFilter === 'all'}
          onClick={() => setActiveFilter('all')}
        />
        {TEMPLATE_FILTER_CATEGORIES.map((category) => (
          <CategoryPill
            key={category}
            label={TEMPLATE_CATEGORY_LABELS[category]}
            active={activeFilter === category}
            onClick={() => setActiveFilter(category)}
          />
        ))}
      </div>

      {isLoadingTemplates ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="py-16">
            <Empty>
              <EmptyMedia>
                <LayoutTemplate className="h-11 w-11" />
              </EmptyMedia>
              <EmptyTitle>No templates match your filters</EmptyTitle>
              <EmptyDescription>Try a different category, or clear your search.</EmptyDescription>
            </Empty>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="space-y-10">
          {/* ── Featured section ── */}
          {featuredTemplates.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                <Sparkles className="h-3.5 w-3.5" />
                Featured
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {featuredTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    featured
                    onUse={handleUseTemplate}
                    onDismiss={setDismissingId}
                  />
                ))}
              </div>
            </section>
          )}

          {/* ── All templates section ── */}
          {otherTemplates.length > 0 && (
            <section className="space-y-3">
              <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                All templates · {otherTemplates.length}
              </div>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {otherTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onUse={handleUseTemplate}
                    onDismiss={setDismissingId}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Template</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uses</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTemplates.map((template) => {
                const category = (template.category || 'other') as TemplateCategoryType;
                const uses = template.useCount ?? 0;
                return (
                  <TableRow key={template.id}>
                    <TableCell>
                      <div className="flex items-start gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-medium">{template.name}</div>
                          {template.description ? (
                            <p className="truncate text-xs text-muted-foreground">
                              {template.description}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">
                        {TEMPLATE_CATEGORY_LABELS[category] ?? 'Other'}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums text-muted-foreground">
                      {formatUses(uses)} {uses === 1 ? 'use' : 'uses'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8"
                        onClick={() => handleUseTemplate(template.id)}
                      >
                        Use template
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* ── Dismiss feedback modal ── */}
      {dismissingId && (
        <FeedbackModal
          title="Why isn't this relevant?"
          description="Help us improve your recommendations by telling us why you are dismissing this card."
          options={DISMISS_OPTIONS}
          confirmLabel="Dismiss card"
          onConfirm={handleDismissConfirm}
          onClose={() => setDismissingId(null)}
        />
      )}
    </div>
  );
}

function CategoryPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground',
      )}
    >
      {label}
    </button>
  );
}
