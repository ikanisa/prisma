'use client';

import { useDesktopMenuEvents } from './MenuEvents';

export function MenuEventsProvider({ children }: { children: React.ReactNode }) {
  useDesktopMenuEvents();
  return <>{children}</>;
}
