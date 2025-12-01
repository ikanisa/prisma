'use client';

import { useState, type ReactNode } from 'react';
import { Sidebar } from './sidebar';
import { Header } from './header';
import { MobileSidebar } from './mobile-sidebar';

interface AppShellProps {
  children: ReactNode;
  title?: string;
}

export function AppShell({ children, title }: AppShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <MobileSidebar
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      <main className="flex flex-1 flex-col">
        <Header
          title={title}
          onMenuClick={() => setIsMobileMenuOpen(true)}
        />
        <div className="flex-1 p-6">{children}</div>
      </main>
    </div>
  );
}
