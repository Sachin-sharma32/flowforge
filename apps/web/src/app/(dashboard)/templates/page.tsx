'use client';

import { Sparkles, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from '@/components/ui/feedback-modal';
import { SuggestedWorkflowCard } from '@/components/workflow/suggested-workflow-card';
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import React, { useEffect, useMemo, useState } from 'react';
import { TypographyH1, TypographyH2, TypographyMuted } from '@/components/ui/typography';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { dismissTemplate, fetchTemplates } from '@/stores/workflow-slice';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

const TEMPLATE_CATEGORY_LABELS: Record<string, string> = {
  featured: 'Featured',
  recommended: 'Recommended',
  productivity: 'Productivity',
  marketing: 'Marketing',
  sales: 'Sales',
  operations: 'Operations',
  developer: 'Developer',
  other: 'Other',
};

// ─── Dismiss feedback options ───────────────────────────────────

const DISMISS_OPTIONS = [
  'Too complex',
  'Not relevant to my role',
  "Don't use these apps",
  'Already automated this',
  'Other',
];

// ─── Page ───────────────────────────────────────────────────────

// Component to render a category section
function TemplateCategorySection({
  title,
  templates,
  onDismiss,
  onUse,
  isGlobal = false,
}: {
  title: string;
  templates: Array<{ id: string; name: string; category?: string }>;
  onDismiss: (id: string) => void;
  onUse: (id: string) => void;
  isGlobal?: boolean;
}) {
  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [showCarouselControls, setShowCarouselControls] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;

    const syncControlVisibility = () => {
      setShowCarouselControls(carouselApi.canScrollPrev() || carouselApi.canScrollNext());
    };

    syncControlVisibility();
    carouselApi.on('reInit', syncControlVisibility);
    carouselApi.on('select', syncControlVisibility);

    return () => {
      carouselApi.off('reInit', syncControlVisibility);
      carouselApi.off('select', syncControlVisibility);
    };
  }, [carouselApi]);

  if (templates.length === 0) return null;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <TypographyH2>{title}</TypographyH2>
        {isGlobal && (
          <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            <Shield className="mr-1 h-3 w-3" />
            Global
          </span>
        )}
      </div>
      <Carousel opts={{ align: 'start', loop: false }} setApi={setCarouselApi} className="w-full">
        <CarouselContent>
          {templates.map((template) => (
            <CarouselItem key={template.id} className="basis-full sm:basis-1/2 xl:basis-1/3">
              <SuggestedWorkflowCard
                id={template.id}
                title={template.name}
                apps={[]}
                onDismiss={onDismiss}
                onUse={onUse}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        {showCarouselControls && (
          <>
            <CarouselPrevious />
            <CarouselNext />
          </>
        )}
      </Carousel>
    </section>
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

  const visibleTemplates = templates;

  // Group templates by category
  const templatesByCategory = useMemo(() => {
    const grouped: Record<string, typeof visibleTemplates> = {};

    // Initialize all categories
    Object.keys(TEMPLATE_CATEGORY_LABELS).forEach((key) => {
      grouped[key] = [];
    });

    // Group templates
    visibleTemplates.forEach((template) => {
      const category = template.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(template);
    });

    return grouped;
  }, [visibleTemplates]);

  // Define category display order
  const categoryOrder = [
    'featured',
    'recommended',
    'productivity',
    'marketing',
    'sales',
    'operations',
    'developer',
    'other',
  ];

  // Check if there are any templates
  const hasTemplates = visibleTemplates.length > 0;

  return (
    <div className="mx-auto w-full space-y-16 pb-24 animate-in fade-in duration-500">
      {/* ── Hero header ── */}
      <div className="animate-in fade-in-0 pt-4" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-muted shadow-sm">
              <Sparkles className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <TypographyH1>Workflow Templates</TypographyH1>
              <TypographyMuted className="text-base mt-1">
                Start fast with pre-built automations — customize any template to match your exact
                needs.
              </TypographyMuted>
            </div>
          </div>
          <div className="flex gap-2">
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
      </div>

      {/* ── Database templates ── */}
      {isLoadingTemplates ? (
        <div className="flex items-center justify-center py-16">
          <TypographyMuted>Loading templates...</TypographyMuted>
        </div>
      ) : hasTemplates ? (
        <div className="space-y-12">
          {categoryOrder.map((categoryKey) => {
            const categoryTemplates = templatesByCategory[categoryKey] || [];
            if (categoryTemplates.length === 0) return null;

            const isGlobal = categoryTemplates.some((t) => t.isGlobalTemplate);

            return (
              <TemplateCategorySection
                key={categoryKey}
                title={TEMPLATE_CATEGORY_LABELS[categoryKey]}
                templates={categoryTemplates}
                onDismiss={setDismissingId}
                onUse={handleUseTemplate}
                isGlobal={isGlobal}
              />
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 space-y-4">
          <TypographyMuted>No templates available in your workspace.</TypographyMuted>
        </div>
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
