import './globals.css';
import { Providers } from '@/components/providers';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Web App',
  description: 'Business dashboard'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen bg-white">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
