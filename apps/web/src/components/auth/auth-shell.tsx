'use client';

import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import { Activity, ShieldCheck, Sparkles, UserRoundPlus, Workflow, Zap } from 'lucide-react';
import { PublicNavbar } from '@/components/layout/public-navbar';
import { TypographyH1, TypographySmall, TypographyMuted } from '@/components/ui/typography';
import { cn } from '@/lib/utils';

interface AuthShellProps {
  children: React.ReactNode;
}

const sceneByRoute = {
  login: {
    eyebrow: 'Welcome Back',
    title: 'Return to your automation command center',
    description:
      'Jump back into live executions, workflow edits, and team operations with secure session access.',
    metrics: [
      { label: 'Queue Health', value: '98.7%', icon: Activity },
      { label: 'Runtime Guardrails', value: 'RBAC', icon: ShieldCheck },
      { label: 'Active Pipelines', value: '24', icon: Workflow },
    ],
    chip: 'Returning Team',
  },
  register: {
    eyebrow: 'New Workspace',
    title: 'Launch your first production-grade flow in minutes',
    description:
      'Create a workspace, invite collaborators, and ship reliable automations with built-in observability.',
    metrics: [
      { label: 'Setup Speed', value: '5 min', icon: Zap },
      { label: 'Collaboration', value: 'Multi-tenant', icon: UserRoundPlus },
      { label: 'Live Visibility', value: 'Realtime', icon: Sparkles },
    ],
    chip: 'Workspace Onboarding',
  },
} as const;

const runtimeSteps = [
  { label: 'Webhook Trigger', status: 'synced' },
  { label: 'Condition Branch', status: 'running' },
  { label: 'Slack Notification', status: 'queued' },
] as const;

export function AuthShell({ children }: AuthShellProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isRegister = pathname.includes('/register');
  const scene = isRegister ? sceneByRoute.register : sceneByRoute.login;

  return (
    <div className="bg-background relative min-h-screen overflow-hidden">
      <div className="hidden pointer-events-none absolute inset-0" />
      <div className="hidden pointer-events-none absolute inset-0 opacity-30" />
      <div className="hidden pointer-events-none absolute -left-24 top-0 h-full w-64" />
      <div className="hidden pointer-events-none absolute -right-24 top-0 h-full w-64 rotate-180" />

      <div className="relative z-10">
        <PublicNavbar />

        <div className="mx-auto grid min-h-[calc(100vh-4rem)] w-full max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:px-8 lg:py-8">
          <section className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="rounded-lg border border-border bg-card shadow-sm relative h-full overflow-hidden p-8"
            >
              <motion.div
                aria-hidden
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [0, -10, 0],
                        x: [0, 6, 0],
                      }
                }
                transition={{
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  duration: 12,
                  ease: 'easeInOut',
                }}
                className="hidden"
              />
              <motion.div
                aria-hidden
                animate={
                  shouldReduceMotion
                    ? undefined
                    : {
                        y: [0, 12, 0],
                        x: [0, -8, 0],
                      }
                }
                transition={{
                  repeat: shouldReduceMotion ? 0 : Infinity,
                  duration: 14,
                  ease: 'easeInOut',
                }}
                className="hidden"
              />

              <div className="relative z-10">
                <TypographySmall className="text-[0.6875rem] font-semibold uppercase tracking-normal text-primary">
                  {scene.eyebrow}
                </TypographySmall>
                <TypographyH1 className="mt-4 max-w-xl font-semibold leading-tight">
                  {scene.title}
                </TypographyH1>
                <TypographyMuted className="mt-4 max-w-lg leading-relaxed">
                  {scene.description}
                </TypographyMuted>

                <div className="mt-7 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  {scene.chip}
                </div>

                <div className="mt-8 grid gap-3 sm:grid-cols-3">
                  {scene.metrics.map((metric, index) => {
                    const Icon = metric.icon;
                    return (
                      <motion.div
                        key={metric.label}
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 14 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{
                          duration: shouldReduceMotion ? 0.05 : 0.45,
                          delay: 0.18 + index * 0.09,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="rounded-xl border border-border bg-card p-3"
                      >
                        <div className="flex items-center justify-between">
                          <TypographySmall className="text-[11px] uppercase tracking-normal text-muted-foreground">
                            {metric.label}
                          </TypographySmall>
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <TypographySmall className="mt-2 text-sm font-semibold text-foreground">
                          {metric.value}
                        </TypographySmall>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-lg border border-border bg-background p-4">
                  <TypographySmall className="text-xs uppercase tracking-normal text-muted-foreground">
                    Live Run Snapshot
                  </TypographySmall>
                  <div className="mt-3 space-y-2">
                    {runtimeSteps.map((step, index) => (
                      <motion.div
                        key={step.label}
                        animate={
                          shouldReduceMotion
                            ? undefined
                            : {
                                y: [0, -1, 0],
                              }
                        }
                        transition={{
                          repeat: shouldReduceMotion ? 0 : Infinity,
                          duration: 3,
                          delay: index * 0.25,
                          ease: 'easeInOut',
                        }}
                        className="flex items-center justify-between rounded-lg border border-border bg-card px-3 py-2"
                      >
                        <TypographySmall className="text-sm text-foreground">
                          {step.label}
                        </TypographySmall>
                        <div className="inline-flex items-center gap-2 text-xs capitalize text-muted-foreground">
                          <span
                            className={cn('h-2 w-2 rounded-full', statusDotClass(step.status))}
                          />
                          {step.status}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </section>

          <section className="flex items-center justify-center px-1 py-2 sm:px-2 lg:px-8">
            <motion.div
              initial={{ opacity: 0, x: shouldReduceMotion ? 0 : 24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="w-full max-w-md"
            >
              {children}
            </motion.div>
          </section>
        </div>
      </div>
    </div>
  );
}

function statusDotClass(status: string) {
  if (status === 'running') return 'bg-primary';
  if (status === 'synced') return 'bg-primary';
  return 'bg-muted-foreground';
}
