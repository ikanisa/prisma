/* eslint-disable react-refresh/only-export-components */
import { Loader2 } from 'lucide-react';
import { Suspense, type ReactNode } from 'react';

export function RouteSuspenseFallback() {
  return (
    <div className="flex min-h-[200px] items-center justify-center text-muted-foreground">
      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
    </div>
  );
}

export function renderWithRouteSuspense(node: ReactNode) {
  return <Suspense fallback={<RouteSuspenseFallback />}>{node}</Suspense>;
}
