'use client';

import { Fragment } from 'react';
import { cn } from '@lib/utils';

interface LoadingStackProps {
  rows?: number;
  className?: string;
}

export function LoadingStack({ rows = 3, className }: LoadingStackProps) {
  return (
    <div className={cn('flex flex-col gap-3', className)} role="status" aria-live="polite">
      {Array.from({ length: rows }).map((_, index) => (
        <Fragment key={index}>
          <div className="h-4 w-full animate-pulse rounded-md bg-muted" />
        </Fragment>
      ))}
      <span className="sr-only">Loading</span>
    </div>
  );
}
