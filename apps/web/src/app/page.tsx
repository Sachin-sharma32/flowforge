import { Sora } from 'next/font/google';
import { LandingPageExperience } from '@/components/marketing/landing-page';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
});

export default function LandingPage() {
  return <LandingPageExperience headingFontClassName={sora.className} />;
}
