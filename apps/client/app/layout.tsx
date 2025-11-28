import type { Metadata, Viewport } from 'next';
import { Providers } from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prisma Glow',
  description: 'AI-powered operations suite',
  manifest: '/manifest.json',
  metadataBase: new URL('https://prisma-glow.netlify.app'),
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Prisma Glow',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
