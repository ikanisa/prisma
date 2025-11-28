/**
 * Container - Fluid, responsive container component
 * Phase 4-5: Minimalist layout system
 */

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ContainerProps {
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  as?: 'div' | 'section' | 'main' | 'article';
}

const sizeClasses = {
  sm: 'max-w-2xl',   // 672px
  md: 'max-w-4xl',   // 896px
  lg: 'max-w-6xl',   // 1152px
  xl: 'max-w-7xl',   // 1280px
  full: 'max-w-full',
};

export function Container({ 
  children, 
  size = 'lg', 
  className,
  as: Component = 'div',
}: ContainerProps) {
  return (
    <Component
      className={cn(
        'mx-auto w-full px-4 sm:px-6 lg:px-8',
        sizeClasses[size],
        className
      )}
    >
      {children}
    </Component>
  );
}
