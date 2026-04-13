'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  UserRoundPlus,
  Workflow,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ThemeToggleButton } from '@/components/theme/theme-toggle-button';

interface AuthShellProps {
  children: React.ReactNode;
  headingFontClassName: string;
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

export function AuthShell({ children, headingFontClassName }: AuthShellProps) {
  const pathname = usePathname();
  const shouldReduceMotion = useReducedMotion();
  const isRegister = pathname.includes('/register');
  const scene = isRegister ? sceneByRoute.register : sceneByRoute.login;

  return (
    <div className="auth-shell relative min-h-screen overflow-hidden">
      <div className="auth-grid-overlay pointer-events-none absolute inset-0" />
      <div className="auth-noise-overlay pointer-events-none absolute inset-0 opacity-30" />
      <div className="auth-light-beam pointer-events-none absolute -left-24 top-0 h-full w-64" />
      <div className="auth-light-beam pointer-events-none absolute -right-24 top-0 h-full w-64 rotate-180" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="auth-topbar flex items-center justify-between gap-3 rounded-2xl px-4 py-3">
          <Link href="/" className="group inline-flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-info text-primary-foreground shadow-soft transition-transform duration-300 group-hover:scale-105">
              <Zap className="h-4 w-4" />
            </span>
            <span className={cn('text-base font-semibold tracking-tight', headingFontClassName)}>
              FlowForge
            </span>
          </Link>

          <div className="flex items-center gap-2 text-sm">
            <ThemeToggleButton />
            <Link
              href="/"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Home
            </Link>
            <Link
              href="/privacy"
              className="inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              Privacy & Cookies
            </Link>
            {isRegister ? (
              <Link
                href="/login"
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                Have an account?
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/70 px-2.5 py-1.5 text-foreground transition-all hover:border-primary/40 hover:text-primary"
              >
                New here?
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </header>

        <div className="grid flex-1 gap-5 py-5 lg:grid-cols-2 lg:gap-8 lg:py-8">
          <section className="hidden lg:block">
            <motion.div
              initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: shouldReduceMotion ? 0.05 : 0.65, ease: [0.16, 1, 0.3, 1] }}
              className="auth-scene-panel relative h-full overflow-hidden p-8"
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
                className="auth-orb auth-orb-primary"
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
                className="auth-orb auth-orb-info"
              />

              <div className="relative z-10">
                <p className="label-uppercase text-primary">{scene.eyebrow}</p>
                <h1
                  className={cn(
                    'mt-4 max-w-xl text-4xl font-semibold leading-tight tracking-tight',
                    headingFontClassName,
                  )}
                >
                  {scene.title}
                </h1>
                <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
                  {scene.description}
                </p>

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
                        className="rounded-xl border border-border/60 bg-card/65 p-3 backdrop-blur"
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">
                            {metric.label}
                          </p>
                          <Icon className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <p className="mt-2 text-sm font-semibold text-foreground">{metric.value}</p>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="mt-8 rounded-2xl border border-border/60 bg-background/60 p-4 backdrop-blur">
                  <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">
                    Live Run Snapshot
                  </p>
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
                        className="flex items-center justify-between rounded-lg border border-border/50 bg-card/70 px-3 py-2"
                      >
                        <p className="text-sm text-foreground">{step.label}</p>
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
  if (status === 'running') return 'bg-info';
  if (status === 'synced') return 'bg-success';
  return 'bg-warning';
}
