'use client';

import { useEffect, useState } from 'react';

const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

export default function DesktopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    setIsDesktop(isTauri);
    
    if (isTauri) {
      document.body.classList.add('desktop-app');
    }
  }, []);

  if (!isDesktop && typeof window !== 'undefined') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Desktop App Only</h1>
          <p className="text-muted-foreground">
            This page is only available in the desktop app.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
