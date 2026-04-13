import { Sora } from 'next/font/google';
import { LandingPageExperience } from '@/components/marketing/landing-page';
import { buildPageMetadata } from '@/lib/seo';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

export const metadata = buildPageMetadata({
  title: 'FlowForge | Visual Workflow Automation',
  description:
    'Build event-driven automations with a visual workflow builder, rich execution insights, and collaboration-ready controls.',
  path: '/',
});

export default function LandingPage() {
  return <LandingPageExperience headingFontClassName={sora.className} />;
}
