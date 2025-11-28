import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface StackProps {
  children: ReactNode;
  direction?: 'vertical' | 'horizontal';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around';
  className?: string;
}

const gapSizes = {
  none: 'gap-0',
  xs: 'gap-1',
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
  xl: 'gap-8',
};

const alignments = {
  start: 'items-start',
  center: 'items-center',
  end: 'items-end',
  stretch: 'items-stretch',
};

const justifications = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
  between: 'justify-between',
  around: 'justify-around',
};

export function Stack({ 
  children, 
  direction = 'vertical', 
  gap = 'md',
  align = 'stretch',
  justify = 'start',
  className 
}: StackProps) {
  return (
    <div className={cn(
      'flex',
      direction === 'vertical' ? 'flex-col' : 'flex-row',
      gapSizes[gap],
      alignments[align],
      justifications[justify],
      className
    )}>
      {children}
    </div>
  );
}
