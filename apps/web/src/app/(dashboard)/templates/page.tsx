'use client';

import { RefreshCcw, Sparkles, MessageSquare, Video, Trello } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FeedbackModal } from '@/components/ui/feedback-modal';
import { SuggestedWorkflowCard, type AppInfo } from '@/components/workflow/suggested-workflow-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/stores/hooks';
import { createWorkflow } from '@/stores/workflow-slice';
import { useToast } from '@/hooks/use-toast';

// ─── App Icons ───────────────────────────────────────────────────

const GCalIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" fill="white" stroke="#E0E0E0" strokeWidth="1" />
    <path d="M21 9H3V6C3 4.89543 3.89543 4 5 4H19C20.1046 4 21 4.89543 21 6V9Z" fill="#4285F4" />
    <path d="M3 9H8V20H5C3.89543 20 3 19.1046 3 18V9Z" fill="#34A853" />
    <path d="M21 9H16V20H19C20.1046 20 21 19.1046 21 18V9Z" fill="#FBBC04" />
    <path d="M8 9H16V20H8V9Z" fill="#EA4335" />
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="#E0E0E0" strokeWidth="1" />
  </svg>
);

const NotionIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      fillRule="evenodd"
      clipRule="evenodd"
      d="M19.5 4H4.5V20H19.5V4ZM3 2.5C3 1.67157 3.67157 1 4.5 1H19.5C20.3284 1 21 1.67157 21 2.5V21.5C21 22.3284 20.3284 23 19.5 23H4.5C3.67157 23 3 22.3284 3 21.5V2.5Z"
      fill="currentColor"
    />
    <path d="M8 6H10.5L16 14.5V6H18V18H15.5L10 9.5V18H8V6Z" fill="currentColor" />
  </svg>
);

const GmailIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <path
      d="M20 5H4C2.89543 5 2 5.89543 2 7V17C2 18.1046 2.89543 19 4 19H20C21.1046 19 22 18.1046 22 17V7C22 5.89543 21.1046 5 20 5Z"
      fill="white"
      stroke="#EA4335"
      strokeWidth="1.5"
    />
    <path
      d="M2.5 6.5L12 13L21.5 6.5"
      stroke="#EA4335"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const CalendlyIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="9" fill="white" stroke="#006BFF" strokeWidth="1.5" />
    <path
      d="M12 7V12L15 15"
      stroke="#006BFF"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// ─── Workflow Data ───────────────────────────────────────────────

type WorkflowCard = { id: string; title: string; apps: AppInfo[] };

const RECOMMENDED: WorkflowCard[] = [
  {
    id: '1',
    title: 'Create logged schedule items from updated calendar events',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Notion', icon: <NotionIcon />, verified: true },
    ],
  },
  {
    id: '2',
    title: 'Create meeting records from new calendar events in log',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Notion', icon: <NotionIcon />, verified: true },
    ],
  },
  {
    id: '3',
    title: 'Create event records from calendar every hour',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Notion', icon: <NotionIcon />, verified: true },
    ],
  },
  {
    id: '4',
    title: 'Sync new calendar attendees to Notion database',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Notion', icon: <NotionIcon />, verified: true },
    ],
  },
  {
    id: '11',
    title: 'Send failed workflow alerts to Slack and email',
    apps: [
      {
        name: 'Slack',
        icon: <MessageSquare className="w-3.5 h-3.5 text-pink-600" />,
        verified: true,
      },
      { name: 'Gmail', icon: <GmailIcon />, verified: true },
    ],
  },
  {
    id: '12',
    title: 'Auto-summarize customer updates into weekly digest docs',
    apps: [
      { name: 'Notion', icon: <NotionIcon />, verified: true },
      { name: 'Gmail', icon: <GmailIcon />, verified: true },
    ],
  },
];

const WORKS_WELL: WorkflowCard[] = [
  {
    id: '5',
    title: 'Add booked attendees to host calendar events instantly',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Calendly', icon: <CalendlyIcon /> },
    ],
  },
  {
    id: '6',
    title: 'Create booking task and performer outreach for paid events',
    apps: [
      { name: 'Gmail', icon: <GmailIcon />, verified: true },
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      {
        name: '+4',
        icon: null,
        extraApps: [
          { name: 'Slack', icon: <MessageSquare className="w-3.5 h-3.5 text-pink-600" /> },
          { name: 'Zoom', icon: <Video className="w-3.5 h-3.5 text-blue-500" /> },
          { name: 'Trello', icon: <Trello className="w-3.5 h-3.5 text-blue-700" /> },
          { name: 'Asana', icon: <div className="w-3.5 h-3.5 bg-red-400 rounded-full" /> },
        ],
      },
    ],
  },
  {
    id: '7',
    title: 'Create production calendar exports to spreadsheet rows',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Google Sheets', icon: <GCalIcon /> },
    ],
  },
];

const MARKETING: WorkflowCard[] = [
  {
    id: '8',
    title: 'Track new website leads in CRM instantly',
    apps: [
      { name: 'HubSpot', icon: <div className="h-3.5 w-3.5 bg-orange-500 rounded-full" /> },
      { name: 'Gmail', icon: <GmailIcon />, verified: true },
    ],
  },
  {
    id: '9',
    title: 'Send welcome email sequence to new newsletter subscribers',
    apps: [
      { name: 'Mailchimp', icon: <div className="h-3.5 w-3.5 bg-yellow-400 rounded-full" /> },
      { name: 'Slack', icon: <MessageSquare className="w-3.5 h-3.5 text-pink-600" /> },
    ],
  },
  {
    id: '10',
    title: 'Automatically post blog updates to company social media',
    apps: [
      { name: 'Notion', icon: <NotionIcon />, verified: true },
      { name: 'Twitter', icon: <div className="h-3.5 w-3.5 bg-sky-500 rounded-sm" /> },
    ],
  },
  {
    id: '13',
    title: 'Push high-intent lead signals to sales channel instantly',
    apps: [
      {
        name: 'Slack',
        icon: <MessageSquare className="w-3.5 h-3.5 text-pink-600" />,
        verified: true,
      },
      { name: 'Notion', icon: <NotionIcon />, verified: true },
    ],
  },
  {
    id: '14',
    title: 'Create webinar follow-up tasks and invite reminders',
    apps: [
      { name: 'Google Calendar', icon: <GCalIcon />, verified: true },
      { name: 'Gmail', icon: <GmailIcon />, verified: true },
    ],
  },
];

const FEATURED: WorkflowCard[] = [
  ...RECOMMENDED.slice(0, 3),
  ...WORKS_WELL.slice(0, 2),
  ...MARKETING.slice(0, 1),
];

// ─── Section Component ──────────────────────────────────────────

function WorkflowSection({
  title,
  titleNode,
  workflows,
  onDismiss,
  onUse,
  usingTemplateId,
}: {
  title: string;
  titleNode?: React.ReactNode;
  workflows: WorkflowCard[];
  onDismiss: (id: string) => void;
  onUse: (id: string) => void;
  usingTemplateId: string | null;
}) {
  if (workflows.length === 0) return null;
  return (
    <section className="w-full">
      <div className="mb-6">
        {titleNode ?? <h2 className="text-2xl font-bold tracking-tight">{title}</h2>}
      </div>
      <Carousel
        opts={{
          align: 'start',
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent>
          {workflows.map((wf) => (
            <CarouselItem key={wf.id} className="md:basis-1/2 xl:basis-1/3">
              <SuggestedWorkflowCard
                id={wf.id}
                title={wf.title}
                apps={wf.apps}
                onDismiss={onDismiss}
                onUse={onUse}
                isUsing={usingTemplateId === wf.id}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious />
        <CarouselNext />
      </Carousel>
    </section>
  );
}

// ─── Dismiss feedback options ───────────────────────────────────

const DISMISS_OPTIONS = [
  'Too complex',
  'Not relevant to my role',
  "Don't use these apps",
  'Already automated this',
  'Other',
];

// ─── Page ───────────────────────────────────────────────────────

export default function TemplatesPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentWorkspace } = useAppSelector((state) => state.workspace);
  const { toast } = useToast();

  const [recommended, setRecommended] = useState(RECOMMENDED);
  const [worksWell, setWorksWell] = useState(WORKS_WELL);
  const [marketing, setMarketing] = useState(MARKETING);
  const [dismissingId, setDismissingId] = useState<string | null>(null);
  const [usingTemplateId, setUsingTemplateId] = useState<string | null>(null);

  const handleDismissConfirm = (_reason: string) => {
    if (!dismissingId) return;
    setRecommended((prev) => prev.filter((w) => w.id !== dismissingId));
    setWorksWell((prev) => prev.filter((w) => w.id !== dismissingId));
    setMarketing((prev) => prev.filter((w) => w.id !== dismissingId));
    setDismissingId(null);
  };

  const handleUseTemplate = async (templateId: string) => {
    if (!currentWorkspace?.id) return;

    const allTemplates = [...RECOMMENDED, ...WORKS_WELL, ...MARKETING];
    const template = allTemplates.find((t) => t.id === templateId);
    if (!template) return;

    setUsingTemplateId(templateId);
    try {
      const result = await dispatch(
        createWorkflow({
          workspaceId: currentWorkspace.id,
          input: {
            name: template.title,
            description: '',
            trigger: { type: 'manual', config: {} },
            steps: [],
          },
        }),
      ).unwrap();

      const workflowId = result.id || (result as { _id?: string })._id;
      if (!workflowId) {
        throw new Error('Workflow was created but no ID was returned.');
      }
      router.push(`/workflows/${workflowId}/edit`);
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Failed to create workflow',
        description: err instanceof Error ? err.message : 'Please try again.',
      });
      setUsingTemplateId(null);
    }
  };

  return (
    <div className="mx-auto w-full space-y-16 pb-24 animate-in fade-in duration-500">
      {/* ── Hero header ── */}
      <div className="stagger-fade-in pt-4" style={{ animationDelay: '0ms' }}>
        <div className="flex items-center gap-4 mb-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/70 shadow-glow">
            <Sparkles className="h-6 w-6 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Workflow Templates</h1>
            <p className="text-base text-muted-foreground mt-1">
              Start fast with pre-built automations — customize any template to match your exact
              needs.
            </p>
          </div>
        </div>
      </div>

      {/* ── Sections ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-2xl font-bold tracking-tight">Featured This Week</h2>
          <p className="text-sm text-muted-foreground">
            Quick-start templates curated for high-velocity teams.
          </p>
        </div>
        <Carousel
          opts={{
            align: 'start',
            loop: false,
          }}
          className="w-full"
        >
          <CarouselContent>
            {FEATURED.map((template) => (
              <CarouselItem key={template.id} className="md:basis-1/2 xl:basis-1/3">
                <SuggestedWorkflowCard
                  id={template.id}
                  title={template.title}
                  apps={template.apps}
                  onDismiss={setDismissingId}
                  onUse={handleUseTemplate}
                  isUsing={usingTemplateId === template.id}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious />
          <CarouselNext />
        </Carousel>
      </section>

      <WorkflowSection
        title="Recommended for you"
        workflows={recommended}
        onDismiss={setDismissingId}
        onUse={handleUseTemplate}
        usingTemplateId={usingTemplateId}
      />

      <WorkflowSection
        title="Works well with Google Calendar"
        titleNode={
          <div className="flex flex-wrap items-center gap-4">
            <h2 className="flex flex-wrap items-center gap-2.5 text-2xl font-bold tracking-tight">
              Works well with
              <span className="inline-flex items-center gap-1.5 text-xl font-semibold">
                <GCalIcon className="h-5 w-5" />
                Google Calendar
              </span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-primary hover:text-primary/80"
            >
              <RefreshCcw className="h-4 w-4" />
              Change App
            </Button>
          </div>
        }
        workflows={worksWell}
        onDismiss={setDismissingId}
        onUse={handleUseTemplate}
        usingTemplateId={usingTemplateId}
      />

      <WorkflowSection
        title="Marketing &amp; Leads"
        workflows={marketing}
        onDismiss={setDismissingId}
        onUse={handleUseTemplate}
        usingTemplateId={usingTemplateId}
      />

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
