import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prisma Glow',
  description: 'AI-powered operations suite',
  manifest: '/manifest.json',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.netlify.app'
  ),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prisma Glow',
  },
  openGraph: {
    title: 'Prisma Glow',
    description: 'AI-powered operations suite',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://prisma-glow.netlify.app',
    siteName: 'Prisma Glow',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Prisma Glow',
    description: 'AI-powered operations suite',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#7C3AED',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
