import type { Metadata, Viewport } from 'next';
import { Spline_Sans } from 'next/font/google';
import Script from 'next/script';
import { RouteProgressBar } from '@/components/layout/route-progress-bar';
import { DevClickToComponent } from '@/components/layout/click-to-component';
import { Providers } from '@/components/layout/providers';
import { siteConfig } from '@/lib/seo';
import { themeInitScript } from '@/lib/theme';
import './globals.css';

const splineSans = Spline_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
  variable: '--font-spline-sans',
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: '%s | FlowForge',
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  alternates: {
    canonical: '/',
  },
  referrer: 'origin-when-cross-origin',
  category: 'technology',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [{ url: '/icon.svg', type: 'image/svg+xml' }],
    shortcut: ['/icon.svg'],
    apple: [{ url: '/icon.svg' }],
  },
  openGraph: {
    type: 'website',
    locale: siteConfig.locale,
    url: '/',
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    images: [
      {
        url: siteConfig.ogImagePath,
        width: 1200,
        height: 630,
        alt: `${siteConfig.name} preview`,
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: siteConfig.title,
    description: siteConfig.description,
    images: [siteConfig.ogImagePath],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#131313' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={splineSans.variable}>
      <body className="font-sans">
        <Script id="theme-init" strategy="beforeInteractive">
          {themeInitScript}
        </Script>
        <RouteProgressBar />
        <DevClickToComponent />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
