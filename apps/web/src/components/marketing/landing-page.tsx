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
import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { cn } from '@/lib/utils';

interface LandingPageExperienceProps {
  headingFontClassName: string;
}

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
    accent: 'from-primary/25 to-primary/5',
  },
  {
    title: 'Build',
    description: 'Compose the flow with conditions, transforms, and actions in the visual graph.',
    icon: Blocks,
    accent: 'from-info/25 to-info/5',
  },
  {
    title: 'Run',
    description: 'Queue executions through BullMQ with deterministic step handlers and retries.',
    icon: Rocket,
    accent: 'from-success/20 to-success/5',
  },
  {
    title: 'Observe',
    description: 'Track progress in real time and debug each execution from a timeline view.',
    icon: BellRing,
    accent: 'from-warning/25 to-warning/5',
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
  headingFontClassName,
}: {
  eyebrow: string;
  title: string;
  description: string;
  className?: string;
  headingFontClassName: string;
}) {
  return (
    <div className={className}>
      <p className="label-uppercase text-primary">{eyebrow}</p>
      <h2
        className={cn(
          'mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl',
          headingFontClassName,
        )}
      >
        {title}
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}

export function LandingPageExperience({ headingFontClassName }: LandingPageExperienceProps) {
  const heroRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });

  const heroOrbY = useTransform(scrollYProgress, [0, 1], [0, shouldReduceMotion ? 0 : 140]);
  const heroOrbScale = useTransform(scrollYProgress, [0, 1], [1, shouldReduceMotion ? 1 : 1.2]);

  return (
    <div className="landing-shell relative min-h-screen overflow-x-clip">
      <div className="landing-grid-overlay pointer-events-none absolute inset-0" />
      <div className="landing-noise-overlay pointer-events-none absolute inset-0 opacity-30" />

      <motion.div
        aria-hidden
        style={{ y: heroOrbY, scale: heroOrbScale }}
        className="landing-spotlight pointer-events-none absolute -top-36 left-1/2 h-[36rem] w-[36rem] -translate-x-1/2"
      />

      <PublicNavbar />

      <main>
        <section ref={heroRef} className="relative">
          <div className="mx-auto grid w-full max-w-7xl gap-14 px-6 pb-16 pt-20 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:pb-24 lg:pt-24">
            <SectionReveal>
              <p className="label-uppercase text-primary">Automation Orchestration Platform</p>
              <h1
                className={cn(
                  'mt-5 max-w-2xl text-5xl font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-7xl',
                  headingFontClassName,
                )}
              >
                Build reliable workflows with
                <span className="landing-gradient-text"> cinematic clarity</span>
              </h1>
              <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                FlowForge helps engineering and operations teams launch event-driven automations
                that are easy to build, secure to scale, and transparent to monitor in real time.
              </p>

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
                    className="landing-panel p-4"
                  >
                    <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {highlight.label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">{highlight.value}</p>
                  </motion.div>
                ))}
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1} className="relative">
              <div className="landing-panel relative overflow-hidden p-5 sm:p-6">
                <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-primary/15 to-transparent" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-primary">
                      Workflow Preview
                    </p>
                    <p className="mt-2 text-lg font-semibold">Ecommerce Fulfillment Flow</p>
                  </div>
                  <div className="flex items-center gap-1 rounded-full border border-success/30 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    <span className="h-2 w-2 rounded-full bg-success" />
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
                      className="rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <StatusDot status={step.status} />
                          <p className="text-sm font-medium text-foreground">{step.title}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{step.duration}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-5 rounded-xl border border-border/50 bg-muted/45 p-4">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Runtime snapshot
                  </p>
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
              headingFontClassName={headingFontClassName}
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
                    className="landing-panel h-full p-5"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-info/15 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-4 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                      {feature.label}
                    </p>
                    <h3 className="mt-2 text-lg font-semibold tracking-tight">{feature.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                  </motion.article>
                </SectionReveal>
              );
            })}
          </div>
        </section>

        <div className="landing-divider mx-auto mt-16 w-full max-w-7xl px-6" />

        <section id="how-it-works" className="mx-auto w-full max-w-7xl px-6 pb-8 pt-16">
          <SectionReveal>
            <SectionHeading
              eyebrow="How it works"
              title="Trigger, build, run, and observe without context switching"
              description="FlowForge keeps each stage of workflow delivery connected, so product and platform teams collaborate on the same source of execution truth."
              headingFontClassName={headingFontClassName}
            />
          </SectionReveal>

          <div className="relative mt-10 grid gap-4 lg:grid-cols-4">
            <div className="pointer-events-none absolute left-8 right-8 top-12 hidden h-px bg-gradient-to-r from-primary/40 via-info/40 to-success/40 lg:block" />
            {journey.map((step, index) => {
              const Icon = step.icon;
              return (
                <SectionReveal key={step.title} delay={index * 0.08} className="relative">
                  <div className="landing-panel h-full p-5">
                    <div
                      className={cn(
                        'flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-primary ring-1 ring-border/70',
                        step.accent,
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-4 text-xl font-semibold tracking-tight">{step.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                      {step.description}
                    </p>
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
              headingFontClassName={headingFontClassName}
            />
          </SectionReveal>

          <div className="mt-10 grid gap-5 lg:grid-cols-[1.12fr_0.88fr]">
            <SectionReveal>
              <div className="landing-panel relative overflow-hidden p-6">
                <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-info/15 to-transparent" />
                <div className="relative z-10 flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.08em] text-info">
                      Live execution feed
                    </p>
                    <h3 className="mt-2 text-xl font-semibold">Production Pipeline 04</h3>
                  </div>
                  <p className="rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-medium text-success">
                    3 running
                  </p>
                </div>

                <div className="relative z-10 mt-6 space-y-3">
                  {executionFeed.map((event, index) => (
                    <motion.div
                      key={event.name}
                      className="rounded-xl border border-border/60 bg-background/60 p-4"
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
                        <p className="text-sm font-semibold text-foreground">{event.name}</p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusDot status={event.status} />
                          <span className="capitalize">{event.status}</span>
                        </div>
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">{event.detail}</p>
                      <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        {event.elapsed}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </div>
            </SectionReveal>

            <SectionReveal delay={0.1}>
              <div className="landing-panel p-6">
                <p className="text-xs uppercase tracking-[0.08em] text-primary">Activity pulse</p>
                <h3 className="mt-2 text-xl font-semibold">Workflow throughput overview</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  A concise control surface for execution velocity, success health, and queue
                  pressure.
                </p>

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
                          className="h-full rounded-full bg-gradient-to-r from-primary to-info"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-7 rounded-xl border border-border/60 bg-muted/45 p-4">
                  <p className="text-sm font-medium">Execution health</p>
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                      Mean completion time is stable below alert threshold.
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-success" />
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
            <div className="landing-panel relative overflow-hidden p-8 sm:p-10">
              <div className="absolute -left-24 top-0 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
              <div className="absolute -right-24 bottom-0 h-64 w-64 rounded-full bg-foreground/10 blur-3xl" />

              <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="label-uppercase text-primary">Ready to launch</p>
                  <h2
                    className={cn(
                      'mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl',
                      headingFontClassName,
                    )}
                  >
                    Turn workflow complexity into a clear and reliable automation system
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
                    Start with a workspace in minutes, build with visual confidence, and monitor
                    every production run from a single source of truth.
                  </p>
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
    return <span className="h-2.5 w-2.5 rounded-full bg-success" aria-hidden />;
  }

  if (status === 'running') {
    return (
      <span className="relative flex h-2.5 w-2.5" aria-hidden>
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-info opacity-80" />
        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-info" />
      </span>
    );
  }

  return <span className="h-2.5 w-2.5 rounded-full bg-warning" aria-hidden />;
}

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/70 px-2 py-2">
      <p className="text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}
