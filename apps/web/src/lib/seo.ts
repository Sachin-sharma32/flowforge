import type { Metadata } from 'next';

export const siteConfig = {
  name: 'FlowForge',
  title: 'FlowForge | Visual Workflow Automation',
  description:
    'Design, automate, and monitor resilient workflows with a visual builder, real-time execution insights, and team-ready controls.',
  url: (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/+$/, ''),
  locale: 'en_US',
  ogImagePath: '/og/flowforge-og.svg',
  keywords: [
    'workflow automation',
    'visual workflow builder',
    'event-driven automation',
    'no-code automation',
    'execution monitoring',
    'workflow orchestration',
    'FlowForge',
  ],
} as const;

function normalizePath(path: string): string {
  if (!path) return '/';
  if (path === '/') return '/';
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+$/, '');
}

export function absoluteUrl(path: string = '/'): string {
  const normalized = normalizePath(path);
  return new URL(normalized, `${siteConfig.url}/`).toString();
}

interface PageMetadataOptions {
  title: string;
  description: string;
  path: string;
  noIndex?: boolean;
}

export function buildPageMetadata(options: PageMetadataOptions): Metadata {
  const canonical = normalizePath(options.path);
  const imagePath = siteConfig.ogImagePath;

  return {
    title: options.title,
    description: options.description,
    alternates: {
      canonical,
    },
    robots: options.noIndex
      ? {
          index: false,
          follow: false,
          nocache: true,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            noarchive: true,
          },
        }
      : {
          index: true,
          follow: true,
        },
    openGraph: {
      type: 'website',
      title: options.title,
      description: options.description,
      url: canonical,
      siteName: siteConfig.name,
      locale: siteConfig.locale,
      images: [
        {
          url: imagePath,
          width: 1200,
          height: 630,
          alt: `${siteConfig.name} preview`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: options.title,
      description: options.description,
      images: [imagePath],
    },
  };
}
