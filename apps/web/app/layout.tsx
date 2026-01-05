import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import { Toaster } from '@/components/ui/toaster';
import { TitleBar } from './components/desktop/TitleBar';
import { SyncStatusBar } from './components/desktop/SyncManager';
import { MenuEventsProvider } from './components/desktop/MenuEventsProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prisma Glow',
  description: 'AI-powered audit, tax, and accounting operations platform',
  manifest: '/manifest.json',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev'
  ),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prisma Glow',
  },
  openGraph: {
    title: 'Prisma Glow',
    description: 'AI-powered audit, tax, and accounting operations platform',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.pages.dev',
    siteName: 'Prisma Glow',
    type: 'website',
    images: [
      {
        url: '/icons/icon-512.png',
        width: 512,
        height: 512,
        alt: 'Prisma Glow',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prisma Glow',
    description: 'AI-powered audit, tax, and accounting operations platform',
    images: ['/icons/icon-512.png'],
  },
  // OpenAI Apps SDK metadata
  other: {
    'openai-app': 'true',
    'openai-app-name': 'Prisma Glow',
    'openai-app-config': '/.well-known/openai-app-config.json',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#4A90E2',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body
        className="min-h-screen bg-background font-sans text-foreground antialiased"
      >
        <Providers>
          <MenuEventsProvider>
            <TitleBar />
            <SyncStatusBar />
            {children}
            <Toaster />
          </MenuEventsProvider>
        </Providers>
      </body>
    </html>
  );
}
