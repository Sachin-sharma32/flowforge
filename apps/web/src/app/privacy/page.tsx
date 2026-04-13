import { Sora } from 'next/font/google';
import Link from 'next/link';
import { buildPageMetadata } from '@/lib/seo';
import { cn } from '@/lib/utils';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

export const metadata = buildPageMetadata({
  title: 'Privacy & Cookies | FlowForge',
  description:
    'Review FlowForge cookie usage, data handling posture, and our essential-only baseline for browser storage.',
  path: '/privacy',
});

const cookieRows = [
  {
    name: 'ff_refresh',
    purpose: 'Maintains authenticated sessions through refresh-token rotation.',
    lifetime: 'Refresh session window (default: 7 days).',
    classification: 'Strictly necessary',
    scope: '/api/v1/auth',
  },
  {
    name: 'ff_csrf',
    purpose: 'Protects auth endpoints by validating CSRF tokens on sensitive requests.',
    lifetime: 'Refresh session window (default: 7 days).',
    classification: 'Strictly necessary',
    scope: '/',
  },
] as const;

export default function PrivacyPage() {
  return (
    <main className="landing-shell min-h-screen">
      <div className="landing-grid-overlay pointer-events-none absolute inset-0" />
      <div className="landing-noise-overlay pointer-events-none absolute inset-0 opacity-30" />

      <div className="relative z-10 mx-auto max-w-5xl px-6 pb-16 pt-16 sm:pt-20">
        <div className="landing-panel p-8 sm:p-10">
          <p className="label-uppercase text-primary">Privacy & Cookies</p>
          <h1
            className={cn('mt-3 text-4xl font-semibold tracking-tight sm:text-5xl', sora.className)}
          >
            Essential-only cookie baseline
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            FlowForge currently uses only authentication and security cookies required for sign-in,
            session continuity, and CSRF protection. We do not currently deploy analytics,
            advertising, or cross-site tracking cookies.
          </p>

          <div className="mt-8 rounded-2xl border border-border/70 bg-card/65 p-5">
            <h2 className={cn('text-xl font-semibold tracking-tight', sora.className)}>
              Cookie inventory
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Cookie names are shown with current defaults and may be overridden by server
              configuration.
            </p>

            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-muted-foreground">
                    <th className="px-3 py-2 font-medium">Cookie</th>
                    <th className="px-3 py-2 font-medium">Purpose</th>
                    <th className="px-3 py-2 font-medium">Lifetime</th>
                    <th className="px-3 py-2 font-medium">Classification</th>
                    <th className="px-3 py-2 font-medium">Scope</th>
                  </tr>
                </thead>
                <tbody>
                  {cookieRows.map((cookie) => (
                    <tr key={cookie.name} className="border-b border-border/50 align-top">
                      <td className="px-3 py-3 font-mono text-xs sm:text-sm">{cookie.name}</td>
                      <td className="px-3 py-3 text-muted-foreground">{cookie.purpose}</td>
                      <td className="px-3 py-3 text-muted-foreground">{cookie.lifetime}</td>
                      <td className="px-3 py-3">{cookie.classification}</td>
                      <td className="px-3 py-3 font-mono text-xs sm:text-sm">{cookie.scope}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-border/70 bg-muted/35 p-5">
            <h2 className={cn('text-xl font-semibold tracking-tight', sora.className)}>
              Non-essential tracking status
            </h2>
            <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
              <li>No analytics SDK cookies are currently used.</li>
              <li>No advertising or remarketing pixels are currently used.</li>
              <li>No A/B testing or behavioral tracking cookies are currently used.</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              If non-essential tracking is introduced in the future, FlowForge will add
              category-based consent controls before release.
            </p>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-4 text-sm">
            <Link
              href="/"
              className="font-medium text-primary transition-colors hover:text-primary/80 hover:underline"
            >
              Back to home
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground hover:underline"
            >
              Sign in
            </Link>
            <span className="text-muted-foreground">Last updated: April 13, 2026</span>
          </div>
        </div>
      </div>
    </main>
  );
}
