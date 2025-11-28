import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const containerSizes = {
  sm: 'max-w-2xl',      // 672px - Forms, dialogs
  md: 'max-w-4xl',      // 896px - Content pages
  lg: 'max-w-6xl',      // 1152px - Dashboards
  full: 'max-w-full',   // Full width
};

export function Container({ children, size = 'lg', className }: ContainerProps) {
  return (
    <div className={cn(
      'mx-auto w-full px-4 sm:px-6 lg:px-8',
      containerSizes[size],
      className
    )}>
      {children}
    </div>
  );
}
