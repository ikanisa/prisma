import { ReactNode } from 'react';
import { useResponsive } from '@/hooks/useResponsive';
import { SimplifiedSidebar } from './SimplifiedSidebar';
import { MobileNav } from './MobileNav';
import { Header } from './Header';
import { SkipLinks } from '../a11y/SkipLinks';

interface AdaptiveLayoutProps {
  children: ReactNode;
}

export function AdaptiveLayout({ children }: AdaptiveLayoutProps) {
  const { isMobile, isTablet } = useResponsive();

  return (
    <div className="min-h-screen bg-background">
      <SkipLinks />
      
      {/* Desktop: Sidebar + Content */}
      {!isMobile && !isTablet && (
        <div className="flex h-screen">
          <SimplifiedSidebar />
          <main id="main-content" className="flex-1 overflow-y-auto">
            <Header />
            <div className="p-6 lg:p-8">{children}</div>
          </main>
        </div>
      )}

      {/* Tablet: Collapsible Sidebar */}
      {isTablet && (
        <div className="flex h-screen">
          <SimplifiedSidebar collapsed />
          <main id="main-content" className="flex-1 overflow-y-auto">
            <Header />
            <div className="p-4 md:p-6">{children}</div>
          </main>
        </div>
      )}

      {/* Mobile: Bottom Navigation */}
      {isMobile && (
        <div className="flex min-h-screen flex-col pb-16">
          <Header showMobileMenu />
          <main id="main-content" className="flex-1 p-4">
            {children}
          </main>
          <MobileNav />
        </div>
      )}
    </div>
  );
}
