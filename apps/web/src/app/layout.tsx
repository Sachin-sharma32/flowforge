import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from '@/components/layout/providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'FlowForge - Visual Workflow Automation',
  description: 'Build, automate, and monitor event-driven workflows with a visual drag-and-drop builder.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
