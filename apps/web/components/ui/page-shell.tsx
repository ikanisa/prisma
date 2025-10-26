import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageShell({ children, className, contentClassName }: PageShellProps) {
  return (
    <main className="relative min-h-screen bg-background">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-glow opacity-30 blur-3xl"
      />
      <div className="relative mx-auto w-full max-w-7xl px-6 py-10">
        <div
          className={cn(
            'overflow-hidden rounded-3xl border border-border/60 bg-card/95 shadow-lg shadow-brand-500/10 backdrop-blur',
            'supports-[backdrop-filter]:bg-card/80',
            className,
          )}
        >
          <div className={cn('space-y-8 p-8', contentClassName)}>{children}</div>
        </div>
      </div>
    </main>
  );
}
