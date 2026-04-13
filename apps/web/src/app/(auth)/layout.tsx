import { Sora } from 'next/font/google';
import { AuthShell } from '@/components/auth/auth-shell';

const sora = Sora({
  subsets: ['latin'],
  weight: ['600', '700'],
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell headingFontClassName={sora.className}>{children}</AuthShell>;
}
