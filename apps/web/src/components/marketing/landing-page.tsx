'use client';

import Link from 'next/link';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import {
  ArrowRight,
  BellRing,
  Blocks,
  CheckCircle2,
  Clock3,
  GitBranch,
  Rocket,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { setAccessToken } from '@/lib/auth-token-store';
import { api } from '@/lib/api-client';
import {
  TypographyH1,
  TypographyH2,
  TypographyH3,
  TypographyMuted,
  TypographySmall,
} from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface FeatureCard {
  title: string;
  description: string;
  icon: LucideIcon;
  label: string;
}

interface JourneyStep {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
}

const trustHighlights = [
  {
    value: 'Real-time',
    label: 'Socket-based execution updates',
  },
  {
    value: 'RBAC',
    label: 'Org to workspace role boundaries',
  },
  {
    value: 'BullMQ',
    label: 'Durable queued workflow runs',
  },
  {
    value: 'JWT + Rotation',
    label: 'Short-lived access and secure refresh',
  },
] as const;

const features: FeatureCard[] = [
  {
    title: 'Visual Builder',
    description:
      'Design automation flows with drag-and-drop nodes, configurable steps, and clear branching paths.',
    icon: Blocks,
    label: 'Builder Canvas',
  },
  {
    title: 'Live Execution Timeline',
    description:
      'Observe every step in motion with instant status updates for pending, running, completed, and failed jobs.',
    icon: BellRing,
    label: 'Realtime Monitoring',
  },
  {
    title: 'Branching Logic',
    description:
      'Combine condition, delay, transform, and action steps into resilient, event-driven orchestration.',
    icon: GitBranch,
    label: 'Flow Control',
  },
  {
    title: 'Secure Collaboration',
    description:
      'Structure organizations and workspaces with role-based permissions so teams ship safely at scale.',
    icon: ShieldCheck,
    label: 'Workspace Security',
  },
  {
    title: 'Automation Connectors',
    description:
      'Trigger from webhooks and coordinate HTTP requests, Slack, and email actions from one visual system.',
    icon: Workflow,
    label: 'Event Integrations',
  },
] as const;

const journey: JourneyStep[] = [
  {
    title: 'Trigger',
    description: 'Ingest events from webhooks or app signals and normalize context for your run.',
    icon: Sparkles,
    accent: 'bg-muted',
  },
  {
    title: 'Build',
    description: 'Compose the flow with conditions, transforms, and actions in the visual graph.',
    icon: Blocks,
    accent: 'bg-muted',
  },
  {
    title: 'Run',
    description: 'Queue executions through BullMQ with deterministic step handlers and retries.',
    icon: Rocket,
    accent: 'bg-muted',
  },
  {
    title: 'Observe',
    description: 'Track progress in real time and debug each execution from a timeline view.',
    icon: BellRing,
    accent: 'bg-muted',
  },
] as const;

const executionFeed = [
  {
    name: 'Webhook Trigger',
    detail: 'Received payload from Stripe checkout event',
    status: 'completed',
    elapsed: '42ms',
  },
  {
    name: 'Condition Branch',
    detail: 'Order total above threshold routed to VIP path',
    status: 'completed',
    elapsed: '16ms',
  },
  {
    name: 'HTTP Request',
    detail: 'Posting data to internal fulfillment API',
    status: 'running',
    elapsed: 'Live',
  },
  {
    name: 'Slack Message',
    detail: 'Notifying #ops about incoming VIP order',
    status: 'queued',
    elapsed: 'Queued',
  },
] as const;

const statBars = [78, 56, 91, 63, 88, 72] as const;
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const googleScriptId = 'google-identity-services';

interface GoogleCredentialResponse {
  credential?: string;
}

interface GoogleAccountsIdApi {
  cancel: () => void;
  initialize: (config: {
    callback: (response: GoogleCredentialResponse) => void;
    client_id: string;
    context?: 'signin' | 'signup' | 'use';
    use_fedcm_for_prompt?: boolean;
  }) => void;
  prompt: () => void;
}

interface GoogleAccountsApi {
  id: GoogleAccountsIdApi;
}

interface WindowWithGoogle extends Window {
  google?: {
    accounts?: GoogleAccountsApi;
  };
}

function SectionReveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 26 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{
        duration: shouldReduceMotion ? 0.05 : 0.75,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <TypographySmall className="text-[0.6875rem] font-semibold uppercase tracking-normal text-primary">
        {eyebrow}
      </TypographySmall>
      <TypographyH2 className="mt-3 text-3xl text-foreground sm:text-4xl">{title}</TypographyH2>
      <TypographyMuted className="mt-4 max-w-2xl leading-relaxed sm:text-base">
        {description}
      </TypographyMuted>
    </div>
  );
}

export function LandingPageExperience() {
  const heroRef = useRef<HTMLElement | null>(null);
  const oneTapInFlightRef = useRef(false);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOrbY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 140]);
  const heroOrbScale = useTransform(scrollYProgress, [0, 1], [1, shouldReduceMotion ? 1 : 1.2]);

  useEffect(() => {
    if (!googleClientId) {
      return;
    }

    let cancelled = false;

    const handleCredential = async ({ credential }: GoogleCredentialResponse) => {
      if (!credential || oneTapInFlightRef.current) {
        return;
      }

      oneTapInFlightRef.current = true;

      try {
        const { data } = await api.post('/auth/oauth/google/one-tap', { credential });
        const accessToken = data?.data?.tokens?.accessToken as string | undefined;
        if (!accessToken) {
          oneTapInFlightRef.current = false;
          return;
        }

        setAccessToken(accessToken);
        window.location.href = '/dashboard';
      } catch {
        oneTapInFlightRef.current = false;
      }
    };

    const initializeOneTap = () => {
      if (cancelled) {
        return;
      }

      const google = (window as WindowWithGoogle).google?.accounts?.id;
      if (!google) {
        return;
      }

      google.initialize({
        client_id: googleClientId,
        callback: handleCredential,
        context: 'signin',
        use_fedcm_for_prompt: true,
      });
      google.prompt();
    };

    const existingScript = document.getElementById(googleScriptId) as HTMLScriptElement | null;
    if (existingScript) {
      existingScript.addEventListener('load', initializeOneTap);
      initializeOneTap();

      return () => {
        cancelled = true;
        existingScript.removeEventListener('load', initializeOneTap);
        (window as WindowWithGoogle).google?.accounts?.id.cancel();
      };
    }

    const script = document.createElement('script');
    script.id = googleScriptId;
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.addEventListener('load', initializeOneTap);
    document.head.appendChild(script);

    return () => {
      cancelled = true;
      script.removeEventListener('load', initializeOneTap);
      (window as WindowWithGoogle).google?.accounts?.id.cancel();
    };
  }, []);

  return (
    <div className="bg-background relative min-h-screen overflow-x-clip">
      <div className="hidden pointer-events-none absolute inset-0" />
      <div className="hidden pointer-events-none absolute inset-0 opacity-30" />

      <motion.div
        aria-hidden
        style={{ y: heroOrbY, scale: heroOrbScale }}
        className="hidden pointer-events-none absolute -top-36 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2"
      />

      <PublicNavbar />

      <main>
        <section ref={heroRef} className="relative">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-16 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-24">
            <SectionReveal>
              <TypographySmall className="text-[0.6875rem] font-semibold uppercase tracking-normal text-primary">
                Automation Orchestration Platform
              </TypographySmall>
              <TypographyH1 className="mt-5 max-w-2xl text-5xl font-semibold leading-[1.04] sm:text-6xl lg:text-7xl">
                Build reliable workflows with
                <span className="text-foreground"> cinematic clarity</span>
              </TypographyH1>
              <TypographyMuted className="mt-6 max-w-xl text-base leading-relaxed sm:text-lg">
                FlowForge helps engineering and operations teams launch event-driven automations
                that are easy to build, secure to scale, and transparent to monitor in real time.
              </TypographyMuted>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="group">
                  <Link href="/register">
                    Start Building
                    <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Open Dashboard</Link>
                </Button>
              </div>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {trustHighlights.map((highlight, index) => (
                  <motion.div
                    key={highlight.label}
                    initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: shouldReduceMotion ? 0.05 : 0.5,
                      delay: 0.22 + index * 0.08,
                    }}
                    className="rounded-lg border border-border bg-card shadow-sm p-4"
                  >
                    <TypographySmall className="uppercase tracking-normal">
                      {highlight.label}
                    </TypographySmall>
                    <TypographySmall className="mt-2 text-sm font-semibold text-foreground">
                      {highlight.value}
                    </TypographySmall>
                  </motion.div>
                ))}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1} className="relative">
              <div className="rounded-lg border border-border bg-card shadow-sm relative overflow-hidden p-5 sm:p-6">
                <div className="absolute inset-x-0 top-0 h-36 bg-muted" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <TypographySmall className="uppercase tracking-normal text-primary">
                      Workflow Preview
                    </TypographySmall>
                    <TypographySmall className="mt-2 text-lg font-semibold">
                      Ecommerce Fulfillment Flow
                    </TypographySmall>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    Live
                  </div>
                </div>

                <div className="relative mt-6 space-y-3">
                  {[
                    { title: 'Webhook Trigger', status: 'completed', duration: '12ms' },
                    { title: 'Condition: VIP Order', status: 'completed', duration: '9ms' },
                    { title: 'HTTP Request: Fulfillment API', status: 'running', duration: '31ms' },
                    { title: 'Slack Notification', status: 'queued', duration: 'pending' },
                  ].map((step, index) => (
                    <motion.div
                      key={step.title}
                      animate={
                        shouldReduceMotion
                          ? undefined
                          : {
                              y: [0, -2, 0],
                            }
                      }
                      transition={{
                        repeat: shouldReduceMotion ? 0 : Infinity,
                        duration: 3.4,
                        delay: index * 0.3,
                        ease: 'easeInOut',
                      }}
                      className="rounded-xl border border-border bg-card p-3"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={step.status} />
                          <TypographySmall className="text-sm font-medium text-foreground">
                            {step.title}
                          </TypographySmall>
                        </div>
                        <TypographySmall>{step.duration}</TypographySmall>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-border bg-muted/45 p-4">
                  <TypographySmall className="uppercase tracking-normal">
                    Runtime snapshot
                  </TypographySmall>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
                    <StatPill label="Success" value="98.7%" />
                    <StatPill label="Avg Time" value="147ms" />
                    <StatPill label="Retries" value="0.9%" />
                  </div>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section id="features" className="mx-auto w-full max-w-7xl px-6 pb-8 pt-10 sm:pt-12">
          <SectionReveal>
            <SectionHeading
              eyebrow="Platform capabilities"
              title="Everything your automation stack needs in one visual surface"
              description="From builder ergonomics to runtime observability, FlowForge keeps your teams fast without sacrificing operational safety."
            />
          </SectionReveal>

          <div className="mt-10 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <SectionReveal key={feature.title} delay={index * 0.08}>
                  <motion.article
                    whileHover={
                      shouldReduceMotion
                        ? undefined
                        : {
                            y: -5,
                          }
                    }
                    transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    className="rounded-lg border border-border bg-card shadow-sm h-full p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <TypographySmall className="mt-4 uppercase tracking-normal">
                      {feature.label}
                    </TypographySmall>
                    <TypographyH3 className="mt-2">{feature.title}</TypographyH3>
                    <TypographyMuted className="mt-3 leading-relaxed">
                      {feature.description}
                    </TypographyMuted>
                  </motion.article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <div className="h-px bg-border mx-auto mt-16 w-full max-w-7xl px-6" />

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 pb-8 pt-16">
          <SectionReveal>
            <SectionHeading
              eyebrow="How it works"
              title="Trigger, build, run, and observe without context switching"
              description="FlowForge keeps each stage of workflow delivery connected, so product and platform teams collaborate on the same source of execution truth."
            />
          </SectionReveal>

          <div className="relative mt-10 grid gap-4 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-8 right-8 top-12 hidden h-px bg-muted    lg:block" />
            {journey.map((step, index) => {
              const Icon = step.icon;
              return (
                <SectionReveal key={step.title} delay={index * 0.08} className="relative">
                  <div className="rounded-lg border border-border bg-card shadow-sm h-full p-5">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl bg-muted text-primary ring-1 ring-border/70',
                        step.accent,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <TypographyH3 className="mt-4 text-xl">{step.title}</TypographyH3>
                    <TypographyMuted className="mt-3 leading-relaxed">
                      {step.description}
                    </TypographyMuted>
                  </div>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <section id="execution" className="mx-auto w-full max-w-7xl px-6 pb-10 pt-16">
          <SectionReveal>
            <SectionHeading
              eyebrow="Execution control"
              title="See every run unfold in a live operational narrative"
              description="Execution telemetry appears as an understandable story for humans, while retaining the technical fidelity your engineering team needs to debug quickly."
            />
          </SectionReveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <SectionReveal>
              <div className="rounded-lg border border-border bg-card shadow-sm relative overflow-hidden p-6">
                <div className="absolute inset-x-0 top-0 h-36 bg-muted" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <TypographySmall className="uppercase tracking-normal">
                      Live execution feed
                    </TypographySmall>
                    <TypographyH3 className="mt-2 text-xl">Production Pipeline 04</TypographyH3>
                  </div>
                  <TypographySmall className="rounded-full border border-border bg-muted px-3 py-1 font-medium text-foreground">
                    3 running
                  </TypographySmall>
                </div>

                <div className="relative z-10 mt-6 space-y-3">
                  {executionFeed.map((event, index) => (
                    <motion.div
                      key={event.name}
                      className="rounded-xl border border-border bg-background p-4"
                      initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 14 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{
                        duration: shouldReduceMotion ? 0.05 : 0.45,
                        delay: 0.12 + index * 0.08,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <TypographySmall className="text-sm font-semibold text-foreground">
                          {event.name}
                        </TypographySmall>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusDot status={event.status} />
                          <span className="capitalize">{event.status}</span>
                        </div>
                      </div>
                      <TypographyMuted className="mt-1">{event.detail}</TypographyMuted>
                      <TypographySmall className="mt-3 flex items-center gap-1">
                        <Clock3 className="h-3.5 w-3.5" />
                        {event.elapsed}
                      </TypographySmall>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="rounded-lg border border-border bg-card shadow-sm p-6">
                <TypographySmall className="uppercase tracking-normal text-primary">
                  Activity pulse
                </TypographySmall>
                <TypographyH3 className="mt-2 text-xl">Workflow throughput overview</TypographyH3>
                <TypographyMuted className="mt-2 leading-relaxed">
                  A concise control surface for execution velocity, success health, and queue
                  pressure.
                </TypographyMuted>

                <div className="mt-7 space-y-3">
                  {statBars.map((value, index) => (
                    <div key={`${value}-${index}`}>
                      <div className="mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Lane {index + 1}</span>
                        <span>{value}%</span>
                      </div>
                      <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          initial={{ width: 0 }}
                          whileInView={{ width: `${value}%` }}
                          viewport={{ once: true, amount: 0.8 }}
                          transition={{
                            duration: shouldReduceMotion ? 0.05 : 0.65,
                            delay: 0.2 + index * 0.07,
                            ease: [0.16, 1, 0.3, 1],
                          }}
                          className="h-full rounded-full bg-muted"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 rounded-xl border border-border bg-muted/45 p-4">
                  <TypographySmall className="text-sm font-medium">
                    Execution health
                  </TypographySmall>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      Mean completion time is stable below alert threshold.
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-foreground" />
                      Queue retry rate remains within expected baseline.
                    </li>
                  </ul>
                </div>
              </div>
            </SectionReveal>
          </div>
        </section>

        <section className="mx-auto w-full max-w-7xl px-6 pb-20 pt-16">
          <SectionReveal>
            <div className="rounded-lg border border-border bg-card shadow-sm relative overflow-hidden p-8 sm:p-10">
              {/* <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/15 " />
              <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-foreground/10 " /> */}

              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <TypographySmall className="text-[0.6875rem] font-semibold uppercase tracking-normal text-primary">
                    Ready to launch
                  </TypographySmall>
                  <TypographyH2 className="mt-3 max-w-2xl text-3xl sm:text-4xl">
                    Turn workflow complexity into a clear and reliable automation system
                  </TypographyH2>
                  <TypographyMuted className="mt-4 max-w-xl leading-relaxed sm:text-base">
                    Start with a workspace in minutes, build with visual confidence, and monitor
                    every production run from a single source of truth.
                  </TypographyMuted>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="group">
                    <Link href="/register">
                      Create Free Workspace
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link href="/login">Sign In</Link>
                  </Button>
                </div>
              </div>

              <div className="relative z-10 mt-6 text-sm text-muted-foreground">
                We currently use only essential auth/security cookies.{' '}
                <Link
                  href="/privacy"
                  className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
                >
                  View Privacy & Cookies
                </Link>
              </div>
            </div>
          </SectionReveal>
        </section>
      </main>
    </div>
  );
}

function StatusDot({ status }: { status: 'completed' | 'running' | 'queued' | string }) {
  if (status === 'completed') {
    return <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden />;
  }

  if (status === 'running') {
    return (
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-80" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    );
  }

  return <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" aria-hidden />;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-background px-2 py-2">
      <TypographyMuted>{label}</TypographyMuted>
      <TypographySmall className="mt-1 text-sm font-semibold text-foreground">
        {value}
      </TypographySmall>
    </div>
  );
}
