import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { cn } from './utils/cn';

export type SkeletonProps = HTMLAttributes<HTMLDivElement> & {
  radius?: 'xs' | 'sm' | 'md' | 'lg' | 'full';
};

export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, radius = 'md', ...props },
  ref,
) {
  const radiusClass = {
    xs: 'rounded-[var(--radius-xs)]',
    sm: 'rounded-[var(--radius-sm)]',
    md: 'rounded-[var(--radius-md)]',
    lg: 'rounded-[var(--radius-lg)]',
    full: 'rounded-full',
  }[radius];

  return (
    <div
      ref={ref}
      className={cn('animate-pulse bg-neutral-100 dark:bg-neutral-800', radiusClass, className)}
      {...props}
    />
  );
});
