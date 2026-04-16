import { LandingPageExperience } from '@/components/marketing/landing-page';
import { buildPageMetadata } from '@/lib/seo';

export const metadata = buildPageMetadata({
  title: 'FlowForge | Visual Workflow Automation',
  description:
    'Build event-driven automations with a visual workflow builder, rich execution insights, and collaboration-ready controls.',
  path: '/',
});

export default function LandingPage() {
  return <LandingPageExperience />;
}
