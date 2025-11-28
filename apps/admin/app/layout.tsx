import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Prisma Glow Admin',
  description: 'Admin console for Prisma Glow',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
