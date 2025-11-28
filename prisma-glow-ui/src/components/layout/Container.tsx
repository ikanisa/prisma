import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
  className?: string;
}

const sizeMap = {
  sm: 'max-w-3xl',   // 768px
  md: 'max-w-5xl',   // 1024px
  lg: 'max-w-7xl',   // 1280px
  full: 'max-w-full',
};

export function Container({ children, size = 'lg', className }: ContainerProps) {
  return (
    <div
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeMap[size],
        className
      )}
    >
      {children}
    </div>
  );
}
